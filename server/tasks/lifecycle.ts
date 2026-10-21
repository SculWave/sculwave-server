import { Server } from 'socket.io'
import { Server as HttpServer } from 'http'
import { roomParticipants } from '../state/participants'

import { destroyLiveKitRoom, purgeHangingLiveKitRooms } from '../services/livekit/rooms'

import { kickLiveKitParticipant, refreshParticipantCache } from '../services/livekit/participants'

import { deleteRoom, getAllRooms } from '../managers/roomManger'

import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../types/socket'

import { removeBackend } from '../managers/backendManager'
import { getPlayerSocketId } from '../managers/socketManager'
import { markBackendOffline } from '../services/backendSyncService'
import { pubsub, redis } from '../services/redis'
import { playerBackendStore } from '../services/playerBackend/PlayerbackendStore'
import { pendingLogoutStore } from '../services/pendingLogoutRedis/pendingLogoutStore'
import { leaderElection } from '../services/leader/LeaderElection'
import { RedisClientType, RedisDefaultModules } from 'redis'
import { error, info, log } from '../utils/logger'
import { roomIndexStore } from '../services/roomIndexRedis/RoomIndexStore'
import { playerSessionStore } from '../services/playerSessionRedis/PlayerSessionStor'
import { speakingMonitor } from '../services/livekit/SpeakingMonitor'
import { TELEMETRY_ENABLED } from '../config/mode'

