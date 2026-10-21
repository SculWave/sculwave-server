import type { IncomingMessage, ServerResponse } from 'http'
import Busboy, { type FileInfo } from 'busboy'
import { randomBytes } from 'crypto'
import { mkdir, writeFile, unlink } from 'fs/promises'
import { join, resolve, relative, isAbsolute, basename } from 'path'
import { prisma } from '../../database/prisma'
import { requireSession } from '../../auth/requireSession'
import { fileTypeFromBuffer } from 'file-type'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}
const MEDIA_ROOT = resolve(process.env.MEDIA_STORAGE_DIR || join(process.cwd(), 'data', 'media'))

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  res.end(JSON.stringify(body))
}

function safeLocalMediaPath(imageUrl: string | null | undefined, networkId: string): string | null {
  if (!imageUrl) return null
  try {
    const pathname = new URL(imageUrl, 'http://localhost').pathname
    const match = pathname.match(/^\/media\/networks\/([A-Za-z0-9_-]{1,128})\/((?:banner|logo)-[a-f0-9]{32}\.(?:png|jpg|webp|gif))$/)
    if (!match || match[1] !== networkId) return null
    return join(MEDIA_ROOT, 'networks', networkId, basename(match[2]))
  } catch {
    return null
  }
}

export async function handleNetworkMedia(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): Promise<boolean> {
  if (req.method !== 'POST' || !pathname.startsWith('/api/dashboard/networks/')) return false
  const parts = pathname.split('/')
  if (parts.length !== 6 || (parts[5] !== 'banner' && parts[5] !== 'logo')) return false

  const networkId = parts[4]
  const mediaType = parts[5]
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(networkId)) {
    sendJson(res, 400, { success: false, error: 'INVALID_NETWORK_ID' })
    return true
  }

  const user = await requireSession(req.headers.cookie)
  if (!user) {
    res.writeHead(401, { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
    res.end()
    return true
  }

  const network = await prisma.network.findFirst({ where: { id: networkId, ownerId: user.id } })
  if (!network) {
    res.writeHead(404, { 'Cache-Control': 'no-store' })
    res.end()
    return true
  }

  if (!req.headers['content-type']?.toLowerCase().startsWith('multipart/form-data')) {
    sendJson(res, 400, { success: false, error: 'INVALID_CONTENT_TYPE' })
    return true
  }

  let busboy: ReturnType<typeof Busboy>
  try {
    busboy = Busboy({
      headers: req.headers,
      limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1,
        fields: 10,
        parts: 11,
      },
    })
  } catch (error) {
    console.error('[NetworkMedia] Invalid multipart upload:', error)
    sendJson(res, 400, { success: false, error: 'INVALID_UPLOAD' })
    return true
  }

  let uploadError: string | null = null
  let uploadPromise: Promise<{ filePath: string; imageUrl: string }> | null = null

  busboy.on('file', (fieldName: string, file: NodeJS.ReadableStream, _info: FileInfo) => {
    if (uploadPromise || fieldName !== 'file') {
      uploadError = uploadPromise ? 'TOO_MANY_FILES' : 'INVALID_FILE_FIELD'
      file.resume()
      return
    }

    uploadPromise = (async () => {
      const chunks: Buffer[] = []
      let uploadedSize = 0
      file.on('data', (chunk: Buffer) => {
        uploadedSize += chunk.length
        if (uploadedSize > MAX_FILE_SIZE) uploadError = 'IMAGE_TOO_LARGE'
        chunks.push(chunk)
      })
      file.on('limit', () => { uploadError = 'IMAGE_TOO_LARGE' })
      await new Promise<void>((resolveStream, rejectStream) => {
        file.once('end', resolveStream)
        file.once('error', rejectStream)
      })
      if (uploadError) throw new Error(uploadError)
      if (uploadedSize === 0) throw new Error('NO_IMAGE')

      const buffer = Buffer.concat(chunks)
      const detectedType = await fileTypeFromBuffer(buffer)
      if (!detectedType || !ALLOWED_TYPES[detectedType.mime]) throw new Error('UNSUPPORTED_IMAGE_TYPE')

      const extension = ALLOWED_TYPES[detectedType.mime]
      const filename = `${mediaType}-${randomBytes(16).toString('hex')}.${extension}`
      const directory = join(MEDIA_ROOT, 'networks', networkId)
      const filePath = join(directory, filename)
      const relativePath = relative(MEDIA_ROOT, filePath)
      if (relativePath.startsWith('..') || isAbsolute(relativePath)) throw new Error('INVALID_MEDIA_PATH')

      await mkdir(directory, { recursive: true, mode: 0o750 })
      await writeFile(filePath, buffer, { flag: 'wx', mode: 0o640 })
      return { filePath, imageUrl: `/media/networks/${networkId}/${filename}` }
    })().catch((error: unknown) => {
      uploadError = error instanceof Error ? error.message : 'UPLOAD_FAILED'
      throw error
    })
  })

  busboy.on('filesLimit', () => { uploadError = 'TOO_MANY_FILES' })
  busboy.on('fieldsLimit', () => { uploadError = 'INVALID_UPLOAD' })
  busboy.on('partsLimit', () => { uploadError = 'INVALID_UPLOAD' })
  busboy.on('error', (error: Error) => {
    uploadError = 'INVALID_UPLOAD'
    console.error('[NetworkMedia] Multipart parsing failed:', error)
  })

  busboy.on('finish', async () => {
    let uploaded: { filePath: string; imageUrl: string } | null = null
    try {
      if (!uploadPromise) {
        sendJson(res, 400, { success: false, error: uploadError || 'NO_IMAGE' })
        return
      }
      uploaded = await uploadPromise
      if (uploadError) throw new Error(uploadError)

      const oldImageUrl = mediaType === 'banner' ? network.imageUrl : network.logoUrl
      await prisma.network.update({
        where: { id: network.id },
        data: mediaType === 'banner' ? { imageUrl: uploaded.imageUrl } : { logoUrl: uploaded.imageUrl },
      })

      const oldPath = safeLocalMediaPath(oldImageUrl, networkId)
      if (oldPath && oldPath !== uploaded.filePath) {
        await unlink(oldPath).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== 'ENOENT') console.error('[NetworkMedia] Failed to remove replaced image:', error)
        })
      }

      sendJson(res, 200, { success: true, imageUrl: uploaded.imageUrl })
    } catch (error) {
      if (uploaded?.filePath) await unlink(uploaded.filePath).catch(() => { })
      const code = uploadError || (error instanceof Error ? error.message : 'UPLOAD_FAILED')
      const clientErrors = new Set(['IMAGE_TOO_LARGE', 'UNSUPPORTED_IMAGE_TYPE', 'NO_IMAGE', 'INVALID_FILE_FIELD', 'TOO_MANY_FILES', 'INVALID_UPLOAD'])
      console.error('[NetworkMedia] Failed to save image:', error)
      sendJson(res, clientErrors.has(code) ? 400 : 500, { success: false, error: clientErrors.has(code) ? code : 'UPLOAD_FAILED' })
    }
  })

  req.pipe(busboy)
  return true
}
