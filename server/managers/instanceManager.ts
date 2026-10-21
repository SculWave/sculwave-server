import { instances } from '../state/instance'
import type { InstanceState } from '../types/instance'

export const DEFAULT_INSTANCE_ID = 'standalone'
export const DEFAULT_BACKEND_ID = 'main'

export function getDefaultInstance(): InstanceState {
  let instance = instances.get(DEFAULT_INSTANCE_ID)

  if (!instance) {
    instance = {
      id: DEFAULT_INSTANCE_ID,
      backends: new Map(),
    }
    instances.set(DEFAULT_INSTANCE_ID, instance)
  }

  return instance
}

export function getInstance(instanceId: string): InstanceState | undefined {
  return instances.get(instanceId)
}

export function getOrCreateInstance(instanceId: string): InstanceState {
  let instance = instances.get(instanceId)

  if (!instance) {
    instance = {
      id: instanceId,
      backends: new Map(),
    }

    instances.set(instanceId, instance)
  }

  return instance
}

export function getAllInstances() {
  return instances
}

export function deleteInstance(instanceId: string) {
  instances.delete(instanceId)
}
