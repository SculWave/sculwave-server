import { warn } from '../utils/logger'

export async function retry<T>(fn: () => Promise<T>, attempts = 3) {
  let lastError

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err

      warn('Retry', '%d/%d %o', i + 1, attempts, err)

      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 1000))
      }
    }
  }

  throw lastError
}
