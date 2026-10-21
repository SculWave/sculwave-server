import { IncomingMessage, ServerResponse } from 'http'

import { prisma } from '../../database/prisma'

import { requireSession } from '../../auth/requireSession'
import { generateActivationKey, generateInstanceId } from '@/server/utils/id'
import { normalizeNetworkName } from '@/server/utils/networkName'
import { Prisma } from '@/server/generated/prisma/client'

export async function handleCreateNetwork(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): Promise<boolean> {
  if (req.method !== 'POST' || pathname !== '/api/networks') {
    return false
  }

  const user = await requireSession(req.headers.cookie)

  if (!user) {
    res.writeHead(401)

    res.end()

    return true
  }

  let body = ''

  req.on('data', (c) => (body += c))

  req.on('end', async () => {
    try {
      const { name } = JSON.parse(body)

      if (typeof name !== 'string' || name.trim().length < 3 || name.trim().length > 32) {
        res.writeHead(400)

        res.end()

        return
      }

      const network = await prisma.network.create({
        data: {
          ownerId: user.id,
          name: name.trim(),
          nameNormalized: normalizeNetworkName(name),
          instanceId: generateInstanceId(),
          activationKey: generateActivationKey(),
        },
      })

      res.writeHead(201, {
        'Content-Type': 'application/json',
      })

      res.end(JSON.stringify(network))
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        res.writeHead(409, {
          'Content-Type': 'application/json',
        })

        res.end(
          JSON.stringify({
            success: false,
            error: 'NETWORK_NAME_TAKEN',
          }),
        )

        return
      }

      res.writeHead(500)

      res.end()
    }
  })

  return true
}
