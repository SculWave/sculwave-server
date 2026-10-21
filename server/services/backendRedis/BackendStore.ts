import { eventBus } from '../redis/EventBus'
import { redis } from '../redis'
import { BackendState } from '../../state/backend'
import { DEFAULT_INSTANCE_ID, getOrCreateInstance } from '../../managers/instanceManager'

const CHANNEL = 'backend'

const SOURCE = process.env.HOSTNAME ?? 'unknown'
const KEY_PREFIX = 'sculwave:backend'

export interface BackendSyncEvent {
  source: string
  type: 'REGISTER' | 'REMOVE' | 'TOUCH'
  instanceId: string
  backendId: string
  backend?: BackendState
  lastSeen?: number
}

class BackendStore {
  constructor() {
    void eventBus.subscribe<BackendSyncEvent>(CHANNEL, (event) => {
      if (event.source === SOURCE) {
        return
      }

      switch (event.type) {
        case 'REGISTER':
          if (event.backend) {
            this.registerLocal(event.backend, event.instanceId)
          }
          break

        case 'REMOVE':
          this.removeLocal(event.backendId, event.instanceId)
          break

        case 'TOUCH':
          if (event.lastSeen) {
            this.touchLocal(event.backendId, event.instanceId, event.lastSeen)
          }
          break
      }
    })
  }

  async register(backend: BackendState, instanceId: string) {
    this.registerLocal(backend, instanceId)

    await redis.set(
      this.redisKey(backend.id, instanceId),
      JSON.stringify(backend),
    )

    await eventBus.publish<BackendSyncEvent>(CHANNEL, {
      source: SOURCE,
      type: 'REGISTER',
      instanceId,
      backendId: backend.id,
      backend,
    })
  }

  async remove(backendId: string, instanceId: string) {
    this.removeLocal(backendId, instanceId)

    await redis.del(this.redisKey(backendId, instanceId))

    await eventBus.publish<BackendSyncEvent>(CHANNEL, {
      source: SOURCE,
      type: 'REMOVE',
      instanceId,
      backendId,
    })
  }

  async touch(backendId: string, instanceId: string, lastSeen: number) {
    this.touchLocal(backendId, instanceId, lastSeen)

    const backend = this.get(backendId, instanceId)

    if (backend) {
      await redis.set(
        this.redisKey(backendId, instanceId),
        JSON.stringify(backend),
      )
    }

    await eventBus.publish<BackendSyncEvent>(CHANNEL, {
      source: SOURCE,
      type: 'TOUCH',
      instanceId,
      backendId,
      lastSeen,
    })
  }

  get(
    backendId: string,
    instanceId: string = DEFAULT_INSTANCE_ID,
  ) {
    return getOrCreateInstance(instanceId).backends.get(backendId)
  }

  async getGlobalBackends() {
    const keys = await redis.keys(`${KEY_PREFIX}:*`)
    const backends: Array<{
      instanceId: string
      backend: BackendState
    }> = []

    for (const key of keys) {
      const value = await redis.get(key)

      if (!value) {
        continue
      }

      try {
        const backend = JSON.parse(value) as BackendState
        const [, , instanceId] = key.split(':')

        if (!instanceId) {
          continue
        }

        backends.push({
          instanceId,
          backend,
        })
      } catch {
        continue
      }
    }

    return backends
  }

  registerLocal(backend: BackendState, instanceId: string) {
    getOrCreateInstance(instanceId).backends.set(backend.id, backend)
  }

  removeLocal(backendId: string, instanceId: string) {
    getOrCreateInstance(instanceId).backends.delete(backendId)
  }

  touchLocal(
    backendId: string,
    instanceId: string,
    lastSeen: number,
  ) {
    const backend = this.get(backendId, instanceId)

    if (!backend) {
      return
    }

    backend.lastSeen = lastSeen
  }

  private redisKey(backendId: string, instanceId: string) {
    return `${KEY_PREFIX}:${instanceId}:${backendId}`
  }
}

export const backendStore = new BackendStore()