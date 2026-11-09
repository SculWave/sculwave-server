// Minimal typings for the parts of `opusscript` the Simple Voice Chat bridge uses.
declare module 'opusscript' {
  class OpusScript {
    constructor(samplingRate: number, channels: number, application?: number)
    encode(buffer: Buffer, frameSize: number): Buffer
    decode(buffer: Buffer): Buffer
    setBitrate(bitrate: number): void
    delete(): void
    static Application: { VOIP: number; AUDIO: number; RESTRICTED_LOWDELAY: number }
  }

  export = OpusScript
}
