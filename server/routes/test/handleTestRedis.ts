// server/routes/api/debug/handleDistributedTest.ts

import { IncomingMessage, ServerResponse } from 'http'

import { leaderElection } from '@/server/services/leader/LeaderElection'
import { playerBackendStore } from '@/server/services/playerBackend/PlayerbackendStore'
import { roomIndexStore } from '@/server/services/roomIndexRedis/RoomIndexStore'
import { pendingLogoutStore } from '@/server/services/pendingLogoutRedis/pendingLogoutStore'

export async function handleDistributedTest(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): Promise<boolean> {
  if (req.method !== 'POST' || pathname !== '/api/debug/distributed') {
    return false
  }

  const body = await new Promise<string>((resolve) => {
    let data = ''

    req.on('data', (chunk) => {
      data += chunk
    })

    req.on('end', () => {
      resolve(data)
    })
  })

  const { action } = JSON.parse(body)

  switch (action) {
    case 'player-set':
      playerBackendStore.set('jinu', {
        instanceId: process.env.HOSTNAME!,
        backendId: 'backend-1',
        roomCode: 'ROOM1',
        lastSeen: Date.now(),
      })

      break

    case 'player-delete':
      playerBackendStore.delete('jinu')

      break

    case 'room-set':
      await roomIndexStore.set('ROOM1', {
        instanceId: process.env.HOSTNAME!,
        backendId: 'backend-1',
      })

      break

    case 'room-delete':
      await roomIndexStore.delete('ROOM1')

      break

    case 'logout-set':
      await pendingLogoutStore.set('jinu', {
        instanceId: process.env.HOSTNAME!,
        backendId: 'backend-1',
        roomCode: 'ROOM1',
        expiresAt: Date.now() + 5000,
      })

      break

    case 'logout-delete':
      await pendingLogoutStore.delete('jinu')

      break

    default:
      res.writeHead(400)
      res.end('Unknown action')
      return true
  }

  res.writeHead(200, {
    'Content-Type': 'application/json',
  })

  res.end(
    JSON.stringify({
      hostname: process.env.HOSTNAME,
      leader: leaderElection.isLeader(),
      action,
    }),
  )

  return true
}
