import type { Server, Socket } from 'socket.io'

import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../types/socket'

import { kickLiveKitParticipant, refreshParticipantCache } from '../services/livekit/participants'
import { unregisterPlayerSocket } from '../managers/socketManager'

import { error } from '../utils/logger'
import { playerSessionStore } from '../services/playerSessionRedis/PlayerSessionStor'

export async function handleDisconnect(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
) {
  const { roomCode, gamertag } = socket.data

  if (!roomCode || !gamertag) {
    return
  }
  const key = gamertag.toLowerCase()

  unregisterPlayerSocket(gamertag)

  io.to(roomCode).emit('player-left-voice', { gamertag })

  try {
    await kickLiveKitParticipant(roomCode, gamertag)
    await refreshParticipantCache(roomCode)
  } catch (err) {
    error('Server', '%o', err)
  } finally {
    await playerSessionStore.delete(key)
  }
}
