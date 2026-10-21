import { BackendState } from '../state/backend'
import type { RoomData } from './room'

export interface InstanceState {
  id: string
  backends: Map<string, BackendState>
}
