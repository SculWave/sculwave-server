import { validateSession } from './session'

export async function requireSession(cookieHeader?: string) {
  if (!cookieHeader) return null
  const match = cookieHeader.match(/(?:^|;\s*)ew_session=([^;]+)/)
  if (!match) return null
  return validateSession(match[1])
}
