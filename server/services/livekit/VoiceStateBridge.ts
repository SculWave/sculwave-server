import { Namespace } from 'socket.io'
import { voiceStateStore, VoicePlayerState } from './VoiceStateStore'
import { backendSocketStore } from '../backendRedis/backendSocketStore'
import { roomIndexStore } from '../roomIndexRedis/RoomIndexStore'
import { log } from '@/server/utils/logger'
import type {
  BackendClientToServerEvents,
  BackendServerToClientEvents,
  BackendInterServerEvents,
  BackendSocketData,
} from '../../types/backendSocket'

type BackendNamespace = Namespace<
  BackendClientToServerEvents,
  BackendServerToClientEvents,
  BackendInterServerEvents,
  BackendSocketData
>

class VoiceStateBridge {
  private started = false

  start(namespace: BackendNamespace) {
    if (this.started) {
      return
    }

    this.started = true

    voiceStateStore.subscribe((state: VoicePlayerState) => {
      const location = roomIndexStore.get(state.roomCode)

      if (!location) {
        log(
          'VoiceState',
          'No room location room=%s',
          state.roomCode,
        )
        return
      }

      const socketId = backendSocketStore.get(location.backendId)

      if (!socketId) {
        log(
          'VoiceState',
          'No backend socket backend=%s room=%s',
          location.backendId,
          state.roomCode,
        )
        return
      }

      const socket = namespace.sockets.get(socketId)

      if (!socket) {
        log(
          'VoiceState',
          'Socket not found socket=%s backend=%s',
          socketId,
          location.backendId,
        )
        return
      }

      if (!socket.data.authenticated) {
        return
      }

      socket.emit('voice-state', {
        roomCode: state.roomCode,
        gamertag: state.gamertag,
        connected: state.connected,
        muted: state.muted,
        speaking: state.speaking,
        timestamp: state.timestamp,
      })

      log(
        'VoiceState',
        'SENT room=%s player=%s connected=%s muted=%s speaking=%s',
        state.roomCode,
        state.gamertag,
        state.connected,
        state.muted,
        state.speaking,
      )
    })
  }
}

export const voiceStateBridge = new VoiceStateBridge()