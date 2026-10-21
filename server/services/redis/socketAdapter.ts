import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'
import { Server } from 'socket.io'

export async function attachSocketAdapter(io: Server) {
  const pubClient = createClient({
    url: process.env.REDIS_URL!,
  })

  const subClient = pubClient.duplicate()

  await Promise.all([pubClient.connect(), subClient.connect()])

  io.adapter(createAdapter(pubClient, subClient))

  return {
    pubClient,
    subClient,
  }
}
