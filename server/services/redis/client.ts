import { error, info, warn } from '@/server/utils/logger'
import { createClient } from 'redis'

export const redis = createClient({
  url: process.env.REDIS_URL!,
})

redis.on('error', (err) => {
  error('Redis', '%o', err)
})

redis.on('reconnecting', () => {
  warn('Redis', 'Reconnecting...')
})

redis.on('ready', () => {
  info('Redis', 'Connected')
})

export async function connectRedis() {
  await redis.connect()
}
