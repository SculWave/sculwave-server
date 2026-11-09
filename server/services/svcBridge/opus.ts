import OpusScript from 'opusscript'
import { SVC_FRAME_SAMPLES, SVC_SAMPLE_RATE } from '../../config/constants'

/** Opus packet (as sent by Simple Voice Chat) -> 16-bit mono PCM at 48 kHz. */
export class OpusPcmDecoder {
  private codec: OpusScript | null = new OpusScript(
    SVC_SAMPLE_RATE,
    1,
    OpusScript.Application.VOIP,
  )

  decode(packet: Buffer): Int16Array | null {
    if (!this.codec) return null

    try {
      const pcm = this.codec.decode(packet)

      // Copy into fresh memory: a Buffer's byteOffset is not guaranteed to be 2-byte aligned,
      // which an Int16Array view requires.
      const bytes = new Uint8Array(pcm.length)
      bytes.set(pcm)

      return new Int16Array(bytes.buffer, 0, pcm.length >> 1)
    } catch {
      // Corrupt packet: skip it, the next one will be fine.
      return null
    }
  }

  close() {
    this.codec?.delete()
    this.codec = null
  }
}

/** 16-bit mono PCM (exactly one 20 ms frame) -> Opus packet for Simple Voice Chat. */
export class PcmOpusEncoder {
  private codec: OpusScript | null = new OpusScript(
    SVC_SAMPLE_RATE,
    1,
    OpusScript.Application.VOIP,
  )

  constructor(bitrate = 32_000) {
    this.codec?.setBitrate(bitrate)
  }

  encode(pcm: Int16Array): Buffer | null {
    if (!this.codec || pcm.length !== SVC_FRAME_SAMPLES) return null

    try {
      return this.codec.encode(
        Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength),
        SVC_FRAME_SAMPLES,
      )
    } catch {
      return null
    }
  }

  close() {
    this.codec?.delete()
    this.codec = null
  }
}
