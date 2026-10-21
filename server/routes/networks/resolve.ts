import { IncomingMessage, ServerResponse } from 'http'
import { prisma } from '../../database/prisma'
import { getEntryPoint } from '../../services/backend/entryPointResolver'
import { roomIndexStore } from '../../services/roomIndexRedis/RoomIndexStore'

export async function handleResolveNetwork(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): Promise<boolean> {
  if (req.method !== 'GET' || !pathname.startsWith('/api/discovery/networks/')) {
    return false
  }

  const parts = pathname.split('/')

  if (parts.length !== 6 || parts[5] !== 'resolve') {
    return false
  }

  const networkId = parts[4]

  try {
    const network = await prisma.network.findFirst({
      where: {
        id: networkId,
        active: true,
        publicListed: true,
      },
      select: {
        id: true,
        name: true,
      },
    })

    if (!network) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        success: false,
        error: 'NETWORK_NOT_FOUND',
      }))
      return true
    }

    const entryPoint = await getEntryPoint(network.id)

    if (!entryPoint) {
      res.writeHead(503, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        success: false,
        error: 'NETWORK_OFFLINE',
      }))
      return true
    }

    const roomCode = await roomIndexStore.findByBackend(
      entryPoint.backend.id,
      entryPoint.instanceId,
    )

    if (!roomCode) {
      res.writeHead(503, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        success: false,
        error: 'NETWORK_OFFLINE',
      }))
      return true
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      success: true,
      network: {
        id: network.id,
        name: network.name,
      },
      backend: {
        id: entryPoint.backend.id,
        instanceId: entryPoint.instanceId,
      },
      roomCode,
    }))
  } catch (err) {
    console.error('[Discovery] Failed to resolve network:', err)

    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
    }))
  }

  return true
}