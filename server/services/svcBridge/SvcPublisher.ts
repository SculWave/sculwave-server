import {
  AudioFrame,
  AudioSource,
  LocalAudioTrack,
  Room,
  RoomEvent,
  TrackPublishOptions,
  TrackSource,
} from '@livekit/rtc-node'
import { AccessToken } from 'livekit-server-sdk'
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL } from '../../config/env'
import { SVC_SAMPLE_RATE } from '../../config/constants'
import { OpusPcmDecoder } from './opus'
import { error, log } from '@/server/utils/logger'

/** Drop frames instead of queueing without bound if LiveKit cannot keep up (~1 s of audio). */
const MAX_FRAMES_IN_FLIGHT = 50

export type PublisherState = 'connecting' | 'ready' | 'closed'

/**
 * One Simple Voice Chat player, present in the LiveKit room as a normal participant.
 *
 * The participant's identity is the player's Minecraft name - exactly what an app user
 * would have - so the existing proximity / group subscription logic treats them like anyone else.
 */
export class SvcPublisher {
  state: PublisherState = 'connecting'

  private readonly room = new Room()
  private readonly source = new AudioSource(SVC_SAMPLE_RATE, 1)
  private readonly decoder = new OpusPcmDecoder()
  private inFlight = 0

  constructor(
    readonly roomCode: string,
    /** Minecraft name, used verbatim as the LiveKit identity. */
    readonly identity: string,
    private readonly onClosed: (publisher: SvcPublisher) => void,
  ) {}

  async start() {
    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: this.identity,
      name: this.identity,
    })

    // Publish only. Subscriptions are managed by the server for app listeners.
    token.addGrant({
      room: this.roomCode,
      roomJoin: true,
      canPublish: true,
      canSubscribe: false,
    })

    // Fires when LiveKit drops us: network trouble, room deleted, or an app user joined with
    // this same identity (LiveKit keeps the newest connection, so the app user wins).
    this.room.on(RoomEvent.Disconnected, () => {
      if (this.state === 'closed') return
      this.state = 'closed'
      this.release()
      this.onClosed(this)
    })

    try {
      await this.room.connect(LIVEKIT_URL, await token.toJwt(), {
        autoSubscribe: false,
        dynacast: false,
      })

      const track = LocalAudioTrack.createAudioTrack('minecraft-svc', this.source)

      await this.room.localParticipant!.publishTrack(
        track,
        new TrackPublishOptions({ source: TrackSource.SOURCE_MICROPHONE }),
      )

      if (this.state === 'closed') {
        // Closed (by the manager) while we were still connecting.
        await this.room.disconnect()
        return
      }

      this.state = 'ready'
      log('SvcBridge', 'Publishing %s in room %s', this.identity, this.roomCode)
    } catch (err) {
      await this.close()
      throw err
    }
  }

  /** One Opus packet from the Simple Voice Chat mod client. */
  push(packet: Buffer) {
    if (this.state !== 'ready' || this.inFlight >= MAX_FRAMES_IN_FLIGHT) return

    const pcm = this.decoder.decode(packet)
    if (!pcm || pcm.length === 0) return

    this.inFlight++

    this.source
      .captureFrame(new AudioFrame(pcm, SVC_SAMPLE_RATE, 1, pcm.length))
      .catch((err) => error('SvcBridge', 'captureFrame failed for %s: %o', this.identity, err))
      .finally(() => {
        this.inFlight--
      })
  }

  async close() {
    if (this.state === 'closed') return
    this.state = 'closed'

    this.release()

    try {
      await this.source.close()
    } catch {
      // Already closed.
    }

    try {
      await this.room.disconnect()
    } catch {
      // Already disconnected.
    }
  }

  private release() {
    this.decoder.close()
  }
}
