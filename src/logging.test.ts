import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { existsSync, readFileSync, rmSync, mkdtempSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import { log, logError, logDebug, logWarn, setLogDir, resetLogDir, setLogLevel, getLogLevel, resetLogLevel, startTimer, logStart, logEnd, logEndWithTime } from "./logging"

describe("logging", () => {
  let tempDir: string
  let logFile: string

  beforeEach(() => {
    // Create a unique temp directory for each test
    tempDir = mkdtempSync(join(tmpdir(), "logging-test-"))
    logFile = join(tempDir, "plugin.log")
    setLogDir(tempDir)
  })

  afterEach(() => {
    // Reset to default and clean up temp directory
    resetLogDir()
    resetLogLevel()
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true })
    }
  })

  describe("log", () => {
    test("writes INFO level message to log file", () => {
      log("test message")
      
      expect(existsSync(logFile)).toBe(true)
      const content = readFileSync(logFile, "utf-8")
      expect(content).toContain("[INFO]")
      expect(content).toContain("[remote-config]")
      expect(content).toContain("test message")
    })

    test("includes ISO timestamp in log entry", () => {
      log("timestamp test")
      
      const content = readFileSync(logFile, "utf-8")
      // ISO timestamp format: 2024-01-12T10:30:00.000Z
      expect(content).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    test("appends multiple log entries", () => {
      log("first message")
      log("second message")
      
      const content = readFileSync(logFile, "utf-8")
      const lines = content.trim().split("\n")
      expect(lines).toHaveLength(2)
      expect(lines[0]).toContain("first message")
      expect(lines[1]).toContain("second message")
    })
  })

  describe("logError", () => {
    test("writes ERROR level message to log file", () => {
      logError("error occurred")
      
      expect(existsSync(logFile)).toBe(true)
      const content = readFileSync(logFile, "utf-8")
      expect(content).toContain("[ERROR]")
      expect(content).toContain("[remote-config]")
      expect(content).toContain("error occurred")
    })
  })

  describe("logDebug", () => {
    test("writes DEBUG level message to log file when level is debug", () => {
      setLogLevel("debug")
      logDebug("debug info")
      
      expect(existsSync(logFile)).toBe(true)
      const content = readFileSync(logFile, "utf-8")
      expect(content).toContain("[DEBUG]")
      expect(content).toContain("[remote-config]")
      expect(content).toContain("debug info")
    })
    
    test("does not write DEBUG message when level is info", () => {
      setLogLevel("info")
      logDebug("debug info should not appear")
      
      // File should not exist because nothing was written
      expect(existsSync(logFile)).toBe(false)
    })
  })

  describe("logWarn", () => {
    test("writes WARN level message to log file", () => {
      logWarn("warning message")
      
      expect(existsSync(logFile)).toBe(true)
      const content = readFileSync(logFile, "utf-8")
      expect(content).toContain("[WARN]")
      expect(content).toContain("[remote-config]")
      expect(content).toContain("warning message")
    })
  })

  describe("log format", () => {
    test("follows expected format: timestamp [level] [prefix] message", () => {
      log("format test")
      
      const content = readFileSync(logFile, "utf-8").trim()
      // Expected format: 2024-01-12T10:30:00.000Z [INFO] [remote-config] format test
      const pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[INFO\] \[remote-config\] format test$/
      expect(content).toMatch(pattern)
    })

    test("each log entry ends with newline", () => {
      log("newline test")
      
      const content = readFileSync(logFile, "utf-8")
      expect(content.endsWith("\n")).toBe(true)
    })
  })

  describe("directory creation", () => {
    test("creates log directory if it does not exist", () => {
      // Remove temp directory to test creation
      rmSync(tempDir, { recursive: true })
      
      log("directory creation test")
      
      expect(existsSync(tempDir)).toBe(true)
      expect(existsSync(logFile)).toBe(true)
    })
  })

  describe("log levels", () => {
    test("setLogLevel changes the current level", () => {
      setLogLevel("debug")
      expect(getLogLevel()).toBe("debug")
      
      setLogLevel("error")
      expect(getLogLevel()).toBe("error")
    })

    test("resetLogLevel sets level back to info", () => {
      setLogLevel("debug")
      resetLogLevel()
      expect(getLogLevel()).toBe("info")
    })

    test("error level only logs errors", () => {
      setLogLevel("error")
      
      logError("error message")
      logWarn("warn message")
      log("info message")
      logDebug("debug message")
      
      const content = readFileSync(logFile, "utf-8")
      expect(content).toContain("error message")
      expect(content).not.toContain("warn message")
      expect(content).not.toContain("info message")
      expect(content).not.toContain("debug message")
    })

    test("warn level logs errors and warnings", () => {
      setLogLevel("warn")
      
      logError("error message")
      logWarn("warn message")
      log("info message")
      logDebug("debug message")
      
      const content = readFileSync(logFile, "utf-8")
      expect(content).toContain("error message")
      expect(content).toContain("warn message")
      expect(content).not.toContain("info message")
      expect(content).not.toContain("debug message")
    })

    test("info level logs errors, warnings, and info", () => {
      setLogLevel("info")
      
      logError("error message")
      logWarn("warn message")
      log("info message")
      logDebug("debug message")
      
      const content = readFileSync(logFile, "utf-8")
      expect(content).toContain("error message")
      expect(content).toContain("warn message")
      expect(content).toContain("info message")
      expect(content).not.toContain("debug message")
    })

    test("debug level logs everything", () => {
      setLogLevel("debug")
      
      logError("error message")
      logWarn("warn message")
      log("info message")
      logDebug("debug message")
      
      const content = readFileSync(logFile, "utf-8")
      expect(content).toContain("error message")
      expect(content).toContain("warn message")
      expect(content).toContain("info message")
      expect(content).toContain("debug message")
    })
  })

  describe("categories", () => {
    test("includes category in log message", () => {
      log("test message", "GIT")
      
      const content = readFileSync(logFile, "utf-8")
      expect(content).toContain("[GIT]")
      expect(content).toContain("test message")
    })

    test("log format without category", () => {
      log("no category")
      
      const content = readFileSync(logFile, "utf-8")
      // Should not have double brackets like [INFO] []
      expect(content).not.toMatch(/\[INFO\] \[remote-config\] \[/)
      expect(content).toContain("[INFO] [remote-config] no category")
    })
  })

  describe("timing helpers", () => {
    test("startTimer logs duration on end()", async () => {
      const timer = startTimer("TestOperation", "TEST")
      
      // Small delay to ensure measurable time
      await new Promise(resolve => setTimeout(resolve, 10))
      
      timer.end()
      
      const content = readFileSync(logFile, "utf-8")
      expect(content).toContain("[TEST]")
      expect(content).toContain("TestOperation")
      expect(content).toMatch(/took \d+ms/)
    })

    test("logStart adds [START] prefix", () => {
      logStart("MyOperation", "SYNC")
      
      const content = readFileSync(logFile, "utf-8")
      expect(content).toContain("[START] MyOperation")
      expect(content).toContain("[SYNC]")
    })

    test("logEnd adds [END] prefix", () => {
      logEnd("MyOperation", "SYNC")
      
      const content = readFileSync(logFile, "utf-8")
      expect(content).toContain("[END] MyOperation")
    })

    test("logEndWithTime includes duration", async () => {
      const startTime = Date.now()
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 10))
      
      logEndWithTime("MyOperation", startTime, "SYNC")
      
      const content = readFileSync(logFile, "utf-8")
      expect(content).toContain("[END] MyOperation")
      expect(content).toMatch(/took \d+ms/)
    })
  })

  describe("error handling", () => {
    test("does not throw when logging", () => {
      // This test verifies the function doesn't throw
      // The implementation silently ignores errors
      expect(() => log("safe message")).not.toThrow()
      expect(() => logError("safe error")).not.toThrow()
      expect(() => logDebug("safe debug")).not.toThrow()
    })

    test("silently ignores write errors to unwritable path", () => {
      // Set log dir to an impossible path (works on both Unix and Windows)
      const impossiblePath = process.platform === "win32" 
        ? "Z:\\nonexistent\\impossible\\path"
        : "/dev/null/impossible"
      setLogDir(impossiblePath)

      // Should not throw
      expect(() => log("will fail")).not.toThrow()
      expect(() => logError("will fail")).not.toThrow()
      expect(() => logDebug("will fail")).not.toThrow()

      // No file created (path doesn't exist)
      expect(existsSync(join(impossiblePath, "plugin.log"))).toBe(false)
    })
  })
})
