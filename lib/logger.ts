/**
 * Structured Logger — Pilier 4: Observabilité (v2 - Hardcore)
 * 
 * - JSON structured logs for Loki/ELK/CloudWatch
 * - Automatic PII redaction (passwords, tokens, emails)
 * - Region metadata (VERCEL_REGION)
 * - Correlation ID tracing
 * - Timing utility for DB/API calls
 */

import { redactPII } from './sanitize'

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

interface LogEntry {
  level: LogLevel
  msg: string
  timestamp: string
  service: string
  region: string
  correlationId?: string
  userId?: string
  path?: string
  method?: string
  statusCode?: number
  durationMs?: number
  error?: {
    message: string
    stack?: string
    code?: string
  }
  [key: string]: unknown
}

const SERVICE_NAME = process.env.SERVICE_NAME || 'tiktok-clone'
const REGION = process.env.VERCEL_REGION || process.env.AWS_REGION || 'local'
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0, info: 1, warn: 2, error: 3, fatal: 4,
}

const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug')

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[MIN_LEVEL]
}

function formatEntry(entry: LogEntry): string {
  if (process.env.NODE_ENV === 'production') {
    // Production: pure JSON for log aggregators
    return JSON.stringify(entry)
  }
  // Dev mode: colored, readable output
  const colors: Record<LogLevel, string> = {
    debug: '\x1b[36m', info: '\x1b[32m', warn: '\x1b[33m', error: '\x1b[31m', fatal: '\x1b[35m',
  }
  const reset = '\x1b[0m'
  const color = colors[entry.level]
  const prefix = `${color}[${entry.level.toUpperCase()}]${reset}`
  const cid = entry.correlationId ? ` [cid:${entry.correlationId.slice(0, 8)}]` : ''
  const duration = entry.durationMs !== undefined ? ` (${entry.durationMs}ms)` : ''
  return `${prefix}${cid} ${entry.msg}${duration}`
}

function log(level: LogLevel, msg: string, meta?: Partial<Omit<LogEntry, 'level' | 'msg' | 'timestamp' | 'service' | 'region'>>) {
  if (!shouldLog(level)) return

  // Auto-redact PII from metadata before logging
  const safeMeta = meta ? redactPII(meta as Record<string, unknown>) : {}

  const entry: LogEntry = {
    level,
    msg,
    timestamp: new Date().toISOString(),
    service: SERVICE_NAME,
    region: REGION,
    version: APP_VERSION,
    ...safeMeta,
  }

  const formatted = formatEntry(entry)

  switch (level) {
    case 'debug':
    case 'info':
      console.log(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    case 'error':
    case 'fatal':
      console.error(formatted)
      break
  }
}

/**
 * Create a scoped logger with pre-filled context.
 * PII is automatically redacted from all metadata.
 */
export function createLogger(context?: { correlationId?: string; userId?: string; path?: string }) {
  const ctx = context || {}
  return {
    debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, { ...ctx, ...meta }),
    info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, { ...ctx, ...meta }),
    warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, { ...ctx, ...meta }),
    error: (msg: string, err?: Error | null, meta?: Record<string, unknown>) =>
      log('error', msg, {
        ...ctx,
        ...meta,
        error: err ? { message: err.message, stack: err.stack, code: (err as any).code } : undefined,
      }),
    fatal: (msg: string, err?: Error | null, meta?: Record<string, unknown>) =>
      log('fatal', msg, {
        ...ctx,
        ...meta,
        error: err ? { message: err.message, stack: err.stack, code: (err as any).code } : undefined,
      }),
  }
}

/** Default logger without context */
export const logger = createLogger()

/**
 * Measure execution time of an async function.
 * Logs success with duration, logs error with duration on failure.
 */
export async function withTiming<T>(
  name: string, 
  fn: () => Promise<T>,
  loggerInstance = logger
): Promise<T> {
  const start = performance.now()
  try {
    const result = await fn()
    const durationMs = Math.round(performance.now() - start)
    loggerInstance.info(`${name} completed`, { durationMs })
    return result
  } catch (err) {
    const durationMs = Math.round(performance.now() - start)
    loggerInstance.error(`${name} failed`, err as Error, { durationMs })
    throw err
  }
}

/**
 * Generate a unique correlation ID
 */
export function generateCorrelationId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}
