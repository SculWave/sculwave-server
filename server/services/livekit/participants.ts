import { LiveKitParticipantsResponse, VoiceParticipant } from '../../types/livekit'
import { retry } from '../retry'
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL } from '../../config/env'
import { AccessToken } from 'livekit-server-sdk'
import { roomParticipants } from '../../state/participants'
import { error, info, log } from '@/server/utils/logger'

export async function listParticipants(
  roomCode: string,
): Promise<LiveKitParticipantsResponse | null> {
  const url =
    `${LIVEKIT_URL.replace('wss://', 'https://').replace('ws://', 'http://')}` +
    '/twirp/livekit.RoomService/ListParticipants'

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity: 'server' })

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
        }),
      })

      // Room does not exist yet.
      // This is a perfectly valid state, so don't retry.
      if (response.status === 404) {
        return response
      }

      // Retry only transient server failures.
      if (
        response.status === 429 ||
        response.status === 500 ||
        response.status === 502 ||
        response.status === 503 ||
        response.status === 504
      ) {
        throw new Error(`ListParticipants failed: ${response.status}`)
      }

      // Any other error is logged once and returned.
      if (!response.ok) {
        const body = await response.text()

        error('LiveKit', 'ListParticipants failed (%d): %s', response.status, body)
        return response
      }

      return response
    })

    if (response.status === 404) return null
    if (!response.ok) return null

    const body = await response.json()

    log(
      'LiveKit',
      'HTTP %d participants=%d',
      response.status,
      body.participants?.length ?? 0,
    )

    return body as LiveKitParticipantsResponse
  } catch (err) {
    error('LiveKit', 'ListParticipants failed for room %s: %o', roomCode, err)

    return null
  }
}

export async function refreshParticipantCache(roomCode: string) {
  log('LiveKit', 'Refresh %s', roomCode)

  const response = await listParticipants(roomCode)

  log('LiveKit', 'Response %s %o', roomCode, response)

  if (!response?.participants) {
    roomParticipants.delete(roomCode)
    return
  }

  const participants = new Map<string, VoiceParticipant>()

  for (const participant of response.participants) {
    const voiceParticipant: VoiceParticipant = {
      identity: participant.identity.toLowerCase(),
      trackSids: [],
    }

    for (const track of participant.tracks ?? []) {
      if (track.type === 'MICROPHONE') {
        voiceParticipant.trackSids.push(track.sid)
      }
    }

    participants.set(voiceParticipant.identity, voiceParticipant)
  }
  log('ParticipantCache', '%s %d', roomCode, participants.size)

  roomParticipants.set(roomCode, participants)
}

export async function kickLiveKitParticipant(roomCode: string, gamertag: string) {
  try {
    const url = `${LIVEKIT_URL.replace('wss://', 'https://').replace('ws://', 'http://')}/twirp/livekit.RoomService/RemoveParticipant`
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity: 'server' })
    at.addGrant({ roomAdmin: true, room: roomCode })

    await retry(async () => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await at.toJwt()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room: roomCode,
          identity: gamertag,
        }),
      })

      if (!response.ok) {
        if (response.status === 404) {
          log('LiveKit', 'Participant %s already gone', gamertag)
          return
        }

        throw new Error(`RemoveParticipant failed: ${response.status}`)
      }
    })
    info('LiveKit', 'Forcefully disconnected left player: %s', gamertag)
  } catch (e) {
    /* Ignore if already disconnected */
  }
}
