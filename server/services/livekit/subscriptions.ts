import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL } from '../../config/env'
import { AccessToken } from 'livekit-server-sdk'
import { retry } from '../retry'
import { error } from '@/server/utils/logger'

export async function updateSubscriptions(
  roomCode: string,
  listener: string,
  trackSids: string[],
  subscribe: boolean,
) {
  if (trackSids.length === 0) {
    return true
  }

  const url =
    `${LIVEKIT_URL.replace('wss://', 'https://').replace('ws://', 'http://')}` +
    '/twirp/livekit.RoomService/UpdateSubscriptions'

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: 'server',
  })

  at.addGrant({
    roomAdmin: true,
    room: roomCode,
  })

  try {
    const response = await retry(async () => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await at.toJwt()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room: roomCode,
          identity: listener,
          trackSids,
          subscribe,
        }),
      })

      if (
        response.status === 429 ||
        response.status === 500 ||
        response.status === 502 ||
        response.status === 503 ||
        response.status === 504
      ) {
        throw new Error(`UpdateSubscriptions failed: ${response.status}`)
      }

      if (!response.ok) {
        const body = await response.text()

        error('LiveKit', 'UpdateSubscriptions failed (%d): %s', response.status, body)

        return response
      }

      return response
    })

    if (!response.ok) {
      return false
    }

    return true
  } catch (err) {
    error('LiveKit', 'UpdateSubscriptions error for %s: %o', listener, err)

    return false
  }
}
