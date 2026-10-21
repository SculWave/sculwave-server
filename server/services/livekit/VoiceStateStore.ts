import crypto from 'crypto'

import { eventBus } from '../redis/EventBus'
import { info, log } from '@/server/utils/logger'


const CHANNEL = 'voice-state'
const SOURCE = process.env.HOSTNAME ?? crypto.randomUUID()

export interface VoicePlayerState {
  roomCode: string
  gamertag: string
  connected: boolean
  muted: boolean
  speaking: boolean
  timestamp: number
}

export interface VoiceStateEvent extends VoicePlayerState {
  source: string
  type: 'STATE_CHANGED'
}

class VoiceStateStore {
  private stateByRoom = new Map<
    string,
    Map<string, VoicePlayerState>
  >()

  constructor() {
    void eventBus.subscribe<VoiceStateEvent>(
      CHANNEL,
      (event) => {
        if (event.source === SOURCE) {
          return
        }

        this.applyLocal(event)
        this.notify(event)

        log(
          'VoiceState',
          'REDIS room=%s player=%s connected=%s muted=%s speaking=%s',
          event.roomCode,
          event.gamertag,
          event.connected,
          event.muted,
          event.speaking,
        )
      },
    )
  }

  private listeners = new Set<(state: VoicePlayerState) => void>()

  private normalize(gamertag: string): string {
    return gamertag.trim().toLowerCase()
  }

  private ensureRoom(
    roomCode: string,
  ): Map<string, VoicePlayerState> {

    let room = this.stateByRoom.get(roomCode)

    if (!room) {
      room = new Map<string, VoicePlayerState>()
      this.stateByRoom.set(roomCode, room)
    }

    return room
  }

  private applyLocal(
    state: VoicePlayerState,
  ): void {

    const gamertag =
      this.normalize(state.gamertag)

    const room =
      this.ensureRoom(state.roomCode)

    room.set(gamertag, {
      ...state,
      gamertag,
    })
  }

  get(
    roomCode: string,
    gamertag: string,
  ): VoicePlayerState | undefined {

    return this.stateByRoom
      .get(roomCode)
      ?.get(this.normalize(gamertag))
  }

  getRoom(
    roomCode: string,
  ): Map<string, VoicePlayerState> {

    return new Map(
      this.stateByRoom.get(roomCode) ?? [],
    )
  }


  subscribe(listener: (state: VoicePlayerState) => void) {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify(state: VoicePlayerState) {
    for (const listener of this.listeners) {
      listener(state)
    }
  }

  async set(
    state: VoicePlayerState,
  ): Promise<void> {

    const previous =
      this.get(
        state.roomCode,
        state.gamertag,
      )

    if (
      previous &&
      previous.connected === state.connected &&
      previous.muted === state.muted &&
      previous.speaking === state.speaking
    ) {
      return
    }

    const event: VoiceStateEvent = {
      ...state,
      gamertag:
        this.normalize(state.gamertag),
      timestamp: Date.now(),
      source: SOURCE,
      type: 'STATE_CHANGED',
    }

    this.applyLocal(event)
    this.notify(event)
    info(
      'VoiceState',
      'SET room=%s player=%s connected=%s muted=%s speaking=%s',
      event.roomCode,
      event.gamertag,
      event.connected,
      event.muted,
      event.speaking,
    )

    await eventBus.publish<VoiceStateEvent>(
      CHANNEL,
      event,
    )
  }

  async disconnect(
    roomCode: string,
    gamertag: string,
  ): Promise<void> {

    await this.set({
      roomCode,
      gamertag,
      connected: false,
      muted: false,
      speaking: false,
      timestamp: Date.now(),
    })
  }

  async clearRoom(
    roomCode: string,
  ): Promise<void> {

    const room =
      this.stateByRoom.get(roomCode)

    if (!room) {
      return
    }

    for (const state of room.values()) {

      if (!state.connected) {
        continue
      }

      await this.disconnect(
        roomCode,
        state.gamertag,
      )
    }

    this.stateByRoom.delete(roomCode)
  }

  getRoomCodes(): string[] {
    return [
      ...this.stateByRoom.keys(),
    ]
  }
}

export const voiceStateStore =
  new VoiceStateStore()