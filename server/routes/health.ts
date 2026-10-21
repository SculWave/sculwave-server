import { IncomingMessage, ServerResponse } from 'http'

import { prisma } from '../database/prisma'
import { redis } from '../services/redis'

import { RoomServiceClient } from 'livekit-server-sdk'

export async function handleHealth(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): Promise<boolean> {
  if (req.method !== 'GET' || pathname !== '/health') {
    return false
  }

  const services = {
    postgres: {
      healthy: false,
      latency: -1,
    },

    redis: {
      healthy: false,
      latency: -1,
    },

    livekit: {
      healthy: false,
      latency: -1,
    },
  }

  // PostgreSQL
  try {
    const start = Date.now()

    await prisma.$queryRaw`SELECT 1`

    services.postgres.healthy = true
    services.postgres.latency = Date.now() - start
  } catch {}

  // Redis
  try {
    const start = Date.now()

    services.redis.healthy = (await redis.ping()) === 'PONG'

    services.redis.latency = Date.now() - start
  } catch {}

  // LiveKit
  try {
    const start = Date.now()

    await roomService.listRooms()

    services.livekit.healthy = true
    services.livekit.latency = Date.now() - start
  } catch {}

  const healthy = Object.values(services).every((service) => service.healthy)

  res.writeHead(healthy ? 200 : 503, {
    'Content-Type': 'application/json',
  })

  res.end(
    JSON.stringify({
      status: healthy ? 'healthy' : 'degraded',

      hostname: process.env.HOSTNAME,

      uptime: process.uptime(),

      timestamp: Date.now(),

      services,
    }),
  )

  return true
}

export const roomService = new RoomServiceClient(
  process.env.LIVEKIT_URL!,
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!,
)
