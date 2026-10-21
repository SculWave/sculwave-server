import crypto from 'crypto'

export function generateActivationKey(): string {
  return 'ew_live_' + crypto.randomBytes(24).toString('base64url')
}
