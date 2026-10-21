export type PlayerEvent =
    | VoiceTokenReadyEvent
    | VoiceRoomSwitchEvent
    | PositionsUpdatedEvent
    | VoiceRejectedEvent

export interface VoiceTokenReadyEvent {
  type: 'VOICE_TOKEN_READY'

  gamertag: string

  token: string

  url: string
}

export interface VoiceRoomSwitchEvent {
  type: 'VOICE_ROOM_SWITCH'

  gamertag: string

  previousRoomCode: string

  roomCode: string

  token: string

  url: string
}

export interface PositionsUpdatedEvent {
  type: 'POSITIONS_UPDATED'

  gamertag: string

  players: any[]

  hearablePlayers: string[]

  voiceEnabled: boolean
}

export interface VoiceRejectedEvent {
  type: 'VOICE_REJECTED'

  gamertag: string

  payload: VoiceRejectedPayload
}


export interface VoiceRejectedPayload {
  code:
  | 'ROOM_NOT_FOUND'
  | 'TOKEN_FAILED'
  | 'UNKNOWN'
  | 'TIMEOUT'

  reason: string
}
