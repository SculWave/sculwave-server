import crypto from 'crypto'
import { IncomingMessage, ServerResponse } from 'http'

import { prisma } from '../../database/prisma'
import { requireSession } from '../../auth/requireSession'

export async function handleRegenerateActivationKey(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): Promise<boolean> {
  if (req.method !== 'POST' || !pathname.startsWith('/api/dashboard/networks/')) {
    return false
  }

  const parts = pathname.split('/')

  if (parts.length !== 6 || parts[5] !== 'regenerate-key') {
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
  })

  if (!network) {
    res.writeHead(404)

    res.end()

    return true
  }

  const activationKey = 'ew_live_' + crypto.randomBytes(24).toString('hex')

  await prisma.network.update({
    where: {
      id: network.id,
    },

    data: {
      activationKey,
    },
  })

  res.writeHead(200, {
    'Content-Type': 'application/json',
  })

  res.end(
    JSON.stringify({
      success: true,
      activationKey,
    }),
  )

  return true
}
