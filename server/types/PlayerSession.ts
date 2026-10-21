export interface PlayerSession {
  hasVoiceToken: boolean
  isSwitchingBackend: boolean
  holdStartedAt?: number
  selectedInstanceId?: string
  selectedRoomCode?: string
}

export const playerSessions = new Map<string, PlayerSession>()