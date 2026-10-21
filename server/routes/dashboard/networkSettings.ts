import { IncomingMessage, ServerResponse } from 'http'

import { prisma } from '../../database/prisma'
import { requireSession } from '../../auth/requireSession'
import { normalizeNetworkName } from '../../utils/networkName'
import { Prisma } from '@/server/generated/prisma/client'

export async function handleNetworkSettings(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): Promise<boolean> {
  if (
    req.method !== 'POST' ||
    !pathname.startsWith('/api/dashboard/networks/')
  ) {
    return false
  }

  const parts = pathname.split('/')

  if (parts.length !== 6 || parts[5] !== 'settings') {
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

  let body = ''

  req.on('data', (chunk) => {
    body += chunk
  })

  req.on('end', async () => {
    try {
      const {
        name,
        description,
        imageUrl,
        publicListed,
        platformSupport,
        javaAddress,
        bedrockAddress,
        gameVersion,
        region,
        websiteUrl,
        discordUrl,
      } = JSON.parse(body)

      if (
        typeof name !== 'string' ||
        name.trim().length < 3 ||
        name.trim().length > 32
      ) {
        res.writeHead(400)
        res.end(
          JSON.stringify({
            success: false,
            error: 'INVALID_NAME',
          }),
        )
        return
      }

      if (
        description !== undefined &&
        description !== null &&
        (typeof description !== 'string' ||
          description.trim().length > 500)
      ) {
        res.writeHead(400)
        res.end(
          JSON.stringify({
            success: false,
            error: 'INVALID_DESCRIPTION',
          }),
        )
        return
      }

      if (
        imageUrl !== undefined &&
        imageUrl !== null &&
        (typeof imageUrl !== 'string' ||
          imageUrl.trim().length > 2048)
      ) {
        res.writeHead(400)
        res.end(
          JSON.stringify({
            success: false,
            error: 'INVALID_IMAGE_URL',
          }),
        )
        return
      }

      if (typeof publicListed !== 'boolean') {
        res.writeHead(400)
        res.end(
          JSON.stringify({
            success: false,
            error: 'INVALID_PUBLIC_LISTED',
          }),
        )
        return
      }

      if (
        platformSupport !== 'JAVA_ONLY' &&
        platformSupport !== 'BEDROCK_ONLY' &&
        platformSupport !== 'JAVA_AND_BEDROCK'
      ) {
        res.writeHead(400)
        res.end(
          JSON.stringify({
            success: false,
            error: 'INVALID_PLATFORM_SUPPORT',
          }),
        )
        return
      }

      if (
        javaAddress !== undefined &&
        javaAddress !== null &&
        (typeof javaAddress !== 'string' ||
          javaAddress.trim().length > 255)
      ) {
        res.writeHead(400)
        res.end(
          JSON.stringify({
            success: false,
            error: 'INVALID_JAVA_ADDRESS',
          }),
        )
        return
      }

      if (
        bedrockAddress !== undefined &&
        bedrockAddress !== null &&
        (typeof bedrockAddress !== 'string' ||
          bedrockAddress.trim().length > 255)
      ) {
        res.writeHead(400)
        res.end(
          JSON.stringify({
            success: false,
            error: 'INVALID_BEDROCK_ADDRESS',
          }),
        )
        return
      }

      if (
        gameVersion !== undefined &&
        gameVersion !== null &&
        (typeof gameVersion !== 'string' ||
          gameVersion.trim().length > 64)
      ) {
        res.writeHead(400)
        res.end(
          JSON.stringify({
            success: false,
            error: 'INVALID_GAME_VERSION',
          }),
        )
        return
      }

      if (
        region !== undefined &&
        region !== null &&
        (typeof region !== 'string' ||
          region.trim().length > 64)
      ) {
        res.writeHead(400)
        res.end(
          JSON.stringify({
            success: false,
            error: 'INVALID_REGION',
          }),
        )
        return
      }

      if (
        websiteUrl !== undefined &&
        websiteUrl !== null &&
        (typeof websiteUrl !== 'string' ||
          websiteUrl.trim().length > 2048)
      ) {
        res.writeHead(400)
        res.end(
          JSON.stringify({
            success: false,
            error: 'INVALID_WEBSITE_URL',
          }),
        )
        return
      }

      if (
        discordUrl !== undefined &&
        discordUrl !== null &&
        (typeof discordUrl !== 'string' ||
          discordUrl.trim().length > 2048)
      ) {
        res.writeHead(400)
        res.end(
          JSON.stringify({
            success: false,
            error: 'INVALID_DISCORD_URL',
          }),
        )
        return
      }

      await prisma.network.update({
        where: {
          id: network.id,
        },
        data: {
          name: name.trim(),
          nameNormalized: normalizeNetworkName(name),

          description:
            typeof description === 'string'
              ? description.trim() || null
              : null,

          imageUrl:
            typeof imageUrl === 'string'
              ? imageUrl.trim() || null
              : null,

          publicListed,

          platformSupport,

          javaAddress:
            typeof javaAddress === 'string'
              ? javaAddress.trim() || null
              : null,

          bedrockAddress:
            typeof bedrockAddress === 'string'
              ? bedrockAddress.trim() || null
              : null,

          gameVersion:
            typeof gameVersion === 'string'
              ? gameVersion.trim() || null
              : null,

          region:
            typeof region === 'string'
              ? region.trim() || null
              : null,

          websiteUrl:
            typeof websiteUrl === 'string'
              ? websiteUrl.trim() || null
              : null,

          discordUrl:
            typeof discordUrl === 'string'
              ? discordUrl.trim() || null
              : null,
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

      console.error('[NetworkSettings] Failed to update network:', error)

      res.writeHead(400, {
        'Content-Type': 'application/json',
      })

      res.end(
        JSON.stringify({
          success: false,
          error: 'BAD_REQUEST',
        }),
      )
    }
  })

  return true
}