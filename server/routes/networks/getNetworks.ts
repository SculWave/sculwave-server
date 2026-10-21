import { IncomingMessage, ServerResponse } from 'http'

import { prisma } from '../../database/prisma'
import { requireSession } from '../../auth/requireSession'

export async function handleGetNetworks(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): Promise<boolean> {
  if (req.method !== 'GET' || pathname !== '/api/networks') {
    return false
  }

  const user = await requireSession(req.headers.cookie)

  if (!user) {
    res.writeHead(401)

    res.end()

    return true
  }

  const networks = await prisma.network.findMany({
    where: {
      ownerId: user.id,
    },

    orderBy: {
      createdAt: 'desc',
    },

    select: {
      id: true,

      name: true,

      instanceId: true,

      activationKey: true,


      active: true,

      createdAt: true,
    },
  })

  res.writeHead(200, {
    'Content-Type': 'application/json',
  })

  res.end(JSON.stringify(networks))

  return true
}