export function startLifecycleWorkers(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
) {
  let roomCleanupRunning = false
  let participantRefreshRunning = false
  let pendingLogoutRunning = false
  let liveKitCleanupDone = false

  // Room expiration + holding queue cleanup
  setInterval(async () => {
    if (!leaderElection.isLeader()) {
      return
    }

    if (roomCleanupRunning) {
      return
    }

    roomCleanupRunning = true

    try {
      const now = Date.now()

      for (const room of getAllRooms()) {
        const code = room.roomCode

        const location = roomIndexStore.get(code)

        if (!location) {
          continue
        }

        const { backendId, instanceId } = location

        // Room expired
        if (now - room.lastSeen > 15000) {
          io.to(code).emit('room-expired')

          await new Promise((resolve) => setTimeout(resolve, 1000))
          await speakingMonitor.stop(room.roomCode)
          await destroyLiveKitRoom(code)

          const sockets = await io.in(code).fetchSockets()

          for (const socket of sockets) {
            socket.disconnect(true)
          }
          for (const [gamertag, location] of playerBackendStore.entries()) {
            if (location.instanceId === instanceId && location.backendId === backendId) {
              await pendingLogoutStore.set(gamertag.toLowerCase(), {
                instanceId,
                backendId: backendId,
                roomCode: code,
                expiresAt: Date.now() + 5000,
              })
            }
          }

          await deleteRoom(code)
          await removeBackend(backendId, instanceId)
          await markBackendOffline(backendId)

          roomParticipants.delete(code)

          info('Server', 'Session %s expired because Minecraft server went offline.', code)

          continue
        }

        // Holding queue timeout
        const sockets = await io.in(code).fetchSockets()

        for (const socket of sockets) {
          const gamertag = socket.data.gamertag

          if (!gamertag) {
            continue
          }

          const session = playerSessionStore.get(socket.data.gamertag!.toLowerCase())

          if (session && !session.hasVoiceToken && session.holdStartedAt) {
            const holdDuration = now - session.holdStartedAt

            if (holdDuration > 15 * 60 * 1000) {
              info(
                'QueueExpiry',
                'Disconnecting %s - exceeded 15-minute hold limit.',
                socket.data.gamertag,
              )
              socket.emit('voice-join-rejected', {
                code: 'TIMEOUT',
                reason:
                  'Holding period expired! Please log into Minecraft before attempting to join again.',
              })

              const pending = await pendingLogoutStore.get(gamertag)
              if (!pending) {
                continue
              }
              await playerSessionStore.delete(gamertag.toLowerCase())
              socket.disconnect(true)
            }
          }
        }
      }
    } finally {
      roomCleanupRunning = false
    }
  }, 30000)

  // Refresh LiveKit participant cache
  setInterval(async () => {
    if (!leaderElection.isLeader()) {
      return
    }

    if (participantRefreshRunning) {
      return
    }

    participantRefreshRunning = true

    try {
      for (const room of getAllRooms()) {
        await refreshParticipantCache(room.roomCode)
      }
    } finally {
      participantRefreshRunning = false
    }
  }, 10000)

  setInterval(async () => {
    if (!leaderElection.isLeader()) {
      return
    }

    if (pendingLogoutRunning) {
      return
    }

    pendingLogoutRunning = true

    try {
      const now = Date.now()

      for (const [gamertag] of pendingLogoutStore.entries()) {
        const pending = await pendingLogoutStore.get(gamertag)

        info(
          'PlayerLogout',
          '%s pending=%o now=%d expiresAt=%d',
          gamertag,
          pending,
          now,
          pending?.expiresAt ?? 0,
        )


        if (!pending) {
          continue
        }

        if (pending.expiresAt > now) {
          continue
        }

        const current = playerBackendStore.get(gamertag)

        // Player appeared on another backend
        if (
          current &&
          (current.instanceId !== pending.instanceId || current.backendId !== pending.backendId)
        ) {
          await pendingLogoutStore.delete(gamertag)
          continue
        }

        // Still gone after grace period


        let socket = undefined
        const socketId = getPlayerSocketId(gamertag)

        log(
          'PlayerLogout',
          '%s socketId=%s',
          gamertag,
          socketId ?? 'NOT_FOUND',
        )

        if (socketId) {
          socket = io.sockets.sockets.get(socketId)

        }


        if (!socket) {
          const sockets = await io.in(pending.roomCode).fetchSockets()

          socket = sockets.find(
            (s) =>
              s.data.gamertag?.toLowerCase() === gamertag.toLowerCase(),
          )
        }

        if (socket) {
          const session = playerSessionStore.get(gamertag)

          log(
            'PlayerLogout',
            '%s session=%o',
            gamertag,
            session,
          )

          log(
            'PlayerLogout',
            '%s localSocket=%s fallbackSocket=%s',
            gamertag,
            socketId ?? 'NOT_FOUND',
            socket?.id ?? 'NOT_FOUND',
          )


          if (session) {
            session.hasVoiceToken = false
            session.holdStartedAt = Date.now()

            await playerSessionStore.set(gamertag, session)
          }

          socket.emit('voice-join-holding', {
            message: 'Disconnected from server. Holding position for 15 minutes...',
            expiresAt: Date.now() + 15 * 60 * 1000,
          })
        }


        io.to(pending.roomCode).emit('player-left-voice', {
          gamertag,
        })

        await kickLiveKitParticipant(pending.roomCode, gamertag)

        await refreshParticipantCache(pending.roomCode)

        await playerBackendStore.delete(gamertag)
        await pendingLogoutStore.delete(gamertag)

        info('PlayerLogout', '%s fully disconnected.', gamertag)
      }
    } finally {
      pendingLogoutRunning = false
    }
  }, 1000)

  setInterval(async () => {
    if (liveKitCleanupDone || !leaderElection.isLeader()) {
      return
    }

    liveKitCleanupDone = true

    try {
      info('LiveKitBoot', 'Leader performing stale room cleanup...')
      await purgeHangingLiveKitRooms()
      info('LiveKitBoot', 'Stale room cleanup complete.')
    } catch (err) {
      liveKitCleanupDone = false
      error('LiveKitBoot', '%o', err)
    }
  }, 1000)



}

export function registerShutdownHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  httpServer: HttpServer,
  socketAdapter: {
    pubClient: RedisClientType<{}, {}, {}, 3, {}>
    subClient: RedisClientType<RedisDefaultModules, {}, {}, 3, {}>
  },
) {
  const shutdown = async (signal: string) => {
    info('Shutdown', '%s received', signal)

    try {
      for (const room of getAllRooms()) {
        io.to(room.roomCode).emit('room-expired')
        await speakingMonitor.stop(room.roomCode)
        await destroyLiveKitRoom(room.roomCode)

      }
      await Promise.all([
        leaderElection.shutdown(),
        socketAdapter.pubClient.quit(),
        socketAdapter.subClient.quit(),
        pubsub.disconnect(),
        redis.quit(),
      ])

    } finally {
      httpServer.close(() => {
        process.exit(0)
      })
    }
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

export async function initializeServer() {

}
