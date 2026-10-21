import { AccessToken } from 'livekit-server-sdk'
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET } from '../config/env'

export async function generateLiveKitToken(roomCode: string, gamertag: string): Promise<string> {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: gamertag,
    name: gamertag,
  })
  at.addGrant({
    roomJoin: true,
    room: roomCode,
    canPublish: true,
    canSubscribe: true,
  })
  return await at.toJwt()
}
