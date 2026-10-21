import crypto from 'crypto'

export function generateInstanceId() {
  return 'ew_' + crypto.randomBytes(12).toString('hex')
}

export function generateActivationKey() {
  return 'ew_live_' + crypto.randomBytes(32).toString('hex')
}
