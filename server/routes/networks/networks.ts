import { IncomingMessage, ServerResponse } from 'http'
import { roomStore } from '../../services/roomIndexRedis/RoomStore'
import { prisma } from '../../database/prisma'
import { getEntryPoint } from '../../services/backend/entryPointResolver'
import { roomIndexStore } from '@/server/services/roomIndexRedis/RoomIndexStore'

export async function handleDiscoveryNetworks(
    req: IncomingMessage,
    res: ServerResponse,
    pathname: string,
): Promise<boolean> {
    if (req.method !== 'GET' || pathname !== '/api/discovery/networks') {
        return false
    }

    try {
        const url = new URL(
            req.url ?? '',
            `http://${req.headers.host ?? 'localhost'}`,
        )

        const query = url.searchParams.get('q')?.trim() ?? ''

        const networks = await prisma.network.findMany({
            where: {
                active: true,
                publicListed: true,
                ...(query
                    ? {
                        OR: [
                            {
                                name: {
                                    contains: query,
                                    mode: 'insensitive',
                                },
                            },
                            {
                                description: {
                                    contains: query,
                                    mode: 'insensitive',
                                },
                            },
                        ],
                    }
                    : {}),
            },
            select: {
                id: true,
                name: true,
                description: true,
                imageUrl: true,
                logoUrl: true,

                platformSupport: true,

                javaAddress: true,
                bedrockAddress: true,

                gameVersion: true,
                region: true,

                websiteUrl: true,
                discordUrl: true,
            },
            orderBy: {
                name: 'asc',
            },
        })

        const results = await Promise.all(
            networks.map(async (network) => {
                const entryPoint = await getEntryPoint(network.id)

                if (!entryPoint) {
                    return {
                        id: network.id,
                        name: network.name,
                        description: network.description,
                        imageUrl: network.imageUrl,
                        logoUrl: network.logoUrl,

                        platformSupport: network.platformSupport,

                        javaAddress: network.javaAddress,
                        bedrockAddress: network.bedrockAddress,

                        gameVersion: network.gameVersion,
                        region: network.region,

                        websiteUrl: network.websiteUrl,
                        discordUrl: network.discordUrl,

                        online: false,
                        players: 0,
                        roomCode: null,
                    }
                }

                const roomCode = await roomIndexStore.findByBackend(
                    entryPoint.backend.id,
                    entryPoint.instanceId,
                )

                const room = roomCode
                    ? roomStore.get(roomCode)
                    : undefined

                return {
                    id: network.id,
                    name: network.name,
                    description: network.description,
                    imageUrl: network.imageUrl,
                    logoUrl: network.logoUrl,

                    platformSupport: network.platformSupport,

                    javaAddress: network.javaAddress,
                    bedrockAddress: network.bedrockAddress,

                    gameVersion: network.gameVersion,
                    region: network.region,

                    websiteUrl: network.websiteUrl,
                    discordUrl: network.discordUrl,

                    online: true,
                    players: room?.players.length ?? 0,
                    roomCode: roomCode ?? null,
                }
            }),
        )

        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
        })

        res.end(
            JSON.stringify({
                success: true,
                networks: results,
            }),
        )

        return true
    } catch (error) {
        console.error('[Discovery] Failed to list networks:', error)

        res.writeHead(500, {
            'Content-Type': 'application/json',
        })

        res.end(
            JSON.stringify({
                success: false,
                error: 'INTERNAL_SERVER_ERROR',
            }),
        )

        return true
    }
}