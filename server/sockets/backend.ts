import { Server, Namespace } from 'socket.io'

import { getBackend, registerBackend, removeBackend } from '../managers/backendManager'

import type {
  BackendClientToServerEvents,
  BackendServerToClientEvents,
  BackendInterServerEvents,
  BackendSocketData,
} from '../types/backendSocket'
import { backendSocketStore } from '../services/backendRedis/backendSocketStore'
import { processBackendHeartbeat } from '../services/backendHeartbeatService'
import {
  markBackendOffline,
  markBackendOnline,
  updateBackendHeartbeat,
} from '../services/backendSyncService'
import { log } from '../utils/logger'
import { createRoom, deleteRoom, getRoomByCode } from '../managers/roomManger'
import { destroyLiveKitRoom } from '../services/livekit/rooms'
import { roomIndexStore } from '../services/roomIndexRedis/RoomIndexStore'
import { speakingMonitor } from '../services/livekit/SpeakingMonitor'
import { voiceStateBridge } from '../services/livekit/VoiceStateBridge'

type BackendNamespace = Namespace<
  BackendClientToServerEvents,
  BackendServerToClientEvents,
  BackendInterServerEvents,
  BackendSocketData
>

export function registerBackendSocketHandlers(io: Server) {
  const backendNamespace = io.of('/backend') as BackendNamespace


  voiceStateBridge.start(backendNamespace)


  backendNamespace.on('connection', (socket) => {
    log('BackendSocket', 'CONNECTED socket=%s', socket.id)

    socket.on('disconnect', (reason) => {
      backendSocketStore.delete(socket.data.backendId!)


      log('BackendSocket', 'DISCONNECTED socket=%s reason=%s', socket.id, reason)
    })

    socket.on('backend-auth', async (data) => {
      const backend = getBackend(data.backendId, data.instanceId)

      if (!backend) {
        socket.emit('backend-auth-failed', 'NOT_FOUND')

        socket.disconnect()

        return
      }

      const roomCode = await roomIndexStore.findByBackend(data.backendId, data.instanceId)

      if (!roomCode) {
        socket.emit('backend-auth-failed', 'ROOM_NOT_FOUND')

        socket.disconnect()

        return
      }

      const room = getRoomByCode(roomCode)

      if (!room) {
        socket.emit('backend-auth-failed', 'ROOM_NOT_FOUND')

        socket.disconnect()

        return
      }

      if (room.authToken !== data.token) {
        socket.emit('backend-auth-failed', 'INVALID_TOKEN')

        socket.disconnect()

        return
      }
      socket.data.backendId = data.backendId
      socket.data.instanceId = data.instanceId
      socket.data.authenticated = true

      backendSocketStore.set(data.backendId, socket.id)


      socket.emit('backend-auth-success')
    })

    socket.on('backend-register', async (data) => {
      if (!data.backendId || !data.instanceId) {
        socket.emit('backend-register-failed', 'INVALID_REQUEST')

        return
      }

      socket.data.backendId = data.backendId
      socket.data.instanceId = data.instanceId

      try {
        await registerBackend(data.backendId, data.instanceId)

        await markBackendOnline(data.backendId)



        const room = await createRoom(data.instanceId, data.backendId)
        await speakingMonitor.start(room.roomCode)


        socket.emit('backend-register-success', {
          roomCode: room.roomCode,
          token: room.authToken,
        })
      } catch {
        socket.emit('backend-register-failed', 'REGISTER_FAILED')
      }
    })

    socket.on('backend-heartbeat', async (payload) => {
      log('Heartbeat', 'backendId=%s instanceId=%s', socket.data.backendId, socket.data.instanceId)

      log('Heartbeat', '%o', {
        backendId: socket.data.backendId,
        instanceId: socket.data.instanceId,
        voiceEnabled: payload.voiceEnabled,
        players: payload.players,
      })

      if (!socket.data.authenticated) {
        socket.disconnect()
        return
      }

      const roomCode = await roomIndexStore.findByBackend(socket.data.backendId!, socket.data.instanceId!)

      if (!roomCode) {
        return
      }

      const room = getRoomByCode(roomCode)

      if (!room) {
        return
      }

      await processBackendHeartbeat(
        io,
        room,
        payload.players,
        socket.data.backendId!,
        socket.data.instanceId!,
        payload.timestamp,
        payload.voiceEnabled,
      )

      await updateBackendHeartbeat(
        socket.data.backendId!,
        socket.data.instanceId!,
      )
    })

    socket.on('backend-shutdown', async () => {
      if (!socket.data.authenticated) {
        socket.disconnect()
        return
      }

      const roomCode = await roomIndexStore.findByBackend(socket.data.backendId!, socket.data.instanceId!)

      if (!roomCode) {
        return
      }

      const room = getRoomByCode(roomCode)

      if (!room) {
        return
      }

      io.to(room.roomCode).emit('room-expired')
      await speakingMonitor.stop(room.roomCode)
      await destroyLiveKitRoom(room.roomCode)

      await deleteRoom(room.roomCode)


      await removeBackend(socket.data.backendId!, socket.data.instanceId!)

      await markBackendOffline(socket.data.backendId!)

      socket.disconnect(true)
    })
  })
}
