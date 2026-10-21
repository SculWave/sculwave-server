import { prisma } from '../database/prisma'
import { backendStore } from './backendRedis/BackendStore'


export async function markBackendOnline(backendId: string) {
  const result = await prisma.backend.updateMany({
    where: {
      backendId,
    },

    data: {
      online: true,
      lastSeen: new Date(),
    },
  })
}

export async function markBackendOffline(backendId: string) {
  const result = await prisma.backend.updateMany({
    where: {
      backendId,
    },

    data: {
      online: false,
    },
  })
}

export async function updateBackendHeartbeat(
  backendId: string,
  instanceId: string,
) {
  const lastSeen = Date.now()

  await prisma.backend.updateMany({
    where: {
      backendId,
    },
    data: {
      lastSeen: new Date(lastSeen),
    },
  })

  await backendStore.touch(
    backendId,
    instanceId,
    lastSeen,
  )
}
