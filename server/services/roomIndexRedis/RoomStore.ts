import { eventBus } from '../redis/EventBus'
import { RoomData } from '../../types/room'
import { rooms } from '../../state/room'

const CHANNEL = 'room'

const SOURCE = process.env.HOSTNAME ?? 'unknown'

export interface RoomSyncEvent {
  source: string

  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'TOUCH'

  roomCode: string

  room?: RoomData

  lastSeen?: number
}

class RoomStore {
  private rooms = new Map<string, RoomData>()

  constructor() {
    void eventBus.subscribe<RoomSyncEvent>(CHANNEL, (event) => {
      if (event.source === SOURCE) {
        return
      }

      switch (event.type) {
        case 'CREATE':
          if (event.room) {
            this.createLocal(event.room)
          }

          break

        case 'UPDATE':
          if (event.room) {
            this.updateLocal(event.room)
          }

          break

        case 'DELETE':
          this.deleteLocal(event.roomCode)

          break

        case 'TOUCH':
          if (event.lastSeen) {
            this.touchLocal(event.roomCode, event.lastSeen)
          }

          break
      }
    })
  }

  get(roomCode: string) {
    return rooms.get(roomCode)
  }

  has(roomCode: string) {
    return rooms.has(roomCode)
  }
  getAll(): Iterable<RoomData> {
    return rooms.values()
  }

  async create(room: RoomData) {
    this.createLocal(room)

    await eventBus.publish<RoomSyncEvent>(CHANNEL, {
      source: SOURCE,
      type: 'CREATE',
      roomCode: room.roomCode,
      room,
    })
  }

  async update(room: RoomData) {
    this.updateLocal(room)

    await eventBus.publish<RoomSyncEvent>(CHANNEL, {
      source: SOURCE,
      type: 'UPDATE',
      roomCode: room.roomCode,
      room,
    })
  }

  async delete(roomCode: string) {
    this.deleteLocal(roomCode)

    await eventBus.publish<RoomSyncEvent>(CHANNEL, {
      source: SOURCE,
      type: 'DELETE',
      roomCode,
    })
  }

  async touch(roomCode: string, lastSeen: number) {
    this.touchLocal(roomCode, lastSeen)

    await eventBus.publish<RoomSyncEvent>(CHANNEL, {
      source: SOURCE,
      type: 'TOUCH',
      roomCode,
      lastSeen,
    })
  }

  createLocal(room: RoomData) {
    rooms.set(room.roomCode, room)
  }

  updateLocal(room: RoomData) {
    rooms.set(room.roomCode, room)
  }

  deleteLocal(roomCode: string) {
    rooms.delete(roomCode)
  }

  touchLocal(roomCode: string, lastSeen: number) {
    const room = rooms.get(roomCode)

    if (!room) {
      return
    }

    room.lastSeen = lastSeen
  }
}

export const roomStore = new RoomStore()
