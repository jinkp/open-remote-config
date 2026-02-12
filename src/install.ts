import * as path from "path"
import * as fs from "fs"
import { homedir } from "os"
import { $ } from "bun"
import type { SkillInfo, SyncResult } from "./git"
import { syncDirectory } from "./copy"
import { IS_WINDOWS, DEFAULT_INSTALL_METHOD } from "./config"
import { log, logDebug, logError, logWarn, logEndWithTime } from "./logging"

/** How to install skills: symlink or copy */
export type InstallMethod = "link" | "copy"

/** Base directory for OpenCode skills */
const SKILL_BASE = path.join(
  homedir(),
  ".config",
  "opencode",
  "skill"
)

/** Directory for plugin-managed skills */
const PLUGINS_DIR = path.join(SKILL_BASE, "_plugins")

/**
 * Information about an install operation (symlink or copy)
 */
export interface InstallResult {
  skillName: string
  sourcePath: string
  targetPath: string
  created: boolean
  error?: string
}

/**
 * @deprecated Use InstallResult instead
 */
export type SymlinkResult = InstallResult

/**
 * Information about cleaning up stale symlinks
 */
export interface CleanupResult {
  removed: string[]
  errors: string[]
}

/**
 * Get the path where a skill should be installed
 */
export function getInstallPath(repoShortName: string, skillName: string): string {
  return path.join(PLUGINS_DIR, repoShortName, skillName)
}

/**
 * @deprecated Use getInstallPath instead
 */
export const getSymlinkPath = getInstallPath

/**
 * Ensure the _plugins directory structure exists
 */
export function ensurePluginsDir(): void {
  fs.mkdirSync(PLUGINS_DIR, { recursive: true })
}

/**
 * Internal helper: create a symlink for a skill (sync).
 * Used by both createSkillInstall (for link mode) and deprecated createSkillSymlink.
 * On Windows, symlinks require admin privileges or developer mode - this is handled
 * by the caller which should fall back to copy mode if symlink creation fails.
 */
function createSymlinkSync(
  sourcePath: string,
  targetPath: string
): { created: boolean; error?: string; requiresFallback?: boolean } {
  logDebug(`Creating symlink: ${sourcePath} -> ${targetPath}`, "INSTALL")
  
  // Check if symlink already exists
  if (fs.existsSync(targetPath)) {
    const stats = fs.lstatSync(targetPath)
    
    if (stats.isSymbolicLink()) {
      const existingTarget = fs.readlinkSync(targetPath)
      
      // If pointing to same location, nothing to do
      if (existingTarget === sourcePath) {
        logDebug(`Symlink already exists and points to same location, skipping`, "INSTALL")
        return { created: false }
      }
      
      // Remove old symlink pointing to different location
      logDebug(`Removing old symlink pointing to different location`, "INSTALL")
      fs.unlinkSync(targetPath)
    } else {
      // Existing directory or file (from copy mode) - remove it to make way for symlink
      logDebug(`Removing existing ${stats.isFile() ? "file" : "directory"} to create symlink`, "INSTALL")
      if (stats.isFile()) {
        fs.unlinkSync(targetPath)
      } else if (stats.isDirectory()) {
        fs.rmSync(targetPath, { recursive: true, force: true })
      }
    }
  }
  
  // Create the symlink
  try {
    // Use 'junction' type on Windows for directories (doesn't require admin)
    // 'dir' type requires admin privileges or developer mode on Windows
    const type = process.platform === "win32" ? "junction" : "dir"
    fs.symlinkSync(sourcePath, targetPath, type)
    logDebug(`Symlink created successfully`, "INSTALL")
    return { created: true }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    // On Windows, EPERM indicates missing privileges for symlinks
    const requiresFallback = IS_WINDOWS && 
      (errorMessage.includes("EPERM") || errorMessage.includes("operation not permitted"))
    if (requiresFallback) {
      logWarn(`Symlink creation failed (EPERM), will attempt fallback to copy`, "INSTALL")
    } else {
      logError(`Symlink creation failed: ${errorMessage}`, "INSTALL")
    }
    return { created: false, error: errorMessage, requiresFallback }
  }
}

/**
 * Install a skill (symlink or copy)
 * 
 * @param skill The skill to install
 * @param repoShortName The short name of the repository
 * @param installMethod How to install: "link" (symlink) or "copy" (file copy)
 * @returns Result of the install operation
 */
