import { connectRedis, redis } from './client'
import { RedisPubSub } from './ReadisPubSub'

export { redis }

export const pubsub = new RedisPubSub(process.env.REDIS_URL!)

export async function connectRedisServices() {
  await connectRedis()
  await pubsub.connect()
}
