import {
  AudioFrame,
  AudioStream,
  Room,
  RoomEvent,
  TrackKind,
  type RemoteTrack,
} from '@livekit/rtc-node'
import { AccessToken } from 'livekit-server-sdk'
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL } from '../../config/env'
import {
  SVC_FRAME_SAMPLES,
  SVC_SAMPLE_RATE,
  SVC_VOICE_HANGOVER_FRAMES,
  SVC_VOICE_RMS_THRESHOLD,
} from '../../config/constants'
import { PcmOpusEncoder } from './opus'
import { error, log } from '@/server/utils/logger'

/**
 * Same prefix as the SpeakingMonitor. The rest of SculWave already ignores participants
 * whose identity starts with it, so the forwarder never shows up as a player.
 */
export const INTERNAL_IDENTITY_PREFIX = '__SculWave__'

/** Receives one Opus frame of an app player. An empty buffer marks the end of an utterance. */
export type PlaybackSink = (gamertag: string, opus: Buffer) => void

interface Pump {
  /** LiveKit identity as the app joined with it. */
  identity: string
  lower: string
  encoder: PcmOpusEncoder
  /** Collects LiveKit's frames (often 10 ms) into whole 20 ms Opus frames. */
  chunk: Int16Array
  filled: number
  hangover: number
  active: boolean
  stopped: boolean
  stream: AudioStream,
  reader?: ReadableStreamDefaultReader<AudioFrame>
}

function rms(samples: Int16Array): number {
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i]
  }
  return Math.sqrt(sum / samples.length)
}

/**
 * Listens to every app player in a room and forwards what they say (as Opus) to the Minecraft
 * plugin, but only for speakers that at least one Simple Voice Chat player is meant to hear.
 */
export class AppForwarder {
  /** Lower-case identities worth forwarding right now. Maintained by the manager once a second. */
  audience = new Set<string>()
  /** lower-case identity -> Minecraft name as the plugin knows it. */
  names = new Map<string, string>()

  private readonly room = new Room()
  private readonly pumps = new Map<string, Pump>()
  private connected = false

  constructor(
    private readonly roomCode: string,
    private sink: PlaybackSink,
    /** True for identities that are bridged Simple Voice Chat players (never echo them back). */
    private readonly isBridgeIdentity: (lower: string) => boolean,
  ) { }

  setSink(sink: PlaybackSink) {
    this.sink = sink
  }

  async start() {
    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: `${INTERNAL_IDENTITY_PREFIX}:svc:${this.roomCode}`,
    })

    token.addGrant({
      room: this.roomCode,
      roomJoin: true,
      canPublish: false,
      canSubscribe: true,
    })

    this.room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
      if (track.kind !== TrackKind.KIND_AUDIO) return
      this.startPump(participant.identity, track)
    })

    this.room.on(RoomEvent.TrackUnsubscribed, (_track, _publication, participant) => {
      this.stopPump(participant.identity.toLowerCase())
    })

    this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      this.stopPump(participant.identity.toLowerCase())
    })

    this.room.on(RoomEvent.Disconnected, () => {
      this.connected = false
      for (const lower of [...this.pumps.keys()]) this.stopPump(lower)
    })

    await this.room.connect(LIVEKIT_URL, await token.toJwt(), {
      autoSubscribe: true,
      dynacast: false,
    })

    this.connected = true
    log('SvcBridge', 'App forwarder connected room=%s', this.roomCode)
  }

  get isConnected() {
    return this.connected
  }

  /**
   * Is there a LiveKit participant with this name that is NOT the bridge's own publisher for
   * them? That is an app user, and an app user always wins over their bridged self.
   */
  hasAppParticipant(lower: string, bridgeIdentity?: string): boolean {
    for (const participant of this.room.remoteParticipants.values()) {
      const identity = participant.identity

      if (!identity || identity.startsWith(INTERNAL_IDENTITY_PREFIX)) continue
      if (identity.toLowerCase() !== lower) continue
      if (bridgeIdentity !== undefined && identity === bridgeIdentity) continue

      return true
    }

    return false
  }

  async stop() {
    for (const lower of [...this.pumps.keys()]) this.stopPump(lower)

    try {
      await this.room.disconnect()
    } catch {
      // Already disconnected.
    }

    this.connected = false
  }

  // -------------------------------------------------------------------------

  private startPump(identity: string, track: RemoteTrack) {
    const lower = identity.toLowerCase()

    if (!identity || identity.startsWith(INTERNAL_IDENTITY_PREFIX)) return
    if (this.isBridgeIdentity(lower)) return // a Simple Voice Chat player: never loop them back

    this.stopPump(lower)

    const pump: Pump = {
      identity,
      lower,
      encoder: new PcmOpusEncoder(),
      chunk: new Int16Array(SVC_FRAME_SAMPLES),
      filled: 0,
      hangover: 0,
      active: false,
      stopped: false,
      stream: new AudioStream(track, SVC_SAMPLE_RATE, 1),
    }

    this.pumps.set(lower, pump)
    void this.run(pump)
  }

  private stopPump(lower: string) {
    const pump = this.pumps.get(lower)
    if (!pump) return

    this.pumps.delete(lower)
    pump.stopped = true

    this.endUtterance(pump)
    pump.encoder.close()

    // Ends the `for await` loop in run().
    pump.reader?.cancel().catch(() => { })
  }

  private async run(pump: Pump) {
    try {
      const reader = pump.stream.getReader()
      pump.reader = reader

      while (!pump.stopped) {
        const { done, value } = await reader.read()
        if (done || !value) break
        this.handleFrame(pump, value)
      }
    } catch (err) {
      if (!pump.stopped) {
        error('SvcBridge', 'Audio stream failed for %s: %o', pump.identity, err)
      }
    } finally {
      if (this.pumps.get(pump.lower) === pump) {
        this.stopPump(pump.lower)
      }
    }
  }

  private handleFrame(pump: Pump, frame: AudioFrame) {
    // Nobody on Simple Voice Chat is meant to hear this speaker: don't spend CPU or bandwidth.
    if (!this.audience.has(pump.lower)) {
      this.endUtterance(pump)
      pump.filled = 0
      return
    }

    if (frame.channels !== 1) return

    const data = frame.data
    let offset = 0

    while (offset < data.length) {
      const count = Math.min(SVC_FRAME_SAMPLES - pump.filled, data.length - offset)

      pump.chunk.set(data.subarray(offset, offset + count), pump.filled)
      pump.filled += count
      offset += count

      if (pump.filled === SVC_FRAME_SAMPLES) {
        pump.filled = 0
        this.processChunk(pump)
      }
    }
  }

  private processChunk(pump: Pump) {
    if (rms(pump.chunk) >= SVC_VOICE_RMS_THRESHOLD) {
      pump.hangover = SVC_VOICE_HANGOVER_FRAMES
    } else if (pump.hangover > 0) {
      pump.hangover--
    } else {
      this.endUtterance(pump)
      return
    }

    const opus = pump.encoder.encode(pump.chunk)
    if (!opus) return

    pump.active = true
    this.sink(this.nameOf(pump), opus)
  }

  private endUtterance(pump: Pump) {
    if (!pump.active) return

    pump.active = false
    pump.hangover = 0
    this.sink(this.nameOf(pump), Buffer.alloc(0))
  }

  private nameOf(pump: Pump) {
    return this.names.get(pump.lower) ?? pump.identity
  }
}
