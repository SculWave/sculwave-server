export const LIVEKIT_URL = process.env.LIVEKIT_URL!
export const LIVEKIT_PUB_URL = process.env.LIVEKIT_PUB_URL!
export const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY!
export const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET!

/**
 * Simple Voice Chat bridge. On by default; it only does anything when a SculWave plugin
 * reports Simple Voice Chat players. Set SVC_BRIDGE_ENABLED=false to turn it off completely.
 */
export const SVC_BRIDGE_ENABLED = process.env.SVC_BRIDGE_ENABLED !== 'false'
