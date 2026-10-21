import { eventBus } from '../redis/EventBus'

const CHANNEL = 'backend-owner'

const SOURCE = process.env.HOSTNAME ?? 'unknown'

const owners = new Map<string, string>()

export interface BackendOwnerEvent {
  source: string
  type: 'CLAIM' | 'RELEASE'
  backendId: string
  owner?: string
}

class BackendOwnerStore {
  constructor() {
    void eventBus.subscribe<BackendOwnerEvent>(CHANNEL, (event) => {
      if (event.source === SOURCE) {
        return
      }

      switch (event.type) {
        case 'CLAIM':
          if (event.owner) {
            this.claimLocal(event.backendId, event.owner)
          }

          break

        case 'RELEASE':
          this.releaseLocal(event.backendId)

          break
      }
    })
  }

  get(backendId: string) {
    return owners.get(backendId)
  }

  isMine(backendId: string) {
    return owners.get(backendId) === SOURCE
  }

  claimLocal(backendId: string, owner: string) {
    owners.set(backendId, owner)
  }

  releaseLocal(backendId: string) {
    owners.delete(backendId)
  }

  async claim(backendId: string) {
    this.claimLocal(backendId, SOURCE)

    await eventBus.publish<BackendOwnerEvent>(CHANNEL, {
      source: SOURCE,
      type: 'CLAIM',
      backendId,
      owner: SOURCE,
    })
  }

  async release(backendId: string) {
    this.releaseLocal(backendId)

    await eventBus.publish<BackendOwnerEvent>(CHANNEL, {
      source: SOURCE,
      type: 'RELEASE',
      backendId,
    })
  }
}

export const backendOwnerStore = new BackendOwnerStore()
