import * as path from "path"
import * as fs from "fs"
import { $ } from "bun"
import type { SkillInfo, SyncResult } from "./git"

/** Base directory for OpenCode skills */
const SKILL_BASE = path.join(
  process.env.HOME || "~",
  ".config",
  "opencode",
  "skill"
)

/** Directory for plugin-managed skills */
const PLUGINS_DIR = path.join(SKILL_BASE, "_plugins")

/**
 * Information about a symlink operation
 */
export interface SymlinkResult {
  skillName: string
  sourcePath: string
  targetPath: string
  created: boolean
  error?: string
}

/**
 * Information about cleaning up stale symlinks
 */
export interface CleanupResult {
  removed: string[]
  errors: string[]
}

/**
 * Get the path where a skill symlink should be created
 */
export function getSymlinkPath(repoShortName: string, skillName: string): string {
  return path.join(PLUGINS_DIR, repoShortName, skillName)
}

/**
 * Ensure the _plugins directory structure exists
 */
export function ensurePluginsDir(): void {
  fs.mkdirSync(PLUGINS_DIR, { recursive: true })
}

/**
 * Create a symlink for a skill
 * 
 * @param skill The skill to create a symlink for
 * @param repoShortName The short name of the repository
 * @returns Result of the symlink operation
 */
export function createSkillSymlink(
  skill: SkillInfo,
  repoShortName: string
): SymlinkResult {
  const targetPath = getSymlinkPath(repoShortName, skill.name)
  const result: SymlinkResult = {
    skillName: skill.name,
    sourcePath: skill.path,
    targetPath,
    created: false,
  }
  
  try {
    // Ensure parent directory exists
    fs.mkdirSync(path.dirname(targetPath), { recursive: true })
    
    // Check if symlink already exists
    if (fs.existsSync(targetPath)) {
      const stats = fs.lstatSync(targetPath)
      
      if (stats.isSymbolicLink()) {
        const existingTarget = fs.readlinkSync(targetPath)
        
        // If pointing to same location, nothing to do
        if (existingTarget === skill.path) {
          return result
        }
        
        // Remove old symlink
        fs.unlinkSync(targetPath)
      } else {
        // Not a symlink, don't overwrite
        result.error = `Path exists and is not a symlink: ${targetPath}`
        return result
      }
    }
    
    // Create the symlink
    fs.symlinkSync(skill.path, targetPath, "dir")
    result.created = true
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err)
  }
  
  return result
}

/**
 * Create symlinks for all skills from a sync result
 */
export function createSymlinksForRepo(syncResult: SyncResult): SymlinkResult[] {
  ensurePluginsDir()
  
  const results: SymlinkResult[] = []
  
  for (const skill of syncResult.skills) {
    const result = createSkillSymlink(skill, syncResult.shortName)
    results.push(result)
  }
  
  return results
}

/**
 * Get all existing symlinks in the _plugins directory
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
 * Remove symlinks that are no longer needed
 * 
 * @param currentSkills Set of skill paths that should exist (format: "repo/skill")
 * @returns Cleanup result
 */
export function cleanupStaleSymlinks(currentSkills: Set<string>): CleanupResult {
  const result: CleanupResult = {
    removed: [],
    errors: [],
  }
  
  const existingSymlinks = getExistingSymlinks()
  
  for (const [relativePath] of existingSymlinks) {
    if (!currentSkills.has(relativePath)) {
      const fullPath = path.join(PLUGINS_DIR, relativePath)
      
      try {
        fs.unlinkSync(fullPath)
        result.removed.push(relativePath)
        
        // Try to remove empty parent directories
        let parentDir = path.dirname(fullPath)
        while (parentDir !== PLUGINS_DIR && parentDir.startsWith(PLUGINS_DIR)) {
          try {
            const entries = fs.readdirSync(parentDir)
            if (entries.length === 0) {
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
        result.errors.push(
          `Failed to remove ${relativePath}: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }
  }
  
  return result
}

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
    const realPath = fs.realpathSync(localSkillPath)
    return !realPath.includes("_plugins")
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
