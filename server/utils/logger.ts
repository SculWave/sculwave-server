import { randomUUID } from 'crypto'
import { format } from 'util'

const DEBUG_ENABLED = process.env.DEBUG_LOGS === 'true'

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

function write(level: LogLevel, scope: string, message: string, ...args: unknown[]) {
  console.log(
    `[${new Date().toISOString()}] ` +
      `[${process.env.HOSTNAME}] ` +
      `[${level}] ` +
      `[${scope}] ${message}`,
    ...args,
  )

  // Don't flood telemetry with debug logs
  if (level === 'DEBUG') {
    return
  }


}

export function log(scope: string, message: string, ...args: unknown[]) {
  if (!DEBUG_ENABLED) {
    return
  }

  write('DEBUG', scope, message, ...args)
}

export function info(scope: string, message: string, ...args: unknown[]) {
  write('INFO', scope, message, ...args)
}

export function warn(scope: string, message: string, ...args: unknown[]) {
  write('WARN', scope, message, ...args)
}

export function error(scope: string, message: string, ...args: unknown[]) {
  write('ERROR', scope, message, ...args)

  for (const arg of args) {
    if (arg instanceof Error) {
      console.error(arg.stack)
    }
  }
}
