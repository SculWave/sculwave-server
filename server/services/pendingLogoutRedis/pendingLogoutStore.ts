import { redis } from '../redis'
import { eventBus } from '../redis/EventBus'

import { PendingLogout } from '../../state/pendingLogout'
import { log } from '@/server/utils/logger'

const PREFIX = 'pending-logout:'
const CHANNEL = 'pending-logout'
const SOURCE = process.env.HOSTNAME!

interface PendingLogoutEvent {
  source: string
  type: 'SET' | 'DELETE'
  gamertag: string
  state?: PendingLogout
}

class PendingLogoutStore {
  private readonly pending = new Map<string, PendingLogout>()

  constructor() {
    void eventBus.subscribe<PendingLogoutEvent>(CHANNEL, (event) => {
      if (event.source === SOURCE) {
        return
      }

      switch (event.type) {
        case 'SET':
          log('PENDING', 'REDIS SET', event.gamertag, event.state)
          if (event.state) {
            this.pending.set(event.gamertag, event.state)
          }

          break

        case 'DELETE':
          log('PENDING', 'REDIS DELETE', event.gamertag)
          this.pending.delete(event.gamertag)

          break
      }
    })
  }

  entries() {
    return this.pending.entries()
  }

  async set(gamertag: string, state: PendingLogout) {
    log('PENDING', 'LOCAL SET', gamertag, state)
    this.pending.set(gamertag, state)

    await redis.set(PREFIX + gamertag, JSON.stringify(state), {
      expiration: {
        type: 'EX',
        value: 5,
      },
    })

    await eventBus.publish<PendingLogoutEvent>(CHANNEL, {
      source: SOURCE,
      type: 'SET',
      gamertag,
      state,
    })
  }

  async get(gamertag: string): Promise<PendingLogout | null> {
    const value = await redis.get(PREFIX + gamertag)

    if (!value) {
      this.pending.delete(gamertag)

      return null
    }

    return JSON.parse(value)
  }

  async delete(gamertag: string) {
    log('PENDING', 'LOCAL DELETE', gamertag)
    this.pending.delete(gamertag)

    await redis.del(PREFIX + gamertag)

    await eventBus.publish<PendingLogoutEvent>(CHANNEL, {
      source: SOURCE,
      type: 'DELETE',
      gamertag,
    })
  }
}

export const pendingLogoutStore = new PendingLogoutStore()
