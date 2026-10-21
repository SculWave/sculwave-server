import { LIVEKIT_URL } from '../config/env'
import { generateLiveKitToken } from './tokenService'

import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../types/socket'

import { Server } from 'socket.io'

export async function switchPlayerRoom(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  socketId: string,
  roomCode: string,
  gamertag: string,
) {
  const socket = io.sockets.sockets.get(socketId)

  if (!socket) return

  const token = await generateLiveKitToken(roomCode, gamertag)

  socket.data.roomCode = roomCode

  socket.emit('voice-room-switch', {
    roomCode,
    token,
    url: LIVEKIT_URL,
  })
}
