import 'dotenv/config'
import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server } from 'socket.io'

import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from './types/socket'

import { registerSocketHandlers } from './sockets'
import { handleApiRoutes } from './routes'
import { handleSelfHostedGate } from './routes/selfHostedGate'
import {
  startLifecycleWorkers,
  registerShutdownHandlers,
  initializeServer,
} from './tasks/lifecycle'
import { connectRedisServices, pubsub } from './services/redis'
import { leaderElection } from './services/leader/LeaderElection'
import { attachSocketAdapter } from './services/redis/socketAdapter'
import { error, info, log } from './utils/logger'
import { registerBackendSocketHandlers } from './sockets/backend'
import { registerPlayerEventHandler } from './sockets/playerEventHandler'

import { TELEMETRY_ENABLED } from './config/mode'
import { handleSelfHostedGuard } from './routes/selfHostedGuard'
import { handleLocalAuth } from './routes/auth/localAuth'
import { handleSelfHostedAccess } from './routes/auth/selfHostedAccess'
import { handleMediaFile } from './routes/mediaFiles'

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

//MAIN ALL WORKING BLOCK

app.prepare().then(async () => {
  await connectRedisServices()
  await leaderElection.start()


  const httpServer = createServer(async (req, res) => {
    log('HTTP', 'Incoming %s %s', req.method, req.url)

    res.on('finish', () => {
      log('HTTP', 'Finished %d', res.statusCode)
    })

    res.on('close', () => {
      log('HTTP', 'Response closed')
    })

    const parsedUrl = parse(req.url || '', true)
    const { pathname } = parsedUrl

    if (await handleMediaFile(req, res, pathname ?? '')) return

    if (await handleLocalAuth(req, res, pathname ?? '')) return

    if (handleSelfHostedGate(req, res, pathname ?? '')) return

    if (await handleSelfHostedAccess(req, res, pathname ?? '')) return

    if (handleSelfHostedGuard(req, res, pathname ?? '')) return

    if (await handleApiRoutes(req, res, pathname ?? '', io)) return

    handle(req, res, parsedUrl)
  })


  process.on('uncaughtException', (err) => {
    error('Process', 'UNCAUGHT %o', err)
  })

  process.on('unhandledRejection', (err) => {
    error('Process', 'UNHANDLED %o', err)
  })

  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    httpServer,
    {
      cors: { origin: '*' },
    },
  )
  const socketAdapter = await attachSocketAdapter(io)

  registerSocketHandlers(io)
  registerBackendSocketHandlers(io)
  registerPlayerEventHandler(io)


  startLifecycleWorkers(io)
  registerShutdownHandlers(io, httpServer, socketAdapter)

  setInterval(async () => {
    const sockets = await io.fetchSockets()

    log('SocketAdapter', 'Known sockets=%d', sockets.length)
  }, 10000)

  const PORT = process.env.PORT || 3000
  httpServer.listen(PORT, async () => {
    log('Server', 'Instance: %s', process.env.HOSTNAME)
    info('Server', 'Server version: 2')
    info('Server', '🚀 Unified Next.js Proximity Voice Engine running on port %d', PORT)
    initializeServer()
  })
})
