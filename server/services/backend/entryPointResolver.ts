import { prisma } from '../../database/prisma'
import { backendStore } from '../backendRedis/BackendStore'

function isBackendOnline(lastSeen: number) {
  return Date.now() - lastSeen < 30_000
}

export async function getEntryPoint(networkId: string) {
  const backends = await backendStore.getGlobalBackends()

  const onlineEntryPoints = backends.filter(
    ({ backend }) =>
      backend.entryPoint &&
      backend.entryPointPriority !== null &&
      isBackendOnline(backend.lastSeen),
  )

  if (onlineEntryPoints.length === 0) {
    return undefined
  }

  const backendIds = onlineEntryPoints.map(({ backend }) => backend.id)

  const databaseBackends = await prisma.backend.findMany({
    where: {
      networkId,
      backendId: { in: backendIds },
    },
    select: {
      backendId: true,
    },
  })

  const validIds = new Set(
    databaseBackends.map((backend) => backend.backendId),
  )

  return onlineEntryPoints
    .filter(({ backend }) => validIds.has(backend.id))
    .sort((a, b) => {
      const priorityA = a.backend.entryPointPriority!
      const priorityB = b.backend.entryPointPriority!

      if (priorityA !== priorityB) {
        return priorityA - priorityB
      }

      return a.backend.id.localeCompare(b.backend.id)
    })[0]
}