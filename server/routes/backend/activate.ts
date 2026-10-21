import crypto from 'crypto'
import { IncomingMessage, ServerResponse } from 'http'

import { prisma } from '../../database/prisma'
import { error, info, log } from '@/server/utils/logger'

export async function handleBackendActivate(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): Promise<boolean> {
  log('BackendActivate', 'ENTER %s %s', req.method, pathname)

  if (req.method !== 'POST' || pathname !== '/api/backend/activate') {
    return false
  }

  log('BackendActivate', 'MATCHED ROUTE')
  let body = ''

  req.on('data', (chunk) => {
    log('BackendActivate', 'DATA %d', chunk.length)
    body += chunk
  })

  req.on('end', async () => {
    log('BackendActivate', 'END %s', body)
    try {
      const {
        activationKey,
        backendId,
        serverName,
        platform,
        pluginVersion,
        minecraftVersion,
        entryPoint,
        entryPointPriority,
      } = JSON.parse(body)

      if (typeof activationKey !== 'string' || activationKey.length === 0) {
        res.writeHead(400)
        res.end()
        return
      }

      const network = await prisma.network.findUnique({
        where: {
          activationKey,
        },
      })

      if (!network || !network.active) {
        res.writeHead(401)

        res.end(
          JSON.stringify({
            success: false,
            message: 'Invalid activation key.',
          }),
        )

        return
      }

      let backend = null

      if (backendId) {
        backend = await prisma.backend.findUnique({
          where: {
            backendId,
          },
        })
      }

      if (backend) {
        backend = await prisma.backend.update({
          where: {
            backendId: backend.backendId,
          },

          data: {
            name: serverName,
            platform,
            pluginVersion,
            mcVersion: minecraftVersion,
            entryPoint: entryPoint === true,
            entryPointPriority:
              entryPoint === true && Number.isInteger(entryPointPriority) && entryPointPriority >= 1
                ? entryPointPriority
                : null,
            online: true,
            lastSeen: new Date(),
          }
        })
      } else {
        backend = await prisma.backend.create({
          data: {
            backendId: crypto.randomUUID(),
            networkId: network.id,
            name: serverName,
            platform,
            pluginVersion,
            mcVersion: minecraftVersion,
            entryPoint: entryPoint === true,
            entryPointPriority:
              entryPoint === true && Number.isInteger(entryPointPriority) && entryPointPriority >= 1
                ? entryPointPriority
                : null,
            online: true,
            lastSeen: new Date(),
          }
        })
      }

      const verify = await prisma.backend.findUnique({
        where: {
          backendId: backend.backendId,
        },
      })

      log('Verify', '%o', verify)

      info('Activate', 'Created/Found backend: %o', {
        backendId: backend.backendId,
        networkId: network.id,
      })

      res.writeHead(200, {
        'Content-Type': 'application/json',
      })

      res.end(
        JSON.stringify({
          success: true,

          backendId: backend.backendId,

          instanceId: network.instanceId,

          heartbeatInterval: 15000,
        }),
      )
    } catch (err) {
      error('Server', '%o', err)

      res.writeHead(500, {
        'Content-Type': 'application/json',
      })

      res.end(
        JSON.stringify({
          success: false,
          message: 'Internal server error.',
        }),
      )
    }
  })

  return true
}
