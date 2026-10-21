import { prisma } from '../database/prisma'
import { backendStore } from '../services/backendRedis/BackendStore'
import { BackendEntry, BackendState } from '../state/backend'
import { RoomData } from '../types/room'

import {
  DEFAULT_INSTANCE_ID,
  getAllInstances,
  getInstance,
  getOrCreateInstance,
} from './instanceManager'

export const DEFAULT_BACKEND_ID = 'main'

/**
 * Registers a backend if it doesn't exist.
 */
// export async function registerBackend(
//   backendId: string = DEFAULT_BACKEND_ID,
//   instanceId: string = DEFAULT_INSTANCE_ID,
// ): Promise<BackendState> {
//   const existing = getBackend(backendId, instanceId)

//   if (existing) {
//     return existing
//   }

//   const instance = getOrCreateInstance(instanceId)

//   const backend: BackendState = {
//     id: backendId,
//     createdAt: Date.now(),
//     lastSeen: Date.now(),
//     entryPoint: false,
//     entryPointPriority: null,
//   }

//   await backendStore.register(backend, instanceId)

//   return backend
// }




export async function registerBackend(
  backendId: string = DEFAULT_BACKEND_ID,
  instanceId: string = DEFAULT_INSTANCE_ID,
): Promise<BackendState> {
  const existing = getBackend(backendId, instanceId)

  if (existing) {
    return existing
  }

  const instance = getOrCreateInstance(instanceId)

  const backendConfig = await prisma.backend.findUnique({
    where: {
      backendId,
    },
    select: {
      entryPoint: true,
      entryPointPriority: true,
    },
  })

  const backend: BackendState = {
    id: backendId,
    createdAt: Date.now(),
    lastSeen: Date.now(),
    entryPoint: backendConfig?.entryPoint ?? false,
    entryPointPriority: backendConfig?.entryPointPriority ?? null,
  }

  await backendStore.register(backend, instanceId)

  return backend
}





/**
 * Returns backend.
 */
export function getBackend(
  backendId: string = DEFAULT_BACKEND_ID,
  instanceId: string = DEFAULT_INSTANCE_ID,
) {
  return getOrCreateInstance(instanceId).backends.get(backendId)
}

/**
 * Updates heartbeat.
 */
export async function touchBackend(
  backendId: string = DEFAULT_BACKEND_ID,
  instanceId: string = DEFAULT_INSTANCE_ID,
) {
  const backend = getBackend(backendId, instanceId)

  if (!backend) return

  await backendStore.touch(backendId, instanceId, Date.now())
}

/**
 * Removes backend.
 */
export async function removeBackend(
  backendId: string = DEFAULT_BACKEND_ID,
  instanceId: string = DEFAULT_INSTANCE_ID,
) {
  await backendStore.remove(backendId, instanceId)
}

/**
 * Checks existence.
 */
export function backendExists(
  backendId: string = DEFAULT_BACKEND_ID,
  instanceId: string = DEFAULT_INSTANCE_ID,
) {
  return getOrCreateInstance(instanceId).backends.has(backendId)
}

/**
 * Returns every backend.
 */
export function getBackends(instanceId: string = DEFAULT_INSTANCE_ID) {
  return getOrCreateInstance(instanceId).backends
}

export function getAllBackends(): BackendEntry[] {
  const result: BackendEntry[] = []

  for (const [instanceId, instance] of getAllInstances()) {
    for (const backend of instance.backends.values()) {
      result.push({
        instanceId,
        backend,
      })
    }
  }

  return result
}
