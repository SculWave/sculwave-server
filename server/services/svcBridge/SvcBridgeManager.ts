import {
  SVC_IDLE_FORWARDER_MS,
  SVC_MAX_PUBLISHERS_PER_ROOM,
  SVC_RETRY_BACKOFF_MS,
  SVC_SYNC_TIMEOUT_MS,
} from '../../config/constants'
import { calculateHearablePlayers } from '../../managers/positionManager'
import { getRoomSubscriptions } from '../../managers/subscriptionManager'
import type { Player } from '../../types/player'
import { refreshParticipantCache } from '../livekit/participants'
import { AppForwarder, type PlaybackSink } from './AppForwarder'
import { SvcPublisher } from './SvcPublisher'
import { error, info, warn } from '@/server/utils/logger'

interface RoomBridge {
  roomCode: string
  /** lower-case Minecraft name -> the player's LiveKit presence. */
  publishers: Map<string, SvcPublisher>
  forwarder?: AppForwarder
  /** lower-case names of players currently on Simple Voice Chat, as last reported by the plugin. */
  svcNames: Set<string>
  lastSync: number
  emptySince?: number
  syncing: boolean
  retryAfter: Map<string, number>
  warnedCapacity: boolean
}

/**
 * Bridges Simple Voice Chat players (Minecraft mod) and SculWave app players (LiveKit).
 *
 *   SVC player  -> plugin -> ingest() -> SvcPublisher -> LiveKit track   -> app players
 *   App player  -> LiveKit -> AppForwarder -> plugin -> Simple Voice Chat -> SVC players
 *
 * Nothing is created until a plugin reports Simple Voice Chat players for a room.
 */
class SvcBridgeManager {
  private rooms = new Map<string, RoomBridge>()

  constructor() {
    // Safety net: if a backend vanishes without saying goodbye, tear its bridge down.
    setInterval(() => {
      const now = Date.now()

      for (const bridge of this.rooms.values()) {
        if (now - bridge.lastSync > SVC_SYNC_TIMEOUT_MS) {
          void this.stopRoom(bridge.roomCode)
        }
      }
    }, 5_000).unref()
  }

  // ---------------------------------------------------------------- queries

  /** Is this name a bridged Simple Voice Chat player (as opposed to a real app user)? */
  isBridged(roomCode: string, gamertag: string): boolean {
    return this.rooms.get(roomCode)?.publishers.has(gamertag.toLowerCase()) ?? false
  }

  // ------------------------------------------------------------------ audio

  /** One Opus packet from a Simple Voice Chat player, relayed by the plugin. */
  ingest(roomCode: string, gamertag: string, packet: Buffer) {
    this.rooms.get(roomCode)?.publishers.get(gamertag.toLowerCase())?.push(packet)
  }

  // ------------------------------------------------------- subscription logic

  /**
   * Adjusts the "who hears whom" matrix the heartbeat just built:
   *  - Bridged players are publish-only: they are never listeners.
   *  - Simple Voice Chat players without the app have nothing to subscribe with.
   *  - Players on BOTH hear mod players through the mod, so they must not also get them from LiveKit.
   */
  adjustMatrix(roomCode: string, hearMatrix: Map<string, Set<string>>) {
    const bridge = this.rooms.get(roomCode)
    if (!bridge) return

    const bridged = new Set(bridge.publishers.keys())

    for (const lower of bridged) {
      hearMatrix.delete(lower)
    }

    for (const lower of bridge.svcNames) {
      const hearable = hearMatrix.get(lower)
      if (!hearable) continue

      const hasApp =
        bridge.forwarder?.hasAppParticipant(lower, bridge.publishers.get(lower)?.identity) ?? false

      if (!hasApp) {
        hearMatrix.delete(lower)
        continue
      }

      for (const identity of bridged) {
        hearable.delete(identity)
      }
    }
  }

  // ------------------------------------------------------------------- sync

  /**
   * Called after every backend heartbeat with the list of Simple Voice Chat players the
   * plugin reports. Creates and removes bridged players, and decides whose voice is forwarded
   * back to Minecraft.
   */
  async sync(roomCode: string, svcPlayers: string[], players: Player[], sink: PlaybackSink) {
    const bridge = this.getOrCreate(roomCode)

    bridge.lastSync = Date.now()
    bridge.forwarder?.setSink(sink)

    // Heartbeats arrive every second; never run two syncs for the same room at once.
    if (bridge.syncing) return
    bridge.syncing = true

    try {
      await this.reconcile(bridge, svcPlayers, players, sink)
    } catch (err) {
      error('SvcBridge', 'sync failed room=%s: %o', roomCode, err)
    } finally {
      bridge.syncing = false
    }
  }

