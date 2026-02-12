import * as fs from "fs"
import * as path from "path"
import { homedir } from "os"
import type { PluginInfo } from "./plugin-info"
import type { InstallMethod } from "./install"
import { IS_WINDOWS } from "./config"
import { log, logDebug, logError, logWarn, logEndWithTime } from "./logging"

/** Default directory where OpenCode looks for plugins */
const DEFAULT_PLUGIN_DIR = path.join(homedir(), ".config", "opencode", "plugin")

/** Prefix for remote plugin symlinks */
const REMOTE_PREFIX = "_remote_"

/**
 * Remove a path if it exists, handling files, symlinks, and directories.
 * Silently ignores ENOENT (path doesn't exist).
 * @param targetPath Path to remove
 * @throws Re-throws any error except ENOENT
 */
function removePathIfExists(targetPath: string): void {
  try {
    const stats = fs.lstatSync(targetPath)
    if (stats.isDirectory()) {
      fs.rmSync(targetPath, { recursive: true })
    } else {
      fs.unlinkSync(targetPath)
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err
    }
  }
}

/** Get the plugin directory (default or overridden for testing) */
export function getPluginDir(): string {
  return DEFAULT_PLUGIN_DIR
}

/**
 * Result of installing a plugin (symlink or copy)
 */
export interface PluginInstallResult {
  pluginName: string
  symlinkName: string
  symlinkPath: string
  targetPath: string
  error?: string
}

/**
 * @deprecated Use PluginInstallResult instead
 */
export type PluginSymlinkResult = PluginInstallResult

/**
 * Result of cleaning up plugin installs
 */
export interface PluginCleanupResult {
  removed: string[]
  errors: string[]
}

/**
 * Get the symlink name for a plugin.
 * Format: _remote_<repo>_<plugin-name>.<ext>
 * 
 * @example
 * getPluginSymlinkName({ name: "notify", repoShortName: "my-hooks", extension: ".ts" })
 * // Returns: "_remote_my-hooks_notify.ts"
 */
export function getPluginSymlinkName(plugin: PluginInfo): string {
  return `${REMOTE_PREFIX}${plugin.repoShortName}_${plugin.name}${plugin.extension}`
}

/**
 * Ensure the plugin directory exists
 * @param pluginDir Optional directory to use (defaults to ~/.config/opencode/plugin)
 */
export function ensurePluginDir(pluginDir: string = DEFAULT_PLUGIN_DIR): void {
  if (!fs.existsSync(pluginDir)) {
    fs.mkdirSync(pluginDir, { recursive: true })
  }
}

/**
 * Install a single plugin (symlink or copy)
 * @param plugin Plugin info
 * @param pluginDir Optional directory to use (defaults to ~/.config/opencode/plugin)
 * @param installMethod How to install: "link" (symlink) or "copy" (file copy)
 */
export function createPluginInstall(
  plugin: PluginInfo,
  pluginDir: string = DEFAULT_PLUGIN_DIR,
  installMethod: InstallMethod = "link"
): PluginInstallResult {
  const startTime = Date.now()
  const symlinkName = getPluginSymlinkName(plugin)
  const symlinkPath = path.join(pluginDir, symlinkName)
  
  log(`Installing plugin: ${plugin.name} (method: ${installMethod})`, "INSTALL")
  logDebug(`Source: ${plugin.path}`, "INSTALL")
  logDebug(`Target: ${symlinkPath}`, "INSTALL")
  
  const result: PluginInstallResult = {
    pluginName: plugin.name,
    symlinkName,
    symlinkPath,
    targetPath: plugin.path,
  }
  
  try {
    ensurePluginDir(pluginDir)
    
    // Remove existing (works for both symlink and regular file)
    removePathIfExists(symlinkPath)
    
    if (installMethod === "copy") {
      // For plugin files, copy the single file (not directory)
      fs.cpSync(plugin.path, symlinkPath)
      logEndWithTime(`Plugin installed (copy): ${plugin.name}`, startTime, "INSTALL")
    } else {
      // Create symlink
      try {
        // On Windows, 'file' type is used for files (not 'junction')
        const type = IS_WINDOWS ? "file" : undefined
        fs.symlinkSync(plugin.path, symlinkPath, type)
        logEndWithTime(`Plugin installed (link): ${plugin.name}`, startTime, "INSTALL")
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        // On Windows, if symlink failed due to permissions, fall back to copy
        if (IS_WINDOWS && (errorMessage.includes("EPERM") || errorMessage.includes("operation not permitted"))) {
          logWarn(`Symlink failed for plugin ${plugin.name}, falling back to copy`, "INSTALL")
          fs.cpSync(plugin.path, symlinkPath)
          logEndWithTime(`Plugin installed (copy fallback): ${plugin.name}`, startTime, "INSTALL")
        } else {
          throw err
        }
      }
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err)
    logError(`Failed to install plugin ${plugin.name}: ${result.error}`, "INSTALL")
  }
  
  return result
}

/**
 * @deprecated Use createPluginInstall instead
 */
export function createPluginSymlink(
  plugin: PluginInfo,
  pluginDir: string = DEFAULT_PLUGIN_DIR
): PluginInstallResult {
  const symlinkName = getPluginSymlinkName(plugin)
  const symlinkPath = path.join(pluginDir, symlinkName)
  
  const result: PluginInstallResult = {
    pluginName: plugin.name,
    symlinkName,
    symlinkPath,
    targetPath: plugin.path,
  }
  
  try {
    ensurePluginDir(pluginDir)
    
    // Remove existing (works for symlink, file, or directory)
    removePathIfExists(symlinkPath)
    
    // Create symlink
    fs.symlinkSync(plugin.path, symlinkPath)
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err)
  }
  
  return result
}

