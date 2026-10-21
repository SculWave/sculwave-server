import type { IncomingMessage, ServerResponse } from 'http'
import crypto from 'crypto'
import { SELF_HOSTED } from '../../config/mode'
import { getLocalAdmin } from '../../auth/localUser'
import { createSession, revokeSession } from '../../auth/session'

const COOKIE_NAME = 'ew_session'
const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5
const attempts = new Map<string, { count: number; resetAt: number }>()

function sendJson(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers })
  res.end(JSON.stringify(body))
}
function safeEqual(a: string, b: string) {
  const left = crypto.createHash('sha256').update(a).digest()
  const right = crypto.createHash('sha256').update(b).digest()
  return crypto.timingSafeEqual(left, right)
}
function cookieSecure(req: IncomingMessage) {
  return process.env.COOKIE_SECURE === 'true' || (process.env.COOKIE_SECURE !== 'false' && req.headers['x-forwarded-proto'] === 'https')
}
function cookie(req: IncomingMessage, value: string, maxAge: number) {
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${cookieSecure(req) ? '; Secure' : ''}`
}
function sameOrigin(req: IncomingMessage) {
  const origin = req.headers.origin
  if (!origin) return false
  try { return new URL(origin).host === req.headers.host } catch { return false }
}
async function readBody(req: IncomingMessage): Promise<any> {
  let body = ''
  for await (const chunk of req) {
    body += chunk.toString()
    if (body.length > 8192) throw new Error('BODY_TOO_LARGE')
  }
  return JSON.parse(body || '{}')
}
function clientKey(req: IncomingMessage) {
  // Deliberately do not trust X-Forwarded-For; the app may not be behind a trusted proxy.
  return req.socket.remoteAddress || 'unknown'
}

export async function handleLocalAuth(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<boolean> {
  if (!SELF_HOSTED || !['/api/auth/login', '/api/auth/logout'].includes(pathname)) return false
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' }); return true }
  if (!sameOrigin(req)) { sendJson(res, 403, { error: 'ORIGIN_NOT_ALLOWED' }); return true }

  if (pathname === '/api/auth/login') {
    const username = process.env.DASHBOARD_USERNAME
    const password = process.env.DASHBOARD_PASSWORD
    if (!username || !password || password.length < 14 || password === 'replace-with-a-long-random-password' || password === 'REPLACE_ME_generate_with_openssl_rand_base64_32') {
      sendJson(res, 503, { error: 'AUTH_NOT_CONFIGURED', message: 'Set DASHBOARD_USERNAME and a DASHBOARD_PASSWORD of at least 14 characters in .env.' })
      return true
    }
    const key = clientKey(req)
    const now = Date.now()
    const state = attempts.get(key)
    if (state && state.resetAt > now && state.count >= MAX_ATTEMPTS) {
      res.setHeader('Retry-After', String(Math.ceil((state.resetAt - now) / 1000)))
      sendJson(res, 429, { error: 'TOO_MANY_ATTEMPTS' })
      return true
    }
    try {
      const body = await readBody(req)
      const submittedUser = typeof body.username === 'string' ? body.username : ''
      const submittedPass = typeof body.password === 'string' ? body.password : ''
      const valid = safeEqual(submittedUser, username) && safeEqual(submittedPass, password)
      if (!valid) {
        const current = attempts.get(key)
        attempts.set(key, { count: current && current.resetAt > now ? current.count + 1 : 1, resetAt: current && current.resetAt > now ? current.resetAt : now + WINDOW_MS })
        // Keep the map bounded if an attacker sends many unique source addresses.
        if (attempts.size > 10000) for (const [k, v] of attempts) if (v.resetAt <= now) attempts.delete(k)
        sendJson(res, 401, { error: 'INVALID_CREDENTIALS' })
        return true
      }
      attempts.delete(key)
      const admin = await getLocalAdmin()
      const token = await createSession(admin.id)
      sendJson(res, 200, { success: true }, { 'Set-Cookie': cookie(req, token, 12 * 60 * 60) })
    } catch (err) {
      sendJson(res, err instanceof Error && err.message === 'BODY_TOO_LARGE' ? 413 : 400, { error: 'INVALID_REQUEST' })
    }
    return true
  }

  const match = (req.headers.cookie || '').match(/(?:^|;\s*)ew_session=([^;]+)/)
  if (match) await revokeSession(match[1])
  sendJson(res, 200, { success: true }, { 'Set-Cookie': cookie(req, '', 0) })
  return true
}
