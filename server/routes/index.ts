import type { IncomingMessage, ServerResponse } from 'http'

import { Server } from 'socket.io'

import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../types/socket'

import { handleDashboardSession } from './dashboard/session'
import { handleGetNetworks } from './dashboard/networks'
import { handleCreateNetwork } from './networks/createNetwork'
import { handleBackendActivate } from './backend/activate'
import { handleActivationKey } from './backend/activationKey'
import { handleRegenerateActivationKey } from './backend/regenerateActivationKey'
import { handleRenameNetwork } from './dashboard/renameNetwork'
import { handleToggleNetwork } from './dashboard/toggleNetwork'
import { handleDeleteNetwork } from './dashboard/deleteNetwork'
import { handleHealth } from './health'
import { handleDistributedTest } from './test/handleTestRedis'
import { handleSocketDebug } from './test/handleSocketDebug'
import { handleNetworkSettings } from './dashboard/networkSettings'
import { handleDiscoveryNetworks } from './networks/networks'
import { handleResolveNetwork } from './networks/resolve'
import { handleNetworkMedia } from './dashboard/networkMedia'
import { handleDownloadPlugin } from './handleDownloadPlugin'
import { TELEMETRY_ENABLED } from '../config/mode'

export async function handleApiRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
): Promise<boolean> {
  if (await handleDashboardSession(req, res, pathname)) {
    return true
  }
  if (await handleGetNetworks(req, res, pathname)) {
    return true
  }

  if (await handleDownloadPlugin(req, res, pathname)) return true


  if (await handleCreateNetwork(req, res, pathname)) return true

  if (await handleBackendActivate(req, res, pathname)) return true

  if (await handleActivationKey(req, res, pathname)) return true

  if (await handleRegenerateActivationKey(req, res, pathname)) return true

  if (await handleRenameNetwork(req, res, pathname)) return true

  if (await handleToggleNetwork(req, res, pathname)) return true

  if (await handleDeleteNetwork(req, res, pathname)) return true


  if (await handleHealth(req, res, pathname)) {
    return true
  }

  if (await handleDistributedTest(req, res, pathname)) {
    return true
  }

  if (await handleSocketDebug(req, res, pathname, io)) {
    return true
  }



  if (await handleNetworkSettings(req, res, pathname)) {
    return true
  }

  if (await handleDiscoveryNetworks(req, res, pathname)) {
    return true
  }

  if (await handleResolveNetwork(req, res, pathname)) return true

  if (await handleNetworkMedia(req, res, pathname)) {
    return true
  }



  return false
}
