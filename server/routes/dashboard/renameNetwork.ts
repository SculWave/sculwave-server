import { IncomingMessage, ServerResponse } from 'http'
import { prisma } from '../../database/prisma'
import { requireSession } from '../../auth/requireSession'
import { normalizeNetworkName } from '@/server/utils/networkName'
import { Prisma } from '@/server/generated/prisma/client'

export async function handleRenameNetwork(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): Promise<boolean> {
  if (req.method !== 'POST' || !pathname.startsWith('/api/dashboard/networks/')) {
    return false
  }

  const parts = pathname.split('/')

  if (parts.length !== 6 || parts[5] !== 'rename') {
    return false
  }

  const user = await requireSession(req.headers.cookie)

  if (!user) {
    res.writeHead(401)

    res.end()

    return true
  }

  const networkId = parts[4]

  let body = ''

  req.on('data', (chunk) => (body += chunk))

  req.on('end', async () => {
    try {
      const { name } = JSON.parse(body)

      if (typeof name !== 'string' || name.trim().length < 3 || name.trim().length > 32) {
        res.writeHead(400)

        res.end()

        return
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

        return
      }

      await prisma.network.update({
        where: {
          id: network.id,
        },
        data: {
          name: name.trim(),
          nameNormalized: normalizeNetworkName(name),
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
