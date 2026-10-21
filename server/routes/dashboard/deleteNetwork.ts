import { IncomingMessage, ServerResponse } from 'http'

import { prisma } from '../../database/prisma'
import { requireSession } from '../../auth/requireSession'
import { error } from '@/server/utils/logger'

export async function handleDeleteNetwork(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): Promise<boolean> {
  if (
    req.method !== 'DELETE' ||
    !pathname.startsWith('/api/dashboard/networks/')
  ) {
    return false
  }

  const parts = pathname.split('/')

  if (parts.length !== 5 || !parts[4]) {
    return false
  }

  try {
    const user = await requireSession(req.headers.cookie)

    if (!user) {
      res.writeHead(401)
      res.end()
      return true
    }

    const networkId = parts[4]

    const network = await prisma.network.findFirst({
      where: {
        id: networkId,
        ownerId: user.id,
      },
    })

    if (!network) {
      res.writeHead(404, {
        'Content-Type': 'application/json',
      })
      res.end(JSON.stringify({
        success: false,
        error: 'NETWORK_NOT_FOUND',
      }))
      return true
    }

    // Network deletion has no external billing side effects.
    await prisma.network.delete({
      where: {
        id: network.id,
      },
    })

    res.writeHead(200, {
      'Content-Type': 'application/json',
    })

    res.end(JSON.stringify({
      success: true,
    }))

    return true
  } catch (err) {
    error('DeleteNetwork', 'Failed to delete network: %o', err)

    res.writeHead(500, {
      'Content-Type': 'application/json',
    })

    res.end(JSON.stringify({
      success: false,
      error: 'NETWORK_DELETE_FAILED',
      message:
        'Could not delete the network. Please try again.',
    }))

    return true
  }
}
