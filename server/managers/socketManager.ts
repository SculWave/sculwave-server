import { playerSockets } from '../state/socketIndex'

export function registerPlayerSocket(gamertag: string, socketId: string) {
  playerSockets.set(gamertag.toLowerCase(), socketId)
}

export function unregisterPlayerSocket(gamertag: string) {
  playerSockets.delete(gamertag.toLowerCase())
}

export function getPlayerSocketId(gamertag: string) {
  return playerSockets.get(gamertag.toLowerCase())
}
