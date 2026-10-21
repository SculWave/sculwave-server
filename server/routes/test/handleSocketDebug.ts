import { IncomingMessage, ServerResponse } from 'http'
import { Server } from 'socket.io'

import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '@/server/types/socket'

interface Body {
  event: keyof ServerToClientEvents
  data?: unknown
}

export async function handleSocketDebug(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
): Promise<boolean> {
  if (req.method !== 'POST' || pathname !== '/api/debug/socket') {
    return false
  }

  let raw = ''

  for await (const chunk of req) {
    raw += chunk
  }

  const body = JSON.parse(raw) as Body

  ;(io as any).emit(body.event, body.data)

  res.writeHead(200, {
    'Content-Type': 'application/json',
  })

  res.end(
    JSON.stringify({
      hostname: process.env.HOSTNAME,
      event: body.event,
      sockets: io.of('/').sockets.size,
    }),
  )

  return true
}
