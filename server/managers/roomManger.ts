import type { RoomData } from '../types/room'
import type { Player } from '../types/player'

import { generateUniqueCode } from '../services/roomCodeServices'
import {
  DEFAULT_BACKEND_ID,
  DEFAULT_INSTANCE_ID,
  getDefaultInstance,
  getOrCreateInstance,
} from './instanceManager'

import { roomIndexStore } from '../services/roomIndexRedis/RoomIndexStore'
import { roomStore } from '../services/roomIndexRedis/RoomStore'
import { getBackend } from './backendManager'

/**
 * Creates a new room and stores it.
 */
export async function createRoom(
  instanceId: string = DEFAULT_INSTANCE_ID,
  backendId: string = DEFAULT_BACKEND_ID,
) {
  const roomCode = generateUniqueCode()
  const authToken = Math.random().toString(36).substring(2, 15)

  const room: RoomData = {
    roomCode,
    authToken,
    lastSeen: Date.now(),
    players: [],
  }

  const backend = getBackend(backendId, instanceId)
  if (!backend) {
    throw new Error(`Backend '${backendId}' is not registered.`)
  }

  await roomStore.create(room)

  await roomIndexStore.set(roomCode, {
    instanceId,
    backendId,
  })

  return room
}

/**
 * Gets a room.
 */
export function getRoom(roomCode: string) {
  return roomStore.get(roomCode)
}
/**
 * Checks if room exists.
 */
export function roomExists(roomCode: string) {
  return roomStore.has(roomCode)
}

/**
 * Removes a room.
 */
export async function deleteRoom(roomCode: string) {
  roomIndexStore.delete(roomCode)

  await roomStore.delete(roomCode)
}

/**
 * Updates last heartbeat.
 */
export async function touchRoom(roomCode: string) {
  await roomStore.touch(roomCode, Date.now())
}

/**
 * Replaces room players.
 */
export async function updateRoomPlayers(roomCode: string, players: Player[]) {
  const room = roomStore.get(roomCode)

  if (!room) return

  room.players = players
  room.lastSeen = Date.now()

  await roomStore.update(room)
}

/**
 * Validates room token.
 */

export function validateRoomToken(roomCode: string, token: string) {
  const room = roomStore.get(roomCode)

  if (!room) return false

  return room.authToken === token
}

export function getRoomByCode(roomCode: string) {
  return roomStore.get(roomCode)
}

export function getAllRooms(): Iterable<RoomData> {
  return roomStore.getAll()
}
