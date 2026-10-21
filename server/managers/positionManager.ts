import { CELL_SIZE, VERTICAL_MULTIPLIER, SUBSCRIPTION_DISTANCE } from '../config/constants'
import { updateSubscriptions } from '../services/livekit/subscriptions'
import { roomParticipants } from '../state/participants'
import { VoiceParticipant, SubscriptionUpdate } from '../types/livekit'
import { Player } from '../types/player'
import { getPlayerSubscriptions, getRoomSubscriptions } from './subscriptionManager'

export function diffSubscriptions(current: Set<string>, desired: Set<string>) {
  const add = new Set<string>()
  const remove = new Set<string>()

  for (const identity of desired) {
    if (!current.has(identity)) {
      add.add(identity)
    }
  }

  for (const identity of current) {
    if (!desired.has(identity)) {
      remove.add(identity)
    }
  }

  return { add, remove }
}

export function buildDesiredSubscriptions(roomCode: string, hearMatrix: Map<string, Set<string>>) {
  const participants = roomParticipants.get(roomCode)

  if (!participants) return []

  const updates: {
    listener: string
    add: VoiceParticipant[]
    remove: VoiceParticipant[]
    desired: Set<string>
  }[] = []

  for (const [listener, hearable] of hearMatrix.entries()) {
    const current = getPlayerSubscriptions(roomCode, listener)

    const diff = diffSubscriptions(current, hearable)

    const add: VoiceParticipant[] = []
    const remove: VoiceParticipant[] = []

    for (const identity of diff.add) {
      const participant = participants.get(identity)

      if (participant) {
        add.push(participant)
      }
    }

    for (const identity of diff.remove) {
      const participant = participants.get(identity)
      if (participant) {
        remove.push(participant)
      }
    }

    updates.push({
      listener,
      add,
      remove,
      desired: hearable,
    })
  }

  return updates
}

export function calculateHearablePlayers(players: Player[]): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>()
  const groups = new Map<string, Player[]>()
  const grid = new Map<string, Player[]>()

  for (const player of players) {
    const id = player.gamertag.toLowerCase()

    result.set(id, new Set())

    if (player.groupId) {
      let members = groups.get(player.groupId)
      if (!members) {
        members = []
        groups.set(player.groupId, members)
      }
      members.push(player)
    }

    const cellX = Math.floor((player.x ?? 0) / CELL_SIZE)
    const cellZ = Math.floor((player.z ?? 0) / CELL_SIZE)
    const key = `${player.dimension}:${cellX}:${cellZ}`

    let bucket = grid.get(key)
    if (!bucket) {
      bucket = []
      grid.set(key, bucket)
    }

    bucket.push(player)
  }

  // Party voice (global)
  for (const members of groups.values()) {
    for (const player of members) {
      const hearable = result.get(player.gamertag.toLowerCase())!

      for (const other of members) {
        if (player === other) continue
        hearable.add(other.gamertag.toLowerCase())
      }
    }
  }

  // Proximity voice
  for (const player of players) {
    const hearable = result.get(player.gamertag.toLowerCase())!

    const px = player.x ?? 0
    const py = player.y ?? 0
    const pz = player.z ?? 0

    const cellX = Math.floor(px / CELL_SIZE)
    const cellZ = Math.floor(pz / CELL_SIZE)

    for (let ox = -1; ox <= 1; ox++) {
      for (let oz = -1; oz <= 1; oz++) {
        const key = `${player.dimension}:${cellX + ox}:${cellZ + oz}`
        const candidates = grid.get(key)

        if (!candidates) continue

        for (const other of candidates) {
          if (player === other) continue

          if (player.groupId && other.groupId && player.groupId === other.groupId) {
            continue
          }

          const dx = (other.x ?? 0) - px
          const dy = (other.y ?? 0) - py
          const dz = (other.z ?? 0) - pz

          const horizontal = Math.sqrt(dx * dx + dz * dz)
          const distance = horizontal + Math.abs(dy) * VERTICAL_MULTIPLIER

          if (distance <= SUBSCRIPTION_DISTANCE) {
            hearable.add(other.gamertag.toLowerCase())
          }
        }
      }
    }
  }

  return result
}

export async function applySubscriptionUpdate(roomCode: string, update: SubscriptionUpdate) {
  const addTrackSids: string[] = []
  const removeTrackSids: string[] = []

  for (const participant of update.add) {
    addTrackSids.push(...participant.trackSids)
  }

  for (const participant of update.remove) {
    removeTrackSids.push(...participant.trackSids)
  }

  const addSuccess = await updateSubscriptions(roomCode, update.listener, addTrackSids, true)

  const removeSuccess = await updateSubscriptions(roomCode, update.listener, removeTrackSids, false)

  // Only update the local cache if LiveKit succeeded
  if (!addSuccess || !removeSuccess) {
    return
  }

  const room = getRoomSubscriptions(roomCode)

  room.set(update.listener, new Set(update.desired))
}
