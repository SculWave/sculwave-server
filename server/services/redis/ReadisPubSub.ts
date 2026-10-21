import { error, warn } from '@/server/utils/logger'
import { createClient, RedisClientType } from 'redis'

type Subscription = {
  channel: string
  handler: (message: string) => void
}

export class RedisPubSub {
  readonly publisher: RedisClientType
  readonly subscriber: RedisClientType

  private connected = false
  private subscriptions: Subscription[] = []

  constructor(url: string) {
    this.publisher = createClient({ url })
    this.subscriber = this.publisher.duplicate()

    this.publisher.on('error', (err) =>
      error('RedisPub', '%o', err)
    )

    this.subscriber.on('error', (err) =>
      error('RedisSub', '%o', err)
    )

    this.publisher.on('reconnecting', () => {
      warn('RedisPub', 'Reconnecting')
    })

    this.subscriber.on('reconnecting', () => {
      warn('RedisSub', 'Reconnecting')
    })
  }

  async connect() {
    await Promise.all([
      this.publisher.connect(),
      this.subscriber.connect(),
    ])

    this.connected = true

    for (const subscription of this.subscriptions) {
      await this.subscriber.subscribe(
        subscription.channel,
        subscription.handler
      )
    }
  }

  async publish<T>(channel: string, payload: T) {
    await this.publisher.publish(
      channel,
      JSON.stringify(payload)
    )
  }

  async subscribe<T>(
    channel: string,
    handler: (payload: T) => void,
  ) {
    const subscription: Subscription = {
      channel,
      handler: (message) => {
        handler(JSON.parse(message) as T)
      },
    }

    this.subscriptions.push(subscription)

    if (this.connected) {
      await this.subscriber.subscribe(
        subscription.channel,
        subscription.handler
      )
    }
  }

  async disconnect() {
    this.connected = false

    await Promise.all([
      this.publisher.quit(),
      this.subscriber.quit(),
    ])
  }
}