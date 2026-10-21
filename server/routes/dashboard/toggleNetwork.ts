import { IncomingMessage, ServerResponse } from 'http'

import { prisma } from '../../database/prisma'
import { requireSession } from '../../auth/requireSession'

export async function handleToggleNetwork(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): Promise<boolean> {
  if (req.method !== 'POST' || !pathname.startsWith('/api/dashboard/networks/')) {
    return false
  }

  const parts = pathname.split('/')

  if (parts.length !== 6 || parts[5] !== 'toggle') {
    return false
  }

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
    res.writeHead(404)

    res.end()

    return true
  }

  await prisma.network.update({
    where: {
      id: network.id,
    },

    data: {
      active: !network.active,
    },
  })

  res.writeHead(200, {
    'Content-Type': 'application/json',
  })

  res.end(
    JSON.stringify({
      success: true,
    }),
  )

  return true
}
