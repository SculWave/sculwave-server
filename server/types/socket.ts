import { PositionUpdatePayload } from './player'
import { JoinVoiceRoomPayload } from './room'

export interface ServerToClientEvents {
  'voice-token-ready': (data: { token: string; url: string }) => void
  'player-joined-voice': (data: { gamertag: string }) => void
  'player-left-voice': (data: { gamertag: string }) => void
  'positions-updated': (data: PositionUpdatePayload) => void
  'room-expired': () => void
  'voice-join-rejected': (data: {
    reason: string
    code: 'ROOM_NOT_FOUND' | 'TOKEN_FAILED' | 'UNKNOWN' | 'TIMEOUT'
  }) => void
  'voice-join-holding': (data: { message: string; expiresAt: number }) => void
  'voice-room-switch': (payload: { roomCode: string; token: string; url: string }) => void

  'debug-instance': (data: { hostname: string }) => void
  'debug-message': (data: { from: string; time: number }) => void
}

export interface ClientToServerEvents {
  'join-voice-room': (data: JoinVoiceRoomPayload) => void
  'debug-broadcast': () => void
}

export interface InterServerEvents {}

export interface SocketData {
  gamertag?: string
  roomCode?: string
  hasVoiceToken?: boolean
  holdStartedAt?: number // Tracks when they entered the 15-minute queue
  isSwitchingBackend?: boolean
}
