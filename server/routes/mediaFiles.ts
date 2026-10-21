import type { IncomingMessage, ServerResponse } from 'http'
import { readFile, stat } from 'fs/promises'
import { join, relative, resolve, isAbsolute } from 'path'

const MEDIA_ROOT = resolve(process.env.MEDIA_STORAGE_DIR || join(process.cwd(), 'data', 'media'))
const TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' }
const FILE_RE = /^(?:banner|logo)-[a-f0-9]{32}\.(?:png|jpg|webp|gif)$/

export async function handleMediaFile(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<boolean> {
  if (!pathname.startsWith('/media/')) return false
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
    res.end()
    return true
  }

  const parts = pathname.split('/')
  if (parts.length !== 5 || parts[1] !== 'media' || parts[2] !== 'networks' ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(parts[3]) || !FILE_RE.test(parts[4])) {
    res.writeHead(404, { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
    res.end()
    return true
  }

  const filePath = resolve(MEDIA_ROOT, 'networks', parts[3], parts[4])
  const relativePath = relative(MEDIA_ROOT, filePath)
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    res.writeHead(404)
    res.end()
    return true
  }

  try {
    const fileStat = await stat(filePath)
    if (!fileStat.isFile()) throw new Error('NOT_A_FILE')
    const extension = parts[4].split('.').pop() || ''
    const headers = {
      'Content-Type': TYPES[extension],
      'Content-Length': String(fileStat.size),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cross-Origin-Resource-Policy': 'same-site',
    }
    res.writeHead(200, headers)
    if (req.method === 'HEAD') {
      res.end()
      return true
    }
    const data = await readFile(filePath)
    res.end(data)
  } catch {
    if (!res.headersSent) {
      res.writeHead(404, { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
      res.end()
    } else {
      res.destroy()
    }
  }
  return true
}
