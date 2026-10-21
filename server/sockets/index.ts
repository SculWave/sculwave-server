import type { Server } from 'socket.io'

import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../types/socket'

import { handleJoinVoiceRoom } from './joinVoiceRoom'
import { handleDisconnect } from './disconnect'
import { log } from '../utils/logger'

export function registerSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
) {
  io.on('connection', (socket) => {
    log('Socket', 'CONNECTED %s', socket.id)

    socket.onAny((event, ...args) => {
      log('Socket', 'EVENT %s %o', event, args)
    })

    socket.emit('debug-instance', {
      hostname: process.env.HOSTNAME!,
    })

    socket.on('join-voice-room', ({ roomCode, gamertag }) => {
      log('JoinVoice', 'room=%s gamertag=%s', roomCode, gamertag)

      handleJoinVoiceRoom(io, socket, roomCode, gamertag)
    })

    socket.on('disconnect', () => handleDisconnect(io, socket))
  })
}
