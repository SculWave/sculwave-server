export const SUBSCRIPTION_DISTANCE = 100
export const CELL_SIZE = SUBSCRIPTION_DISTANCE
export const VERTICAL_MULTIPLIER = 0.35

// ---------------------------------------------------------------------------
// Simple Voice Chat bridge
// ---------------------------------------------------------------------------

/** Audio format used by Simple Voice Chat: 48 kHz, mono, 20 ms frames. */
export const SVC_SAMPLE_RATE = 48_000
export const SVC_FRAME_SAMPLES = 960

/** Largest valid Opus packet. Anything bigger coming from the plugin is dropped. */
export const SVC_MAX_OPUS_PACKET_BYTES = 1275

/** Cap on bridged Simple Voice Chat players (LiveKit connections) per room. */
export const SVC_MAX_PUBLISHERS_PER_ROOM = 100

/** Frames quieter than this (RMS of 16-bit samples) are treated as silence for app -> SVC audio. */
export const SVC_VOICE_RMS_THRESHOLD = 250

/** Keep sending this many 20 ms frames after the last loud one, so word endings are not clipped. */
export const SVC_VOICE_HANGOVER_FRAMES = 15

/** Stop bridging a room if its backend stops syncing for this long. */
export const SVC_SYNC_TIMEOUT_MS = 15_000

/** Keep the app -> SVC forwarder this long after the last Simple Voice Chat player left. */
export const SVC_IDLE_FORWARDER_MS = 30_000

/** Wait this long before retrying a bridged player whose LiveKit connection failed. */
export const SVC_RETRY_BACKOFF_MS = 5_000
