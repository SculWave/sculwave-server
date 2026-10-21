import type { Player } from '../types/player'

/**
 * Creates a fast lookup of online players.
 */
export function buildOnlineGamertags(players: Player[]): Set<string> {
  return new Set(players.map((p) => p.gamertag.toLowerCase()))
}

/**
 * Cleans and merges incoming player data while preserving
 * mutable server-side state (currently mute state).
 */
export function sanitizePlayers(incomingPlayers: any[], existingPlayers: Player[]): Player[] {
  return incomingPlayers
    .filter((p: any) => p && typeof p.gamertag === 'string' && p.gamertag.trim().length > 0)
    .map((incomingPlayer: any) => {
      const cleanGamertag = incomingPlayer.gamertag.trim()

      const existing = existingPlayers.find(
        (p) => p.gamertag.toLowerCase() === cleanGamertag.toLowerCase(),
      )

      const cleanPlayer: Player = { gamertag: cleanGamertag }

      if (typeof incomingPlayer.x === 'number' && !Number.isNaN(incomingPlayer.x)) {
        cleanPlayer.x = incomingPlayer.x
      }

      if (typeof incomingPlayer.y === 'number' && !Number.isNaN(incomingPlayer.y)) {
        cleanPlayer.y = incomingPlayer.y
      }

      if (typeof incomingPlayer.z === 'number' && !Number.isNaN(incomingPlayer.z)) {
        cleanPlayer.z = incomingPlayer.z
      }

      if (typeof incomingPlayer.dimension === 'string') {
        cleanPlayer.dimension = incomingPlayer.dimension
      }

      if (typeof incomingPlayer.groupId === 'string') {
        cleanPlayer.groupId = incomingPlayer.groupId
      }

      let muted = existing?.isMuted ?? false

      if (incomingPlayer.isMuted !== undefined) {
        muted = !!incomingPlayer.isMuted
      }

      cleanPlayer.isMuted = muted

      return cleanPlayer
    })
}

/**
 * Returns players that disappeared from the world.
 */
export function detectLoggedOutPlayers(
  previousPlayers: Player[],
  currentPlayers: Player[],
): Player[] {
  return previousPlayers.filter((oldPlayer) => {
    return !currentPlayers.some(
      (newPlayer) =>
        newPlayer.gamertag.trim().toLowerCase() === oldPlayer.gamertag.trim().toLowerCase(),
    )
  })
}

/**
 * Finds a player by gamertag.
 */
export function findPlayer(players: Player[], gamertag: string): Player | undefined {
  return players.find((p) => p.gamertag.toLowerCase() === gamertag.toLowerCase())
}

/**
 * Returns true if player exists in the list.
 */
export function isPlayerOnline(players: Player[], gamertag: string): boolean {
  return players.some((p) => p.gamertag.toLowerCase() === gamertag.toLowerCase())
}

/**
 * Builds a lookup map by lowercase gamertag.
 */
export function buildPlayerMap(players: Player[]): Map<string, Player> {
  const map = new Map<string, Player>()

  for (const player of players) {
    map.set(player.gamertag.toLowerCase(), player)
  }

  return map
}
