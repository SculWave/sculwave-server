export interface Player {
  gamertag: string
  x?: number
  y?: number
  z?: number
  dimension?: string
  groupId?: string
  isMuted?: boolean
}

export interface PositionUpdatePayload {
  players: Player[]
  hearablePlayers: string[]
  voiceEnabled: boolean
}
