/**
 * Simple logging utility that respects environment settings
 * In production, only logs errors. In development, logs everything.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const isDevelopment = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'

class Logger {
  private shouldLog(level: LogLevel): boolean {
    if (isTest) return false
    if (level === 'error') return true
    return isDevelopment
  }

  debug(message: string, ...args: any[]) {
    if (this.shouldLog('debug')) {
      console.log(`[DEBUG] ${message}`, ...args)
    }
  }

  info(message: string, ...args: any[]) {
    if (this.shouldLog('info')) {
      console.log(`[INFO] ${message}`, ...args)
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args)
    }
  }

  error(message: string, error?: any) {
    if (this.shouldLog('error')) {
      if (error instanceof Error) {
        console.error(`[ERROR] ${message}`, {
          message: error.message,
          stack: error.stack,
          name: error.name,
        })
      } else if (error) {
        console.error(`[ERROR] ${message}`, error)
      } else {
        console.error(`[ERROR] ${message}`)
      }
    }
  }
}

export const logger = new Logger()
