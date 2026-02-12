import { appendFileSync, mkdirSync } from "fs"
import { join } from "path"
import { homedir } from "os"

/** Default directory for log files */
export const DEFAULT_LOG_DIR = join(homedir(), ".cache", "opencode", "remote-config")

/** Current log directory (can be overridden for testing) */
let currentLogDir = DEFAULT_LOG_DIR

/** Track if log directory has been ensured (avoid repeated mkdirSync calls) */
let dirEnsured = false

/** Log levels in order of priority (higher = more verbose) */
export const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
} as const

export type LogLevel = keyof typeof LOG_LEVELS

/** Current log level (default: info) */
let currentLogLevel: LogLevel = "info"

/**
 * Set the log level
 * @param level The log level to use
 */
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level
}

/**
 * Get the current log level
 * @returns The current log level
 */
export function getLogLevel(): LogLevel {
  return currentLogLevel
}

/**
 * Reset the log level to default (info)
 */
export function resetLogLevel(): void {
  currentLogLevel = "info"
}

/**
 * Check if a log level should be logged based on current level
 * @param level The level to check
 * @returns true if should log
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLogLevel]
}

/**
 * Set the log directory (for testing purposes)
 * @param dir Directory path for log files
 */
export function setLogDir(dir: string): void {
  currentLogDir = dir
  dirEnsured = false
}

/**
 * Reset the log directory to the default
 */
export function resetLogDir(): void {
  currentLogDir = DEFAULT_LOG_DIR
  dirEnsured = false
}

/**
 * Get the current log file path
 */
function getLogFile(): string {
  return join(currentLogDir, "plugin.log")
}

/**
 * Get current timestamp in ISO format
 */
function timestamp(): string {
  return new Date().toISOString()
}

/**
 * Write a log message to the log file.
 * Creates the log directory if it doesn't exist.
 * Silently ignores errors (e.g., permission issues).
 * 
 * @param level Log level (INFO, ERROR, DEBUG, WARN)
 * @param category Optional category for grouping logs
 * @param message Message to log
 */
function writeLog(level: string, category: string | undefined, message: string): void {
  if (!shouldLog(level.toLowerCase() as LogLevel)) {
    return
  }

  try {
    if (!dirEnsured) {
      mkdirSync(currentLogDir, { recursive: true })
      dirEnsured = true
    }
    const categoryStr = category ? `[${category}] ` : ""
    appendFileSync(getLogFile(), `${timestamp()} [${level}] [remote-config] ${categoryStr}${message}\n`)
  } catch {
    // Reset flag on error so we try again next time
    dirEnsured = false
  }
}

/**
 * Log an INFO level message to the log file
 * 
 * @param message Message to log
 * @param category Optional category
 */
export function log(message: string, category?: string): void {
  writeLog("INFO", category, message)
}

/**
 * Log an ERROR level message to the log file
 * 
 * @param message Message to log
 * @param category Optional category
 */
export function logError(message: string, category?: string): void {
  writeLog("ERROR", category, message)
}

/**
 * Log a DEBUG level message to the log file
 * 
 * @param message Message to log
 * @param category Optional category
 */
export function logDebug(message: string, category?: string): void {
  writeLog("DEBUG", category, message)
}

/**
 * Log a WARN level message to the log file
 * 
 * @param message Message to log
 * @param category Optional category
 */
export function logWarn(message: string, category?: string): void {
  writeLog("WARN", category, message)
}

/**
 * Helper to time an operation and log the duration
 * Usage:
 *   const timer = startTimer("OperationName")
 *   await doSomething()
 *   timer.end()
 * 
 * @param operation Name of the operation
 * @param category Optional category
 * @returns Object with end() method to log completion
 */
export function startTimer(operation: string, category?: string): { end: () => void } {
  const startTime = Date.now()
  
  return {
    end: () => {
      const duration = Date.now() - startTime
      log(`${operation} (took ${duration}ms)`, category)
    }
  }
}

/**
 * Log the start of an operation
 * @param operation Name of the operation
 * @param category Optional category
 */
export function logStart(operation: string, category?: string): void {
  log(`[START] ${operation}`, category)
}

/**
 * Log the end of an operation
 * @param operation Name of the operation
 * @param category Optional category
 */
export function logEnd(operation: string, category?: string): void {
  log(`[END] ${operation}`, category)
}

/**
 * Log the end of an operation with timing
 * @param operation Name of the operation
 * @param startTime Start time from Date.now()
 * @param category Optional category
 */
export function logEndWithTime(operation: string, startTime: number, category?: string): void {
  const duration = Date.now() - startTime
  log(`[END] ${operation} (took ${duration}ms)`, category)
}
