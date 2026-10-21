import type { IncomingMessage, ServerResponse } from 'http'

import { SELF_HOSTED } from '../config/mode'

/**
 * Self-hosted installs expose only the dashboard, the server APIs and the
 * sockets the Minecraft plugin / mobile app talk to. Everything that belongs
 * to the hosted product website is switched off here, in one place, before
 * Next.js renders anything.
 *
 *   /            -> redirected to /dashboard
 *   /login       -> local password sign-in page
 *   the rest     -> 404
 */
const REDIRECT_TO_DASHBOARD = new Set(['/'])

const HIDDEN_PREFIXES = [
  '/webapp', // browser voice client
  '/app', // browser voice client / discovery UI
  '/docs',
  '/terms',
  '/privacy',
  '/pricing',
  '/refund',
]

const HIDDEN_EXACT = new Set(['/sitemap.xml', '/BingSiteAuth.xml'])

function isHidden(pathname: string): boolean {
  if (HIDDEN_EXACT.has(pathname)) return true

  return HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/** Returns true when the request was answered here. */
export function handleSelfHostedGate(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): boolean {
  if (!SELF_HOSTED) return false

  if (req.method === 'GET' || req.method === 'HEAD') {
    if (REDIRECT_TO_DASHBOARD.has(pathname)) {
      res.writeHead(302, { Location: '/dashboard' })
      res.end()
      return true
    }
  }

  if (isHidden(pathname)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Not found')
    return true
  }

  return false
}
