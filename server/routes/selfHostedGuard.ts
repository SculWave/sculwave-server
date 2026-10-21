import type { IncomingMessage, ServerResponse } from 'http'

import { SELF_HOSTED } from '../config/mode'

/**
 * Self-hosted installs expose only the dashboard and the server API
 * (plugin / Android-app sockets and REST). The marketing site, the browser
 * web client and the legal/docs pages are not served.
 */
const REDIRECT_TO_DASHBOARD = new Set(['/'])

const HIDDEN_PREFIXES = ['/app', '/webapp', '/pricing', '/refund', '/terms', '/privacy', '/docs']

export function handleSelfHostedGuard(
  _req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): boolean {
  if (!SELF_HOSTED) return false

  if (REDIRECT_TO_DASHBOARD.has(pathname)) {
    res.writeHead(302, { Location: '/dashboard' })
    res.end()
    return true
  }

  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found')
    return true
  }

  return false
}
