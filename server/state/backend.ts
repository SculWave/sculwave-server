import { RoomData } from '../types/room'

export interface BackendState {
  id: string
  createdAt: number
  lastSeen: number
  entryPoint: boolean
  entryPointPriority: number | null
}

export interface BackendEntry {
  instanceId: string

  backend: BackendState
}
