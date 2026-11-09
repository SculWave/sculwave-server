import { Player } from './player'

export interface BackendClientToServerEvents {
  'backend-auth': (data: { backendId: string; instanceId: string; token: string }) => void

  'backend-heartbeat': (data: {
    players: Player[]
    timestamp: number
    voiceEnabled: boolean
    /** Names of players connected to Simple Voice Chat (optional: older plugins omit it). */
    svcPlayers?: string[]
  }) => void

  /** One Opus frame from a Simple Voice Chat player, to be published into the room. */
  'svc-audio': (gamertag: string, opus: Buffer) => void

  'backend-register': (data: { backendId: string; instanceId: string }) => void

  'backend-shutdown': () => void
}

export interface BackendServerToClientEvents {
  'backend-auth-success': () => void

  'backend-auth-failed': (reason: string) => void

  'backend-register-success': (data: { roomCode: string; token: string }) => void

  'backend-register-failed': (reason: string) => void

  'voice-state': (data: {
    roomCode: string
    gamertag: string
    connected: boolean
    muted: boolean
    speaking: boolean
    timestamp: number
    /** True when this participant is a Simple Voice Chat player bridged into the room. */
    bridged?: boolean
  }) => void

  /** One Opus frame of an app player for Simple Voice Chat players. Empty = end of utterance. */
  'svc-playback': (gamertag: string, opus: Buffer) => void
}

export interface BackendInterServerEvents { }

export interface BackendSocketData {
  backendId?: string

  instanceId?: string

  authenticated?: boolean
}
