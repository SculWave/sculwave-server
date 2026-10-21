import { error, log } from '@/server/utils/logger'
import { redis } from '../redis'

const KEY = 'leader'
const ID = process.env.HOSTNAME!
const TTL = 15
const RENEW_INTERVAL = 5000

class LeaderElection {
  private leader = false
  private running = false

  async start() {
    await this.runElection()

    setInterval(async () => {
      await this.runElection()
    }, RENEW_INTERVAL)
  }

  private async runElection() {
    if (this.running) {
      return
    }

    this.running = true

    try {
      await this.tryBecomeLeader()
    } catch (err) {
      error('LeaderElection', '%o', err)

      this.leader = false
    } finally {
      this.running = false
    }
  }

  private async tryBecomeLeader() {
    const wasLeader = this.leader

    const acquired = await redis.set(KEY, ID, {
      NX: true,
      expiration: {
        type: 'EX',
        value: TTL,
      },
    })

    if (acquired) {
      this.leader = true

      if (!wasLeader) {
        log('LEADER', 'BECAME LEADER')
      }

      return
    }

    const current = await redis.get(KEY)

    if (current === ID) {
      this.leader = true

      await redis.expire(KEY, TTL)

      if (!wasLeader) {
        log('LEADER', 'BECAME LEADER')
      }

      return
    }

    this.leader = false

    if (wasLeader) {
      log('LEADER', 'LOST LEADERSHIP')
    }
  }
  isLeader() {
    return this.leader
  }

  async shutdown() {
    if (!this.leader) {
      return
    }

    try {
      const current = await redis.get(KEY)

      if (current === ID) {
        await redis.del(KEY)
      }
    } catch (err) {
      error('LeaderShutdown', '%o', err)
    }
  }
}

export const leaderElection = new LeaderElection()
