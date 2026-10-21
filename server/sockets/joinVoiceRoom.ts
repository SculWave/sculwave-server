import { LIVEKIT_PUB_URL, LIVEKIT_URL } from '../config/env'

import { getRoomByCode } from '../managers/roomManger'
import { generateLiveKitToken } from '../services/tokenService'
import { refreshParticipantCache } from '../services/livekit/participants'

import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../types/socket'

import type { Server, Socket } from 'socket.io'
import { playerSockets } from '../state/socketIndex'
import { registerPlayerSocket } from '../managers/socketManager'
import { roomIndexStore } from '../services/roomIndexRedis/RoomIndexStore'
import { error, info, log } from '../utils/logger'
import { getBackends } from '../managers/backendManager'
import { playerSessionStore } from '../services/playerSessionRedis/PlayerSessionStor'

export async function handleJoinVoiceRoom(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  roomCode: string,
  gamertag: string,
) {
  const normalizedRoom = roomCode.toUpperCase().trim()
  const targetGamertag = gamertag.trim().toLowerCase()
  const room = getRoomByCode(normalizedRoom)

  log('JoinVoice', 'HOST=%s', process.env.HOSTNAME)

  log('JoinVoice', 'room=%o', room)

  log('JoinVoice', 'known backends=%o', [...getBackends().keys()])

  if (!room) {
    socket.emit('voice-join-rejected', {
      code: 'ROOM_NOT_FOUND',
      reason: 'This room session does not exist!',
    })
    return
  }

  socket.data.gamertag = gamertag
  socket.data.roomCode = normalizedRoom
  const location = roomIndexStore.get(normalizedRoom)

  await playerSessionStore.set(gamertag.toLowerCase(), {
    hasVoiceToken: false,
    isSwitchingBackend: false,
    selectedInstanceId: location?.instanceId,
    selectedRoomCode: normalizedRoom,
  })
  
  registerPlayerSocket(gamertag, socket.id)

  socket.join(normalizedRoom)

  const isPlayerInGame = room.players.some(
    (p: { gamertag: string }) => p.gamertag.toLowerCase() === targetGamertag,
  )





  if (!isPlayerInGame) {
    info(
      'QueueSystem',
      'Player "%s" placed in 15-minute hold for room %s',
      gamertag,
      normalizedRoom,
    )

    const session = playerSessionStore.get(gamertag.toLowerCase())

    if (session) {
      session.holdStartedAt = Date.now()

      await playerSessionStore.set(gamertag.toLowerCase(), session)
    }

    socket.emit('voice-join-holding', {
      message: 'Holding room active! Minimize this app and connect to the Minecraft server.',
      expiresAt: Date.now() + 15 * 60 * 1000,
    })


    return
  }

  info('InstantVerification', 'Player "%s" is already online. Generating token...', gamertag)


  try {
    const location = roomIndexStore.get(normalizedRoom)

    if (!location) {
      socket.emit('voice-join-rejected', {
        code: 'ROOM_NOT_FOUND',
        reason: 'This room session does not exist.',
      })
      return
    }

    const token = await generateLiveKitToken(normalizedRoom, gamertag)

    const session = playerSessionStore.get(gamertag.toLowerCase())

    if (session) {
      session.hasVoiceToken = true
      session.holdStartedAt = undefined

      await playerSessionStore.set(gamertag.toLowerCase(), session)
    }

    socket.emit('voice-token-ready', { token, url: LIVEKIT_PUB_URL })

    setTimeout(async () => {
      await refreshParticipantCache(normalizedRoom)
    }, 3000)

    io.to(normalizedRoom).emit('player-joined-voice', { gamertag })

  } catch (err) {
    error('LiveKitToken', '%o', err)
    socket.emit('voice-join-rejected', {
      code: 'TOKEN_FAILED',
      reason: 'Failed to allocate voice chat credentials.',
    })
  }
}
