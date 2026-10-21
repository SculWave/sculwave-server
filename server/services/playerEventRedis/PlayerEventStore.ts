import crypto from 'crypto'

import { eventBus } from '../redis/EventBus'
import { PlayerEvent } from './PlayerEvents'

const CHANNEL = 'player-events'

const SOURCE = process.env.HOSTNAME ?? crypto.randomUUID()

class PlayerEventStore {
  async publish(event: PlayerEvent) {
    await eventBus.publish<PlayerEvent>(CHANNEL, event)
  }

  subscribe(handler: (event: PlayerEvent) => void) {
    void eventBus.subscribe<PlayerEvent>(CHANNEL, handler)
  }
}

export const playerEventStore = new PlayerEventStore()
