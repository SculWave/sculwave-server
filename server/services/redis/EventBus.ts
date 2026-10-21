import { pubsub } from '.'

type Handler<T> = (payload: T) => void

export class EventBus {
  async publish<T>(channel: string, payload: T) {
    await pubsub.publish(channel, payload)
  }

  async subscribe<T>(channel: string, handler: Handler<T>) {
    await pubsub.subscribe(channel, handler)
  }
}

export const eventBus = new EventBus()
