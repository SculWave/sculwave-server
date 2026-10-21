import type { IncomingMessage, ServerResponse } from 'http'
import { SELF_HOSTED } from '../../config/mode'
import { requireSession } from '../../auth/requireSession'

const protectedPages = ['/dashboard', '/telemetry']
const protectedApi = ['/api/dashboard', '/api/telemetry', '/api/debug', '/api/networks']

export async function handleSelfHostedAccess(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<boolean> {
  if (!SELF_HOSTED) return false
  const isApi = protectedApi.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
  const isPage = protectedPages.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
  if (!isApi && !isPage) return false
  res.setHeader('Cache-Control', 'no-store')
  const user = await requireSession(req.headers.cookie)
  if (user) {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method || 'GET')) {
      const origin = req.headers.origin
      let validOrigin = false
      try { validOrigin = Boolean(origin && req.headers.host && new URL(origin).host === req.headers.host) } catch { validOrigin = false }
      if (!validOrigin) {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
        res.end(JSON.stringify({ error: 'ORIGIN_NOT_ALLOWED' }))
        return true
      }
    }
    return false
  }
  if (isApi) {
    res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
    res.end(JSON.stringify({ error: 'UNAUTHORIZED' }))
  } else {
    res.writeHead(302, { Location: '/login', 'Cache-Control': 'no-store' })
    res.end()
  }
  return true
}
