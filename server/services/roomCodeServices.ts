import { roomIndex } from '../state/roomIndex'
import { roomIndexStore } from './roomIndexRedis/RoomIndexStore'

export function generateUniqueCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

  let code = ''

  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  if (roomIndexStore.has(code)) {
    return generateUniqueCode()
  }

  return code
}
