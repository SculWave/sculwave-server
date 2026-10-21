import { IncomingMessage, ServerResponse } from 'http'
import { requireSession } from '../../auth/requireSession'

export async function handleDashboardSession(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): Promise<boolean> {
  if (req.method !== 'GET' || pathname !== '/api/dashboard/session') {
    return false
  }

  const user = await requireSession(req.headers.cookie)

  if (!user) {
    res.writeHead(401)
    res.end()
    return true
  }

  res.writeHead(200, {
    'Content-Type': 'application/json',
  })

  res.end(
    JSON.stringify({
      id: user.id,
      email: user.email,
    }),
  )

  return true
}
