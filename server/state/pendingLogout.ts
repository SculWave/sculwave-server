// state/pendingLogout.ts

export interface PendingLogout {
  instanceId: string
  backendId: string
  roomCode: string
  expiresAt: number
}
