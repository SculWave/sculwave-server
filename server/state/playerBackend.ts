// state/playerBackend.ts

export interface PlayerBackendState {
  instanceId: string
  backendId: string
  roomCode: string
  lastSeen: number
}

export const playerBackendIndex = new Map<string, PlayerBackendState>()
