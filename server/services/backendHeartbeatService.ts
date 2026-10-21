import { Server, Socket } from 'socket.io'

import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../types/socket'

import type { RoomData } from '../types/room'
import type { Player } from '../types/player'
import { LIVEKIT_PUB_URL } from '../config/env'
import {
  sanitizePlayers,
  buildOnlineGamertags,
  detectLoggedOutPlayers,
  buildPlayerMap,
} from '../managers/playerManager'
import {
  calculateHearablePlayers,
  buildDesiredSubscriptions,
  applySubscriptionUpdate,
} from '../managers/positionManager'
import { updateRoomPlayers } from '../managers/roomManger'
import { kickLiveKitParticipant, refreshParticipantCache } from './livekit/participants'
import { generateLiveKitToken } from './tokenService'
import { prisma } from '../database/prisma'
import { playerBackendStore } from './playerBackend/PlayerbackendStore'
import { pendingLogoutStore } from './pendingLogoutRedis/pendingLogoutStore'
import { error, info, log } from '../utils/logger'
import { playerEventStore } from './playerEventRedis/PlayerEventStore'
import { playerSessionStore } from './playerSessionRedis/PlayerSessionStor'

export async function processBackendHeartbeat(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  room: RoomData,
  players: Player[],
  backendId: string,
  instanceId: string,
  timestamp: number,
  voiceEnabled: boolean,
) {
  log(
    'Heartbeat',
    'HOST=%s room=%s players=%d',
    process.env.HOSTNAME,
    room.roomCode,
    room.players.length,
  )

  const mergedPlayers = sanitizePlayers(players, room.players)
  await prisma.backend.updateMany({
    where: {
      backendId,
    },

    data: {
      players: mergedPlayers.length,

      lastSeen: new Date(),
    },
  })

  const onlineGamertags = buildOnlineGamertags(mergedPlayers)
  const code = room.roomCode


  for (const player of mergedPlayers) {
    const key = player.gamertag.toLowerCase()
    await pendingLogoutStore.delete(key)

    const heartbeatTime = timestamp
    const previous = playerBackendStore.get(key)

    if (previous && previous.lastSeen > timestamp) {
      continue
    }
    playerBackendStore.set(key, {
      instanceId,
      backendId,
      roomCode: room.roomCode,
      lastSeen: heartbeatTime,
    })

    // Detect backend switch
    if (previous && previous.instanceId === instanceId && previous.backendId !== backendId) {
      // Still waiting in queue, nothing to switch
      const session = playerSessionStore.get(key)

      if (!session) {
        continue
      }

      session.isSwitchingBackend = true


      await playerSessionStore.set(key, session)

      try {

        await kickLiveKitParticipant(previous.roomCode, player.gamertag)

        const token = await generateLiveKitToken(room.roomCode, player.gamertag)

        await playerEventStore.publish({
          type: 'VOICE_ROOM_SWITCH',
          gamertag: player.gamertag,
          previousRoomCode: previous.roomCode,
          roomCode: room.roomCode,
          token: token,
          url: LIVEKIT_PUB_URL,
        })




        setTimeout(async () => {
          await refreshParticipantCache(room.roomCode)
        }, 3000)

        info('BackendSwitch', '%s: %s -> %s', player.gamertag, previous.backendId, backendId)
      }
      catch (err) {

        error(
          'BackendSwitch',
          'Failed backend switch for %s: %o',
          player.gamertag,
          err,
        )
      }


      finally {
        const session = playerSessionStore.get(key)

        if (!session) {
          continue
        }

        session.isSwitchingBackend = false

        await playerSessionStore.set(key, session)

        
      }
    }
  }

  // 🛠️ REPLACE WITH THIS: Ensure clean case-insensitive tracking subtraction
  const disconnectedPlayers = detectLoggedOutPlayers(room.players, mergedPlayers)


  for (const player of disconnectedPlayers) {
    const key = player.gamertag.toLowerCase()

    info(
      'MinecraftLogout',
      '%s disappeared from Minecraft. Starting 3 second timer.',
      player.gamertag,
    )

    await pendingLogoutStore.set(key, {
      instanceId,
      backendId,
      roomCode: code,
      expiresAt: Date.now() + 3_000,
    })


  }

  updateRoomPlayers(code, mergedPlayers)



  const hearMatrix = calculateHearablePlayers(mergedPlayers)

  const updates = buildDesiredSubscriptions(code, hearMatrix)

  for (const update of updates) {
    if (update.add.length === 0 && update.remove.length === 0) continue

    await applySubscriptionUpdate(code, update)
  }

  for (const player of mergedPlayers) {




    if (!ownsPlayer(player.gamertag.toLowerCase(), backendId, code)) {
      continue
    }

    const hearablePlayers = [
      ...(hearMatrix.get(player.gamertag.toLowerCase()) ?? []),
    ].filter(
      (gamertag: string) => gamertag.toLowerCase() !== '__SculWave__',
    )





    const nearestPlayers = mergedPlayers.filter((other) => {
      if (
        player.x === undefined ||
        player.y === undefined ||
        other.x === undefined ||
        other.y === undefined
      ) {
        return false
      }

      const dx = other.x - player.x
      const dy = other.y - player.y

      return dx * dx + dy * dy <= 100 * 100
    })

    await playerEventStore.publish({
      type: 'POSITIONS_UPDATED',
      gamertag: player.gamertag,
      players: nearestPlayers,
      hearablePlayers,
      voiceEnabled,
    })

  }

  // AUTOMATION ENGINE:
  // Release holding players when they enter a Minecraft backend
  // belonging to the network they selected in the app.
  for (const player of mergedPlayers) {
    const socketGamertag = player.gamertag
    const lowerGamertag = socketGamertag.toLowerCase()

    if (!ownsPlayer(lowerGamertag, backendId, code)) {
      continue
    }

    const isNowInGame = onlineGamertags.has(lowerGamertag)



    const session = playerSessionStore.get(lowerGamertag)

    if (!session) {
      continue
    }

    // Player is already connected to voice.
    // Existing backend-switch logic above handles their movement.
    if (session.hasVoiceToken) {
      continue
    }

    // Player is waiting in the holding queue.
    const isHolding =
      session.holdStartedAt !== undefined

    if (!isNowInGame || !isHolding) {
      continue
    }

    // The player selected a network in the app.
    // They may join ANY backend belonging to that same network.
    const sameNetwork =
      session.selectedInstanceId === instanceId

    if (!sameNetwork) {
      info(
        'QueueSystem',
        'Player "%s" is in network %s but selected network %s. Remaining in holding.',
        socketGamertag,
        instanceId,
        session.selectedInstanceId ?? 'unknown',
      )

      continue
    }

    info(
      'QueueHandoff',
      'Player "%s" entered backend %s in selected network %s. Switching %s -> %s.',
      socketGamertag,
      backendId,
      instanceId,
      session.selectedRoomCode ?? 'unknown',
      code,
    )

    try {
      const previousRoomCode =
        session.selectedRoomCode ?? code

      const token = await generateLiveKitToken(
        code,
        socketGamertag,
      )

      // Tell the connected app to move from the originally
      // selected room into the player's actual Minecraft room.
      await playerEventStore.publish({
        type: 'VOICE_ROOM_SWITCH',
        gamertag: socketGamertag,
        previousRoomCode,
        roomCode: code,
        token,
        url: LIVEKIT_PUB_URL,
      })

      session.hasVoiceToken = true
      session.holdStartedAt = undefined
      session.isSwitchingBackend = false



      await playerSessionStore.set(
        lowerGamertag,
        session,
      )

      setTimeout(async () => {
        await refreshParticipantCache(code)
      }, 3000)

      io.to(code).emit('player-joined-voice', {
        gamertag: socketGamertag,
      })

      info(
        'QueueHandoff',
        'Released %s from holding queue: %s -> %s',
        socketGamertag,
        previousRoomCode,
        code,
      )
    } catch (err) {
      error(
        'QueueHandoff',
        'Failed to handoff %s into room %s: %o',
        socketGamertag,
        code,
        err,
      )

      await playerEventStore.publish({
        type: 'VOICE_REJECTED',
        gamertag: socketGamertag,
        payload: {
          code: 'TOKEN_FAILED',
          reason:
            'Failed to start voice chat.',
        },
      })
    }
  }



}

export function ownsPlayer(gamertag: string, backendId: string, roomCode: string): boolean {
  const current = playerBackendStore.get(gamertag)

  return !!current && current.backendId === backendId && current.roomCode === roomCode
}