export async function createSkillInstall(
  skill: SkillInfo,
  repoShortName: string,
  installMethod: InstallMethod = "link"
): Promise<InstallResult> {
  const startTime = Date.now()
  const targetPath = getInstallPath(repoShortName, skill.name)
  
  log(`Installing skill: ${skill.name} (method: ${installMethod})`, "INSTALL")
  logDebug(`Source: ${skill.path}`, "INSTALL")
  logDebug(`Target: ${targetPath}`, "INSTALL")
  
  const result: InstallResult = {
    skillName: skill.name,
    sourcePath: skill.path,
    targetPath,
    created: false,
  }
  
  try {
    // Ensure parent directory exists
    fs.mkdirSync(path.dirname(targetPath), { recursive: true })
    
    if (installMethod === "copy") {
      // Copy mode: check if already correctly installed
      if (fs.existsSync(targetPath)) {
        const stats = fs.lstatSync(targetPath)
        // If it's already a directory (not a symlink), it's already in copy mode - skip
        if (stats.isDirectory() && !stats.isSymbolicLink()) {
          logDebug(`Skill already installed (copy mode), skipping: ${skill.name}`, "INSTALL")
          result.created = false
          return result
        }
        // Otherwise it's a symlink or file from previous install - syncDirectory will replace it
      }
      
      // Copy the directory (will remove existing symlink/file first)
      await syncDirectory(skill.path, targetPath)
      result.created = true
      logEndWithTime(`Skill installed (copy): ${skill.name}`, startTime, "INSTALL")
    } else {
      // Link mode: delegate to shared helper
      const symlinkResult = createSymlinkSync(skill.path, targetPath)
      result.created = symlinkResult.created
      if (symlinkResult.error) {
        result.error = symlinkResult.error
        // On Windows, if symlink failed due to permissions, fall back to copy mode
        if (symlinkResult.requiresFallback) {
          log(`Falling back to copy mode for: ${skill.name}`, "INSTALL")
          try {
            await syncDirectory(skill.path, targetPath)
            result.created = true
            result.error = undefined  // Clear error since fallback succeeded
            logEndWithTime(`Skill installed (copy fallback): ${skill.name}`, startTime, "INSTALL")
          } catch (copyErr) {
            result.error = `Symlink failed: ${symlinkResult.error}. Copy fallback also failed: ${copyErr instanceof Error ? copyErr.message : String(copyErr)}`
            logError(result.error, "INSTALL")
          }
        }
      } else if (result.created) {
        logEndWithTime(`Skill installed (link): ${skill.name}`, startTime, "INSTALL")
      }
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err)
    logError(`Failed to install skill ${skill.name}: ${result.error}`, "INSTALL")
  }
  
  return result
}

/**
 * @deprecated Use createSkillInstall instead
 */
export function createSkillSymlink(
  skill: SkillInfo,
  repoShortName: string
): InstallResult {
  const targetPath = getInstallPath(repoShortName, skill.name)
  const result: InstallResult = {
    skillName: skill.name,
    sourcePath: skill.path,
    targetPath,
    created: false,
  }
  
  try {
    // Ensure parent directory exists
    fs.mkdirSync(path.dirname(targetPath), { recursive: true })
    
    // Delegate to shared helper
    const symlinkResult = createSymlinkSync(skill.path, targetPath)
    result.created = symlinkResult.created
    if (symlinkResult.error) {
      result.error = symlinkResult.error
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err)
  }
  
  return result
}

/**
 * Install all skills from a sync result
 * 
 * @param syncResult The sync result containing skills to install
 * @param installMethod How to install: "link" (symlink) or "copy" (file copy)
 * @returns Results of all install operations
 */
export async function createInstallsForRepo(
  syncResult: SyncResult,
  installMethod: InstallMethod = "link"
): Promise<InstallResult[]> {
  const startTime = Date.now()
  log(`Installing ${syncResult.skills.length} skill(s) from ${syncResult.shortName}`, "INSTALL")
  
  ensurePluginsDir()
  
  const results: InstallResult[] = []
  
  for (const skill of syncResult.skills) {
    const result = await createSkillInstall(skill, syncResult.shortName, installMethod)
    results.push(result)
  }
  
  const successCount = results.filter(r => r.created && !r.error).length
  const errorCount = results.filter(r => r.error).length
  
  logEndWithTime(`Installed ${successCount}/${results.length} skills from ${syncResult.shortName}${errorCount > 0 ? ` (${errorCount} errors)` : ""}`, startTime, "INSTALL")
  
  return results
}

