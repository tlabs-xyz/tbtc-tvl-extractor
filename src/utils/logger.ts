import pino from 'pino'
import pinoPretty from 'pino-pretty'

export type Logger = pino.Logger

export function createLogger(level: string = 'info'): Logger {
  // Use pino-pretty as a synchronous stream (not as a worker transport)
  // This prevents log interleaving with console.log output
  const stream = process.env.NODE_ENV !== 'production'
    ? pinoPretty({
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'HH:MM:ss',
        sync: true
      })
    : pino.destination({ sync: true })

  return pino({
    level,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label })
    }
  }, stream)
}
