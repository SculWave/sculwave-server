import { eventBus } from '../redis/EventBus'
import { playerBackendIndex, PlayerBackendState } from '../../state/playerBackend'
import { log } from '@/server/utils/logger'

const CHANNEL = 'player-backend'

export interface PlayerBackendSyncEvent {
  source: string
  type: 'SET' | 'DELETE'
  gamertag: string
  state?: PlayerBackendState
}

class PlayerBackendStore {
  constructor() {
    void eventBus.subscribe<PlayerBackendSyncEvent>(CHANNEL, (event) => {
      if (event.source === process.env.HOSTNAME!) {
        return
      }

      switch (event.type) {
        case 'SET':
          if (event.state) {
            log('PLAYER', 'REDIS SET', event.gamertag, event.state)
            this.setLocal(event.gamertag, event.state)
          }
          break

        case 'DELETE':
          log('PLAYER', 'REDIS DELETE', event.gamertag)
          this.deleteLocal(event.gamertag)
          break
      }
    })
  }

  get(gamertag: string) {
    return playerBackendIndex.get(gamertag)
  }

  has(gamertag: string) {
    return playerBackendIndex.has(gamertag)
  }

  entries() {
    return playerBackendIndex.entries()
  }

  keys() {
    return playerBackendIndex.keys()
  }

  values() {
    return playerBackendIndex.values()
  }

  setLocal(gamertag: string, state: PlayerBackendState) {
    log('PLAYER', 'LOCAL SET', gamertag, state)
    playerBackendIndex.set(gamertag, state)
  }

  deleteLocal(gamertag: string) {
    log('PLAYER', 'LOCAL DELETE', gamertag)
    playerBackendIndex.delete(gamertag)
  }

  async set(gamertag: string, state: PlayerBackendState) {
    this.setLocal(gamertag, state)

    await eventBus.publish(CHANNEL, {
      source: process.env.HOSTNAME!,
      type: 'SET',
      gamertag,
      state,
    })
  }

  async delete(gamertag: string) {
    this.deleteLocal(gamertag)

    await eventBus.publish(CHANNEL, {
      source: process.env.HOSTNAME!,
      type: 'DELETE',
      gamertag,
    })
  }
}

export const playerBackendStore = new PlayerBackendStore()
