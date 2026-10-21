import { roomSubscriptions } from '../state/subscription'

export function getRoomSubscriptions(roomCode: string) {
  let room = roomSubscriptions.get(roomCode)

  if (!room) {
    room = new Map()
    roomSubscriptions.set(roomCode, room)
  }

  return room
}

export function getPlayerSubscriptions(roomCode: string, identity: string) {
  const room = getRoomSubscriptions(roomCode)

  let subscriptions = room.get(identity)

  if (!subscriptions) {
    subscriptions = new Set<string>()
    room.set(identity, subscriptions)
  }

  return subscriptions
}
