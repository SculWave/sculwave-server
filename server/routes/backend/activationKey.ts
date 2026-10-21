import { IncomingMessage, ServerResponse } from 'http'

import { prisma } from '../../database/prisma'
import { requireSession } from '../../auth/requireSession'

export async function handleActivationKey(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): Promise<boolean> {
  if (req.method !== 'GET' || !pathname.startsWith('/api/dashboard/networks/')) {
    return false
  }

  const parts = pathname.split('/')

  if (parts.length !== 6 || parts[5] !== 'activation-key') {
    return false
  }

  const networkId = parts[4]

  const user = await requireSession(req.headers.cookie)

  if (!user) {
    res.writeHead(401)

    res.end()

    return true
  }

  const network = await prisma.network.findFirst({
    where: {
      id: networkId,

      ownerId: user.id,
    },

    select: {
      activationKey: true,
    },
  })

  if (!network) {
    res.writeHead(404)

    res.end()

    return true
  }

  res.writeHead(200, {
    'Content-Type': 'application/json',
  })

  res.end(
    JSON.stringify({
      activationKey: network.activationKey,
    }),
  )

  return true
}
