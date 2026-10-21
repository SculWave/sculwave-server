import { Player } from './player'

export interface BackendClientToServerEvents {
  'backend-auth': (data: { backendId: string; instanceId: string; token: string }) => void

  'backend-heartbeat': (data: {
    players: Player[]
    timestamp: number
    voiceEnabled: boolean
  }) => void

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
  }) => void
}

export interface BackendInterServerEvents { }

export interface BackendSocketData {
  backendId?: string

  instanceId?: string

  authenticated?: boolean
}
