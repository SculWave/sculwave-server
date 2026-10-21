import { prisma } from '../database/prisma'

export interface DashboardStats {
  onlineServers: number
  voiceSessions: number
  connectedPlayers: number
}

const BACKEND_ONLINE_WINDOW_MS = 30_000

export async function getDashboardData(userId: string) {
  const networks = await prisma.network.findMany({
    where: {
      ownerId: userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  const networkIds = networks.map((network) => network.id)

  if (networkIds.length === 0) {
    return {
      networks,
      stats: {
        onlineServers: 0,
        voiceSessions: 0,
        connectedPlayers: 0,
      },
    }
  }

  const cutoff = new Date(Date.now() - BACKEND_ONLINE_WINDOW_MS)

  const onlineBackends = await prisma.backend.findMany({
    where: {
      networkId: {
        in: networkIds,
      },
      lastSeen: {
        gte: cutoff,
      },
    },
    select: {
      players: true,
    },
  })

  const connectedPlayers = onlineBackends.reduce(
    (total, backend) => total + backend.players,
    0,
  )

  return {
    networks,
    stats: {
      onlineServers: onlineBackends.length,
      voiceSessions: onlineBackends.length,
      connectedPlayers,
    },
  }
}