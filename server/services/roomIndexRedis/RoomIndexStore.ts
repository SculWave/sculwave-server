import { eventBus } from '../redis/EventBus'
import { redis } from '../redis'
import { roomIndex, RoomLocation } from '../../state/roomIndex'
import { log } from '@/server/utils/logger'

const CHANNEL = 'room-index'
const KEY_PREFIX = 'sculwave:room-index'

export interface RoomIndexSyncEvent {
  source: string
  type: 'SET' | 'DELETE'
  roomCode: string
  location?: RoomLocation
}

const PROCESS_ID = crypto.randomUUID()

class RoomIndexStore {
  private backendIndex = new Map<string, string>()

  constructor() {
    void eventBus.subscribe<RoomIndexSyncEvent>(CHANNEL, (event) => {
      if (event.source === PROCESS_ID) return

      switch (event.type) {
        case 'SET':
          log('ROOM', 'REDIS SET', event.roomCode, event.location)

          if (event.location) {
            this.setLocal(event.roomCode, event.location)
          }

          break

        case 'DELETE':
          log('ROOM', 'REDIS DELETE', event.roomCode)
          this.deleteLocal(event.roomCode)
          break
      }
    })
  }

  get(roomCode: string) {
    return roomIndex.get(roomCode)
  }

  has(roomCode: string) {
    return roomIndex.has(roomCode)
  }

  setLocal(roomCode: string, location: RoomLocation) {
    log('ROOM', 'LOCAL SET', roomCode, location)

    roomIndex.set(roomCode, location)

    this.backendIndex.set(
      this.backendKey(location.backendId, location.instanceId),
      roomCode,
    )
  }

  deleteLocal(roomCode: string) {
    const location = roomIndex.get(roomCode)

    if (location) {
      this.backendIndex.delete(
        this.backendKey(location.backendId, location.instanceId),
      )
    }

    log('ROOM', 'LOCAL DELETE', roomCode)

    roomIndex.delete(roomCode)
  }

  async set(roomCode: string, location: RoomLocation) {
    this.setLocal(roomCode, location)

    await redis.set(
      this.redisKey(location.backendId, location.instanceId),
      roomCode,
    )

    await eventBus.publish<RoomIndexSyncEvent>(CHANNEL, {
      source: PROCESS_ID,
      type: 'SET',
      roomCode,
      location,
    })
  }

  async delete(roomCode: string) {
    const location = roomIndex.get(roomCode)

    this.deleteLocal(roomCode)

    if (location) {
      await redis.del(
        this.redisKey(location.backendId, location.instanceId),
      )
    }

    await eventBus.publish<RoomIndexSyncEvent>(CHANNEL, {
      source: PROCESS_ID,
      type: 'DELETE',
      roomCode,
    })
  }

  private backendKey(backendId: string, instanceId: string) {
    return `${instanceId}:${backendId}`
  }

  private redisKey(backendId: string, instanceId: string) {
    return `${KEY_PREFIX}:${instanceId}:${backendId}`
  }

  async findByBackend(
    backendId: string,
    instanceId: string,
  ) {
    const localRoom = this.backendIndex.get(
      this.backendKey(backendId, instanceId),
    )

    if (localRoom) {
      return localRoom
    }

    return await redis.get(
      this.redisKey(backendId, instanceId),
    )
  }
}

export const roomIndexStore = new RoomIndexStore()