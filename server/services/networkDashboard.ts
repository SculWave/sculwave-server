import { prisma } from '../database/prisma'

const BACKEND_ONLINE_WINDOW_MS = 30_000

export async function getNetworkDashboard(networkId: string) {
  const network = await prisma.network.findUnique({
    where: {
      id: networkId,
    },
  })

  if (!network) {
    return null
  }

  const backends = await prisma.backend.findMany({
    
    where: {
      networkId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  const cutoff = new Date(Date.now() - BACKEND_ONLINE_WINDOW_MS)

  const onlineBackends = backends.filter(
    (backend) => backend.lastSeen >= cutoff,
  )

  const connectedPlayers = onlineBackends.reduce(
    (sum, backend) => sum + backend.players,
    0,
  )

  return {
    network,
    backends,
    stats: {
      totalServers: backends.length,
      onlineServers: onlineBackends.length,
      connectedPlayers,
    },
  }
}