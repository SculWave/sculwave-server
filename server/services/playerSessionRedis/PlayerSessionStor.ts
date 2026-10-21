import { PlayerSession, playerSessions } from '@/server/types/PlayerSession'
import { eventBus } from '../redis/EventBus'

const CHANNEL = 'player-session'

const PROCESS_ID = crypto.randomUUID()

export interface PlayerSessionSyncEvent {
  source: string

  type: 'SET' | 'DELETE'

  gamertag: string

  session?: PlayerSession
}

class PlayerSessionStore {
  constructor() {
    void eventBus.subscribe<PlayerSessionSyncEvent>(CHANNEL, (event) => {
      if (event.source === PROCESS_ID) {
        return
      }

      switch (event.type) {
        case 'SET':
          if (event.session) {
            this.setLocal(event.gamertag, event.session)
          }

          break

        case 'DELETE':
          this.deleteLocal(event.gamertag)

          break
      }
    })
  }

  get(gamertag: string) {
    return playerSessions.get(gamertag.toLowerCase())
  }

  setLocal(gamertag: string, session: PlayerSession) {
    playerSessions.set(gamertag.toLowerCase(), session)
  }

  deleteLocal(gamertag: string) {
    playerSessions.delete(gamertag.toLowerCase())
  }

  set(gamertag: string, session: PlayerSession) {
    this.setLocal(gamertag, session)

    void eventBus.publish<PlayerSessionSyncEvent>(CHANNEL, {
      source: PROCESS_ID,
      type: 'SET',
      gamertag,
      session,
    })
  }

  delete(gamertag: string) {
    this.deleteLocal(gamertag)

    void eventBus.publish<PlayerSessionSyncEvent>(CHANNEL, {
      source: PROCESS_ID,
      type: 'DELETE',
      gamertag,
    })
  }
}

export const playerSessionStore = new PlayerSessionStore()
