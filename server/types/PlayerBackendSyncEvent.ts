import { PlayerBackendState } from '../state/playerBackend'

export interface PlayerBackendSyncEvent {
  type: 'SET' | 'DELETE'
  gamertag: string
  state?: PlayerBackendState
}
