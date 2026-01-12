import { existsSync } from "fs"
import { join, normalize, resolve, sep } from "path"
import { loadManifest, containsPathTraversal } from "./manifest"

/**
 * Information about a discovered instruction file.
 */
export interface InstructionInfo {
  /** Relative path from manifest (e.g., 'session-protocol.md') */
  name: string
  /** Absolute path to the file */
  path: string
}

/**
 * Discover instruction files from a repository's manifest.
 *
 * Loads the manifest.json from the repository root and resolves
 * each instruction path to an absolute file path. Only includes
 * instructions where the file actually exists on disk.
 *
 * @param repoPath - The path to the repository root
 * @returns Array of InstructionInfo for existing instruction files
 */
export function discoverInstructions(repoPath: string): InstructionInfo[] {
  const result = loadManifest(repoPath)

  if (result.status === "not-found") {
    return []
  }

  if (result.status === "invalid") {
    console.warn(
      `[remote-config] Skipping instructions for ${repoPath}: invalid manifest.json`
    )
    return []
  }

  const manifest = result.manifest
  const instructions: InstructionInfo[] = []

  for (const instructionName of manifest.instructions) {
    // Defense-in-depth: reject paths with traversal segments
    // (manifest validation should have caught this, but verify here too)
    if (containsPathTraversal(instructionName)) {
      console.warn(
        `[remote-config] Skipping instruction with path traversal: ${instructionName}`
      )
      continue
    }

    const absolutePath = join(repoPath, instructionName)

    // Defense-in-depth: verify resolved path is within repoPath
    // Note: This is a lexical check only - symlinks are not resolved.
    // Primary protection is manifest schema validation; this is a secondary guard.
    const resolvedPath = normalize(resolve(absolutePath))
    const resolvedRepoPath = normalize(resolve(repoPath))
    if (!resolvedPath.startsWith(resolvedRepoPath + sep)) {
      console.warn(
        `[remote-config] Skipping instruction outside repository: ${instructionName}`
      )
      continue
    }

    if (existsSync(absolutePath)) {
      instructions.push({
        name: instructionName,
        path: absolutePath,
      })
    }
    // Silently skip missing files
  }

  return instructions
}
