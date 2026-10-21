import { Player } from './player'

export interface RoomData {
  roomCode: string
  authToken: string
  lastSeen: number
  players: Player[]
}

export interface JoinVoiceRoomPayload {
  roomCode: string
  gamertag: string
}