/**
 * Install multiple plugins (symlink or copy)
 * @param plugins List of plugins
 * @param pluginDir Optional directory to use (defaults to ~/.config/opencode/plugin)
 * @param installMethod How to install: "link" (symlink) or "copy" (file copy)
 */
export function createPluginInstalls(
  plugins: PluginInfo[],
  pluginDir: string = DEFAULT_PLUGIN_DIR,
  installMethod: InstallMethod = "link"
): PluginInstallResult[] {
  const startTime = Date.now()
  
  if (plugins.length === 0) {
    logDebug("No plugins to install", "INSTALL")
    return []
  }
  
  log(`Installing ${plugins.length} plugin(s)`, "INSTALL")
  
  const results = plugins.map(plugin => createPluginInstall(plugin, pluginDir, installMethod))
  
  const successCount = results.filter(r => !r.error).length
  const errorCount = results.filter(r => r.error).length
  
  logEndWithTime(`Installed ${successCount}/${results.length} plugins${errorCount > 0 ? ` (${errorCount} errors)` : ""}`, startTime, "INSTALL")
  
  return results
}

/**
 * @deprecated Use createPluginInstalls instead
 */
export function createPluginSymlinks(
  plugins: PluginInfo[],
  pluginDir: string = DEFAULT_PLUGIN_DIR
): PluginInstallResult[] {
  return plugins.map(p => createPluginSymlink(p, pluginDir))
}

/**
 * Get all existing remote plugin installs (symlinks or copied files)
 * Returns the install filenames (not full paths)
 * @param pluginDir Optional directory to use (defaults to ~/.config/opencode/plugin)
 */
export function getRemotePluginInstalls(pluginDir: string = DEFAULT_PLUGIN_DIR): string[] {
  if (!fs.existsSync(pluginDir)) {
    return []
  }
  
  try {
    const entries = fs.readdirSync(pluginDir)
    return entries.filter(name => name.startsWith(REMOTE_PREFIX))
  } catch {
    return []
  }
}

/**
 * @deprecated Use getRemotePluginInstalls instead
 */
export function getRemotePluginSymlinks(pluginDir: string = DEFAULT_PLUGIN_DIR): string[] {
  return getRemotePluginInstalls(pluginDir)
}

/**
 * Clean up stale plugin installs.
 * Removes any _remote_* files (symlinks or copies) that are not in the current set.
 * 
 * @param currentInstalls Set of install names that should exist
 * @param pluginDir Optional directory to use (defaults to ~/.config/opencode/plugin)
 */
export function cleanupStalePluginInstalls(
  currentInstalls: Set<string>,
  pluginDir: string = DEFAULT_PLUGIN_DIR
): PluginCleanupResult {
  const startTime = Date.now()
  logDebug("Checking for stale plugin installations...", "CLEANUP")
  
  const result: PluginCleanupResult = {
    removed: [],
    errors: [],
  }
  
  const existing = getRemotePluginInstalls(pluginDir)
  const stalePlugins = existing.filter(name => !currentInstalls.has(name))
  
  if (stalePlugins.length === 0) {
    logDebug("No stale plugins found", "CLEANUP")
    return result
  }
  
  log(`Found ${stalePlugins.length} stale plugin(s) to remove`, "CLEANUP")
  
  for (const name of stalePlugins) {
    const installPath = path.join(pluginDir, name)
    try {
      log(`Removing stale plugin: ${name}`, "CLEANUP")
      removePathIfExists(installPath)
      result.removed.push(name)
    } catch (err) {
      const errorMsg = `Failed to remove ${name}: ${err instanceof Error ? err.message : String(err)}`
      logError(errorMsg, "CLEANUP")
      result.errors.push(errorMsg)
    }
  }
  
  logEndWithTime(`Plugin cleanup completed: ${result.removed.length} removed, ${result.errors.length} errors`, startTime, "CLEANUP")
  
  return result
}

/**
 * @deprecated Use cleanupStalePluginInstalls instead
 */
export function cleanupStalePluginSymlinks(
  currentSymlinks: Set<string>,
  pluginDir: string = DEFAULT_PLUGIN_DIR
): PluginCleanupResult {
  return cleanupStalePluginInstalls(currentSymlinks, pluginDir)
}

/**
 * Get the full path to a plugin install
 * @param installName Install filename
 * @param pluginDir Optional directory to use (defaults to ~/.config/opencode/plugin)
 */
export function getPluginInstallPath(
  installName: string,
  pluginDir: string = DEFAULT_PLUGIN_DIR
): string {
  return path.join(pluginDir, installName)
}

/**
 * @deprecated Use getPluginInstallPath instead
 */
export function getPluginSymlinkPath(
  symlinkName: string,
  pluginDir: string = DEFAULT_PLUGIN_DIR
): string {
  return getPluginInstallPath(symlinkName, pluginDir)
}

/**
 * Check if a name is a remote plugin install
 */
export function isRemotePluginInstall(name: string): boolean {
  return name.startsWith(REMOTE_PREFIX)
}

/**
 * @deprecated Use isRemotePluginInstall instead
 */
export function isRemotePluginSymlink(name: string): boolean {
  return isRemotePluginInstall(name)
}
