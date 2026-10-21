/**
 * Deployment mode flags.
 *
 * SELF_HOSTED=true  -> community edition: no billing or plan limits,
 *                      no telemetry/operations dashboard.
 * SELF_HOSTED unset -> hosted edition: behaves exactly as before.
 *
 * Read at runtime (not build time), so one image works for both editions.
 */

function flag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
}

export const SELF_HOSTED = flag(process.env.SELF_HOSTED, false)

/**
 * Internal operations telemetry (NOC dashboard, /telemetry socket namespace,
 * /api/telemetry/* routes, Redis telemetry state, node metrics polling).
 * Off by default when self-hosted; operators can opt in with TELEMETRY_ENABLED=true.
 */
export const TELEMETRY_ENABLED = flag(process.env.TELEMETRY_ENABLED, !SELF_HOSTED)

/**
 * Public address of this server (what players/plugins/apps should use),
 * e.g. http://localhost:3000, http://192.168.1.20:3000 or https://voice.example.com
 * Shown in the dashboard's plugin setup page. Self-hosted only.
 */
export const PUBLIC_URL = (
  process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`
).replace(/\/+$/, '')