/**
 * @deprecated Use createInstallsForRepo instead
 */
export function createSymlinksForRepo(syncResult: SyncResult): InstallResult[] {
  ensurePluginsDir()
  
  const results: InstallResult[] = []
  
  for (const skill of syncResult.skills) {
    const result = createSkillSymlink(skill, syncResult.shortName)
    results.push(result)
  }
  
  return results
}

/**
 * Get all existing installed skills in the _plugins directory
 * Returns both symlinks and copied directories (detects SKILL.md files)
 */
export function getExistingInstalls(): Map<string, string> {
  const installs = new Map<string, string>()
  
  if (!fs.existsSync(PLUGINS_DIR)) {
    return installs
  }
  
  // Scan repo directories
  const repoEntries = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true })
  
  for (const repoEntry of repoEntries) {
    if (repoEntry.name.startsWith(".") || !repoEntry.isDirectory()) continue
    
    const repoPath = path.join(PLUGINS_DIR, repoEntry.name)
    const skillEntries = fs.readdirSync(repoPath, { withFileTypes: true })
    
    for (const skillEntry of skillEntries) {
      if (skillEntry.name.startsWith(".")) continue
      
      const fullPath = path.join(repoPath, skillEntry.name)
      const relativePath = `${repoEntry.name}/${skillEntry.name}`
      
      if (skillEntry.isSymbolicLink()) {
        // Symlink mode
        const target = fs.readlinkSync(fullPath)
        installs.set(relativePath, target)
      } else if (skillEntry.isDirectory()) {
        // Copy mode: track all non-hidden directories for cleanup
        installs.set(relativePath, fullPath)
      }
    }
  }
  
  return installs
}

/**
 * @deprecated Use getExistingInstalls instead
 */
export function getExistingSymlinks(): Map<string, string> {
  const symlinks = new Map<string, string>()
  
  if (!fs.existsSync(PLUGINS_DIR)) {
    return symlinks
  }
  
  const scanDir = (dir: string, prefix: string = "") => {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue
      
      const fullPath = path.join(dir, entry.name)
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
      
      if (entry.isSymbolicLink()) {
        const target = fs.readlinkSync(fullPath)
        symlinks.set(relativePath, target)
      } else if (entry.isDirectory()) {
        scanDir(fullPath, relativePath)
      }
    }
  }
  
  scanDir(PLUGINS_DIR)
  return symlinks
}

/**
 * Remove installed skills that are no longer needed
 * Works for both symlinks and copied directories
 * 
 * @param currentSkills Set of skill paths that should exist (format: "repo/skill")
 * @returns Cleanup result
 */
export function cleanupStaleInstalls(currentSkills: Set<string>): CleanupResult {
  const startTime = Date.now()
  logDebug("Checking for stale skill installations...", "CLEANUP")
  
  const result: CleanupResult = {
    removed: [],
    errors: [],
  }
  
  const existingInstalls = getExistingInstalls()
  const staleCount = [...existingInstalls.keys()].filter(p => !currentSkills.has(p)).length
  
  if (staleCount === 0) {
    logDebug("No stale installations found", "CLEANUP")
    return result
  }
  
  log(`Found ${staleCount} stale installation(s) to remove`, "CLEANUP")
  
  for (const [relativePath] of existingInstalls) {
    if (!currentSkills.has(relativePath)) {
      const fullPath = path.join(PLUGINS_DIR, relativePath)
      
      try {
        const stats = fs.lstatSync(fullPath)
        
        if (stats.isSymbolicLink()) {
          // Remove symlink
          log(`Removing stale symlink: ${relativePath}`, "CLEANUP")
          fs.unlinkSync(fullPath)
        } else if (stats.isDirectory()) {
          // Remove copied directory
          log(`Removing stale directory: ${relativePath}`, "CLEANUP")
          fs.rmSync(fullPath, { recursive: true, force: true })
        }
        
        result.removed.push(relativePath)
        
        // Try to remove empty parent directories
        let parentDir = path.dirname(fullPath)
        while (parentDir !== PLUGINS_DIR && parentDir.startsWith(PLUGINS_DIR)) {
          try {
            const entries = fs.readdirSync(parentDir)
            if (entries.length === 0) {
              logDebug(`Removing empty directory: ${parentDir}`, "CLEANUP")
              fs.rmdirSync(parentDir)
              parentDir = path.dirname(parentDir)
            } else {
              break
            }
          } catch {
            break
          }
        }
      } catch (err) {
        const errorMsg = `Failed to remove ${relativePath}: ${err instanceof Error ? err.message : String(err)}`
        logError(errorMsg, "CLEANUP")
        result.errors.push(errorMsg)
      }
    }
  }
  
  logEndWithTime(`Cleanup completed: ${result.removed.length} removed, ${result.errors.length} errors`, startTime, "CLEANUP")
  
  return result
}

