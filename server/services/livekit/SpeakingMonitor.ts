import { Room, RoomEvent, TrackKind } from '@livekit/rtc-node'
import { AccessToken } from 'livekit-server-sdk'
import {
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET,
  LIVEKIT_URL,
} from '../../config/env'
import { voiceStateStore } from './VoiceStateStore'
import { error, info, log } from '@/server/utils/logger'

const MONITOR_PREFIX = '__SculWave__'

interface Monitor {
  roomCode: string
  room: Room
  connected: boolean
  reconnecting: boolean
}

class SpeakingMonitorManager {
  private monitors = new Map<string, Monitor>()

  private identity(roomCode: string) {
    return `${MONITOR_PREFIX}:${roomCode}`
  }

  private async updateParticipantState(
    roomCode: string,
    gamertag: string,
    patch: Partial<{
      connected: boolean
      muted: boolean
      speaking: boolean
    }>,
  ) {
    const previous = voiceStateStore.get(roomCode, gamertag)

    await voiceStateStore.set({
      roomCode,
      gamertag,
      connected: patch.connected ?? previous?.connected ?? false,
      muted: patch.muted ?? previous?.muted ?? true,
      speaking: patch.speaking ?? previous?.speaking ?? false,
      timestamp: Date.now(),
    })
  }


  private async reconcile(roomCode: string, room: Room) {
    for (const participant of room.remoteParticipants.values()) {
      const gamertag = participant.identity?.toLowerCase()

      if (!gamertag || gamertag.startsWith(MONITOR_PREFIX)) {
        continue
      }

      const previous = voiceStateStore.get(roomCode, gamertag)

      await this.updateParticipantState(roomCode, gamertag, {
        connected: true,
        speaking: previous?.speaking ?? false,
        muted: previous?.muted ?? true,
      })
    }

    log(
      'VoiceState',
      'Reconciled room=%s participants=%d',
      roomCode,
      room.remoteParticipants.size,
    )
  }



  private getMuted(participant: any): boolean {
    for (const publication of participant.trackPublications.values()) {
      if (publication.kind !== 'audio') {
        continue
      }

      return !publication.isSubscribed || publication.isMuted
    }

    return true
  }