  private async reconcile(
    bridge: RoomBridge,
    svcPlayers: string[],
    players: Player[],
    sink: PlaybackSink,
  ) {
    const wanted = new Map<string, string>() // lower -> Minecraft name
    for (const name of svcPlayers) {
      if (typeof name === 'string' && name.length > 0 && name.length <= 32) {
        wanted.set(name.toLowerCase(), name)
      }
    }

    bridge.svcNames = new Set(wanted.keys())

    // Nobody on Simple Voice Chat: close everything, and the forwarder after a grace period.
    if (wanted.size === 0) {
      await this.closeAllPublishers(bridge)

      bridge.emptySince ??= Date.now()

      if (bridge.forwarder && Date.now() - bridge.emptySince > SVC_IDLE_FORWARDER_MS) {
        const forwarder = bridge.forwarder
        bridge.forwarder = undefined
        await forwarder.stop()
      }

      return
    }

    bridge.emptySince = undefined

    // The forwarder doubles as our view of who is in LiveKit, so it must exist first.
    if (!bridge.forwarder) {
      const forwarder = new AppForwarder(bridge.roomCode, sink, (lower) =>
        bridge.publishers.has(lower),
      )

      try {
        await forwarder.start()
        bridge.forwarder = forwarder
      } catch (err) {
        await forwarder.stop()
        error('SvcBridge', 'Forwarder failed room=%s: %o', bridge.roomCode, err)
        return
      }
    }

    const forwarder = bridge.forwarder

    // Players that left Simple Voice Chat.
    for (const [lower, publisher] of [...bridge.publishers]) {
      if (!wanted.has(lower)) {
        await this.drop(bridge, lower, publisher)
      }
    }

    // Players on Simple Voice Chat: publish them, unless the same person is in the app.
    const appPresent = new Set<string>()

    for (const [lower, name] of wanted) {
      const existing = bridge.publishers.get(lower)
      const app = forwarder.hasAppParticipant(lower, existing?.identity)

      if (app) {
        appPresent.add(lower)
        if (existing) await this.drop(bridge, lower, existing) // the app user wins
        continue
      }

      if (existing) continue
      if ((bridge.retryAfter.get(lower) ?? 0) > Date.now()) continue

      if (bridge.publishers.size >= SVC_MAX_PUBLISHERS_PER_ROOM) {
        if (!bridge.warnedCapacity) {
          bridge.warnedCapacity = true
          warn(
            'SvcBridge',
            'room=%s reached %d bridged players; others are not bridged',
            bridge.roomCode,
            SVC_MAX_PUBLISHERS_PER_ROOM,
          )
        }
        continue
      }

      this.create(bridge, lower, name)
    }

    // Who should hear whom, for forwarding app audio into Minecraft.
    this.updateAudience(bridge, forwarder, wanted, appPresent, players)
  }

  private updateAudience(
    bridge: RoomBridge,
    forwarder: AppForwarder,
    wanted: Map<string, string>,
    appPresent: Set<string>,
    players: Player[],
  ) {
    const matrix = calculateHearablePlayers(players)
    const audience = new Set<string>()

    for (const lower of wanted.keys()) {
      // A listener who is also in the app hears app players in the app, not through the mod.
      if (appPresent.has(lower)) continue

      for (const speaker of matrix.get(lower) ?? []) {
        audience.add(speaker)
      }
    }

    // Players on Simple Voice Chat are heard natively; bridged ones must never loop back.
    for (const lower of wanted.keys()) audience.delete(lower)
    for (const lower of bridge.publishers.keys()) audience.delete(lower)

    forwarder.audience = audience
    forwarder.names = new Map(players.map((p) => [p.gamertag.toLowerCase(), p.gamertag]))
  }

  // --------------------------------------------------------------- lifecycle

  async stopRoom(roomCode: string) {
    const bridge = this.rooms.get(roomCode)
    if (!bridge) return

    this.rooms.delete(roomCode)

    await this.closeAllPublishers(bridge)

    if (bridge.forwarder) {
      const forwarder = bridge.forwarder
      bridge.forwarder = undefined
      await forwarder.stop()
    }

    info('SvcBridge', 'Stopped room=%s', roomCode)
  }

  private getOrCreate(roomCode: string): RoomBridge {
    let bridge = this.rooms.get(roomCode)

    if (!bridge) {
      bridge = {
        roomCode,
        publishers: new Map(),
        svcNames: new Set(),
        lastSync: Date.now(),
        syncing: false,
        retryAfter: new Map(),
        warnedCapacity: false,
      }

      this.rooms.set(roomCode, bridge)
    }

    return bridge
  }

  private create(bridge: RoomBridge, lower: string, name: string) {
    const publisher = new SvcPublisher(bridge.roomCode, name, (closed) => {
      // LiveKit dropped them (network, or an app user took the identity).
      if (bridge.publishers.get(lower) === closed) {
        bridge.publishers.delete(lower)
        this.forget(bridge.roomCode, lower)
      }
    })

    // Registered before connecting, so the forwarder can already recognise the identity.
    bridge.publishers.set(lower, publisher)

    publisher
      .start()
      .then(() => {
        // LiveKit needs a moment before it lists the new track; subscriptions use that list.
        setTimeout(() => void refreshParticipantCache(bridge.roomCode), 1_500)
        info('SvcBridge', 'Bridged %s into room=%s', name, bridge.roomCode)
      })
      .catch((err) => {
        if (bridge.publishers.get(lower) === publisher) {
          bridge.publishers.delete(lower)
        }

        bridge.retryAfter.set(lower, Date.now() + SVC_RETRY_BACKOFF_MS)
        error('SvcBridge', 'Could not bridge %s: %o', name, err)
      })
  }

  private async drop(bridge: RoomBridge, lower: string, publisher: SvcPublisher) {
    if (bridge.publishers.get(lower) === publisher) {
      bridge.publishers.delete(lower)
    }

    await publisher.close()
    this.forget(bridge.roomCode, lower)
    info('SvcBridge', 'Removed %s from room=%s', publisher.identity, bridge.roomCode)
  }

  private async closeAllPublishers(bridge: RoomBridge) {
    for (const [lower, publisher] of [...bridge.publishers]) {
      await this.drop(bridge, lower, publisher)
    }
  }

  /**
   * Listener subscriptions are cached per identity, not per track. If the same name publishes a
   * new track later, listeners must be allowed to subscribe to it again, so forget the old entry.
   */
  private forget(roomCode: string, lower: string) {
    const subscriptions = getRoomSubscriptions(roomCode)

    subscriptions.delete(lower)

    for (const listening of subscriptions.values()) {
      listening.delete(lower)
    }
  }
}

export const svcBridge = new SvcBridgeManager()