/**
 * @deprecated Use cleanupStaleInstalls instead
 */
export const cleanupStaleSymlinks = cleanupStaleInstalls

/**
 * Check if a skill name conflicts with a local (non-plugin) skill
 * 
 * @param skillName The skill name to check
 * @returns True if there's a conflict
 */
export function hasLocalConflict(skillName: string): boolean {
  const localSkillPath = path.join(SKILL_BASE, skillName)
  
  // Check if the path exists and is NOT inside _plugins
  if (fs.existsSync(localSkillPath)) {
    try {
      const realPath = path.normalize(fs.realpathSync(localSkillPath))
      const pluginsPath = path.normalize(PLUGINS_DIR)
      // Check if realPath is within PLUGINS_DIR (handles both / and \ on Windows)
      const hasConflict = !realPath.startsWith(pluginsPath + path.sep) && realPath !== pluginsPath
      if (hasConflict) {
        logWarn(`Local conflict detected for skill: ${skillName}`, "INSTALL")
      }
      return hasConflict
    } catch {
      // If realpath fails, assume it's a local skill
      logWarn(`Could not resolve path for skill ${skillName}, assuming local conflict`, "INSTALL")
      return true
    }
  }
  
  return false
}

/**
 * Get the base skill directory path
 */
export function getSkillBasePath(): string {
  return SKILL_BASE
}

/**
 * Get the plugins directory path
 */
export function getPluginsPath(): string {
  return PLUGINS_DIR
}

/**
 * Find the git root for a given path
 * 
 * @param startPath The path to start searching from
 * @returns The git root path, or null if not in a git repo
 */
export async function findGitRoot(startPath: string): Promise<string | null> {
  try {
    const result = await $`git -C ${startPath} rev-parse --show-toplevel`.quiet()
    if (result.exitCode === 0) {
      return result.stdout.toString().trim()
    }
  } catch {
    // Not in a git repo
  }
  return null
}

/**
 * Ensure _plugins/ is in .gitignore at the git root
 * 
 * This prevents accidentally committing imported skills to version control.
 * Only modifies .gitignore if the skill directory is inside a git repository.
 * 
 * @returns Object indicating whether .gitignore was modified
 */
export async function ensureGitignore(): Promise<{ modified: boolean; gitRoot: string | null }> {
  const gitRoot = await findGitRoot(SKILL_BASE)
  
  if (!gitRoot) {
    // Not in a git repo, nothing to do
    return { modified: false, gitRoot: null }
  }
  
  const gitignorePath = path.join(gitRoot, ".gitignore")
  const pluginsEntry = "_plugins/"
  
  // Calculate relative path from git root to _plugins
  const relativePath = path.relative(gitRoot, PLUGINS_DIR)
  const gitignoreEntry = relativePath ? `${relativePath}/` : pluginsEntry
  
  let content = ""
  let exists = false
  
  try {
    content = fs.readFileSync(gitignorePath, "utf-8")
    exists = true
  } catch {
    // .gitignore doesn't exist
  }
  
  // Check if already in .gitignore
  const lines = content.split("\n")
  const alreadyIgnored = lines.some(line => {
    const trimmed = line.trim()
    return trimmed === gitignoreEntry || 
           trimmed === pluginsEntry ||
           trimmed === "_plugins" ||
           trimmed === relativePath
  })
  
  if (alreadyIgnored) {
    return { modified: false, gitRoot }
  }
  
  // Add to .gitignore
  const newContent = exists
    ? content.endsWith("\n")
      ? `${content}# OpenCode remote skills plugin\n${gitignoreEntry}\n`
      : `${content}\n\n# OpenCode remote skills plugin\n${gitignoreEntry}\n`
    : `# OpenCode remote skills plugin\n${gitignoreEntry}\n`
  
  fs.writeFileSync(gitignorePath, newContent)
  
  return { modified: true, gitRoot }
}