  async start(roomCode: string) {
    if (this.monitors.has(roomCode)) {
      return
    }

    const token = new AccessToken(
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET,
      { identity: this.identity(roomCode) },
    )

    token.addGrant({
      room: roomCode,
      roomJoin: true,
      canPublish: false,
      canSubscribe: true,
    })

    const jwt = await token.toJwt()
    const room = new Room()

    const monitor: Monitor = {
      roomCode,
      room,
      connected: false,
      reconnecting: false,
    }

    this.monitors.set(roomCode, monitor)

    room.on(RoomEvent.ParticipantConnected, async (participant) => {
      const gamertag = participant.identity?.toLowerCase()
      if (!gamertag || gamertag.startsWith(MONITOR_PREFIX)) {
        return
      }

      await this.updateParticipantState(roomCode, gamertag, {
        connected: true,
        muted: this.getMuted(participant),
        speaking: false,
      })

      log('VoiceState', '%s connected room=%s', gamertag, roomCode)
    })

    room.on(RoomEvent.ParticipantDisconnected, async (participant) => {
      const gamertag = participant.identity?.toLowerCase()
      if (!gamertag || gamertag) {
        return
      }

      await voiceStateStore.disconnect(roomCode, gamertag)

      log('VoiceState', '%s disconnected room=%s', gamertag, roomCode)
    })

    room.on(RoomEvent.ActiveSpeakersChanged, async (speakers) => {
      const active = new Set<string>()

      for (const participant of speakers) {
        const gamertag = participant.identity?.toLowerCase()
        if (!gamertag || gamertag.startsWith(MONITOR_PREFIX)) {
          continue
        }

        active.add(gamertag)
      }

      const previous = voiceStateStore.getRoom(roomCode)

      for (const gamertag of active) {
        const state = previous.get(gamertag)

        if (!state || !state.speaking) {
          await this.updateParticipantState(roomCode, gamertag, {
            connected: state?.connected ?? true,
            muted: state?.muted ?? false,
            speaking: true,
          })

          log('VoiceState', '%s started speaking room=%s', gamertag, roomCode)
        }
      }

      for (const [gamertag, state] of previous) {
        if (state.speaking && !active.has(gamertag)) {
          await this.updateParticipantState(roomCode, gamertag, {
            connected: state.connected,
            muted: state.muted,
            speaking: false,
          })

          log('VoiceState', '%s stopped speaking room=%s', gamertag, roomCode)
        }
      }
    })

    room.on(RoomEvent.Disconnected, async () => {
      const current = this.monitors.get(roomCode)

      if (!current) {
        return
      }

      current.connected = false

      log(
        'VoiceState',
        'Monitor disconnected room=%s',
        roomCode,
      )
    })

    room.on(RoomEvent.Reconnected, async () => {
      const current = this.monitors.get(roomCode)

      if (!current) {
        return
      }

      current.connected = true
      current.reconnecting = false

      log(
        'VoiceState',
        'Monitor reconnected room=%s',
        roomCode,
      )

      await this.reconcile(
        roomCode,
        room,
      )
    })

    room.on(RoomEvent.Reconnecting, () => {
      const current = this.monitors.get(roomCode)

      if (!current) {
        return
      }

      current.connected = false
      current.reconnecting = true

      log(
        'VoiceState',
        'Monitor reconnecting room=%s',
        roomCode,
      )
    })

    room.on(RoomEvent.TrackMuted, async (publication, participant) => {
      const gamertag = participant.identity?.toLowerCase()

      if (!gamertag || gamertag.startsWith(MONITOR_PREFIX)) {
        return
      }

      if (publication.kind !== TrackKind.KIND_AUDIO) {
        return
      }

      await this.updateParticipantState(roomCode, gamertag, {
        connected: true,
        muted: true,
      })

      info(
        'VoiceState',
        '%s muted room=%s',
        gamertag,
        roomCode,
      )
    })

    room.on(RoomEvent.TrackUnmuted, async (publication, participant) => {
      const gamertag = participant.identity?.toLowerCase()

      if (!gamertag || gamertag.startsWith(MONITOR_PREFIX)) {
        return
      }
      if (publication.kind !== TrackKind.KIND_AUDIO) {
        return
      }

      await this.updateParticipantState(roomCode, gamertag, {
        connected: true,
        muted: false,
      })

      info(
        'VoiceState',
        '%s unmuted room=%s',
        gamertag,
        roomCode,
      )
    })








    try {
      await room.connect(LIVEKIT_URL, jwt, {
        autoSubscribe: true,
        dynacast: false,
      })

      monitor.connected = true

      await this.reconcile(
        roomCode,
        room,
      )

      log(
        'VoiceState',
        'Monitor connected room=%s',
        roomCode,
      )
    } catch (err) {
      this.monitors.delete(roomCode)

      error(
        'VoiceState',
        'Monitor failed room=%s error=%o',
        roomCode,
        err,
      )

      try {
        await room.disconnect()
      } catch {
        // Ignore cleanup failure.
      }

      throw err
    }
  }

  async stop(roomCode: string) {
    const monitor = this.monitors.get(roomCode)
    if (!monitor) {
      return
    }

    this.monitors.delete(roomCode)

    try {
      await monitor.room.disconnect()
    } catch (err) {
      error(
        'VoiceState',
        'Monitor disconnect failed room=%s error=%o',
        roomCode,
        err,
      )
    }

    await voiceStateStore.clearRoom(roomCode)

    log('VoiceState', 'Monitor stopped room=%s', roomCode)
  }

  async stopAll() {
    const rooms = [...this.monitors.keys()]

    for (const roomCode of rooms) {
      await this.stop(roomCode)
    }
  }

  has(roomCode: string) {
    return this.monitors.has(roomCode)
  }

  rooms() {
    return [...this.monitors.keys()]
  }
}

export const speakingMonitor = new SpeakingMonitorManager()