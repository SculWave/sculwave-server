import { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } from '../../config/env'
import { AccessToken } from 'livekit-server-sdk'
import { retry } from '../retry'
import { error, info } from '@/server/utils/logger'

export async function purgeHangingLiveKitRooms() {
  try {
    info('LiveKit', 'Boot: Scanning for hanging ghost rooms...')

    const baseUrl = LIVEKIT_URL.replace('wss://', 'https://').replace('ws://', 'http://')

    const listUrl = `${baseUrl}/twirp/livekit.RoomService/ListRooms`

    const listAt = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity: 'server_boot' })

    listAt.addGrant({
      roomList: true,
    })

    const response = await retry(async () => {
      const response = await fetch(listUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await listAt.toJwt()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      if (
        response.status === 429 ||
        response.status === 500 ||
        response.status === 502 ||
        response.status === 503 ||
        response.status === 504
      ) {
        throw new Error(`ListRooms failed: ${response.status}`)
      }

      if (!response.ok) {
        const body = await response.text()

        error('LiveKit', 'ListRooms failed (%d): %s', response.status, body)

        return response
      }

      return response
    })

    if (!response.ok) {
      return
    }

    const data = (await response.json()) as any

    if (!data.rooms?.length) {
      info('LiveKit', 'Boot: Clean instance verified. No ghost sessions found.')
      return
    }

    info(
      'LiveKit',
      'Boot: Found %d active rooms on cloud. Purging stale instances...',
      data.rooms.length,
    )

    const deleteUrl = `${baseUrl}/twirp/livekit.RoomService/DeleteRoom`

    for (const room of data.rooms) {
      const delAt = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: 'server_boot',
      })

      delAt.addGrant({
        roomCreate: true,
      })

      await retry(async () => {
        const response = await fetch(deleteUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${await delAt.toJwt()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            room: room.name,
          }),
        })

        if (
          response.status === 429 ||
          response.status === 500 ||
          response.status === 502 ||
          response.status === 503 ||
          response.status === 504
        ) {
          throw new Error(`DeleteRoom failed: ${response.status}`)
        }

        if (!response.ok) {
          const body = await response.text()

          error('LiveKit', 'DeleteRoom failed (%d): %s', response.status, body)

          return response
        }

        return response
      })

      info('LiveKit', 'Purged stale room: %s', room.name)
    }

    info('LiveKit', 'Boot: All hanging ghost channels successfully wiped clean.')
  } catch (err) {
    error('LiveKitBoot', '%o', err)
  }
}

export async function destroyLiveKitRoom(roomCode: string) {
  try {
    const deleteUrl =
      `${LIVEKIT_URL.replace('wss://', 'https://').replace('ws://', 'http://')}` +
      '/twirp/livekit.RoomService/DeleteRoom'

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity: 'server' })

    at.addGrant({
      roomCreate: true,
    })

    const response = await retry(async () => {
      const response = await fetch(deleteUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await at.toJwt()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room: roomCode,
        }),
      })

      // Retry only transient failures
      if (
        response.status === 429 ||
        response.status === 500 ||
        response.status === 502 ||
        response.status === 503 ||
        response.status === 504
      ) {
        throw new Error(`DeleteRoom failed: ${response.status}`)
      }

      // Permanent error
      if (!response.ok) {
        const body = await response.text()

        error('LiveKit', 'DeleteRoom failed (%d): %s', response.status, body)

        return response
      }

      return response
    })

    if (!response.ok) {
      return false
    }

    info('LiveKit', 'Room deleted: %s', roomCode)

    return true
  } catch (err) {
    error('LiveKit', 'DeleteRoom failed for room %s: %o', roomCode, err)

    return false
  }
}
