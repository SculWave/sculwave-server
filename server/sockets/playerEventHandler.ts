import { Server } from 'socket.io'

import { playerEventStore } from '../services/playerEventRedis/PlayerEventStore'
import { playerSockets } from '../state/socketIndex'

import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../types/socket'

export function registerPlayerEventHandler(
  io: Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >,
) {
  playerEventStore.subscribe(async (event) => {

    const socketId = playerSockets.get(
      event.gamertag.toLowerCase(),
    )

    if (!socketId) {
      return
    }

    const socket = io.sockets.sockets.get(socketId)

    if (!socket) {
      return
    }

    switch (event.type) {

      case 'VOICE_TOKEN_READY':
        socket.emit('voice-token-ready', {
          token: event.token,
          url: event.url,
        })
        break

      case 'VOICE_ROOM_SWITCH':
        socket.leave(event.previousRoomCode)
        
        socket.join(event.roomCode)

        socket.emit('voice-room-switch', {
          roomCode: event.roomCode,
          token: event.token,
          url: event.url,
        })
        break

      case 'VOICE_REJECTED':
        socket.emit(
          'voice-join-rejected',
          event.payload,
        )
        break

      case 'POSITIONS_UPDATED':
        socket.emit('positions-updated', {
          players: event.players,
          hearablePlayers: event.hearablePlayers,
          voiceEnabled: event.voiceEnabled,
        })
        break

      default: {
        const exhaustive: never = event
        return exhaustive
      }
    }
  })
}