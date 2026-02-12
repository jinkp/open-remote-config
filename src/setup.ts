#!/usr/bin/env bun
/**
 * Setup script for opencode-remote-config
 * 
 * Usage:
 *   bunx opencode-remote-config-setup
 *   npx opencode-remote-config-setup
 * 
 * This script:
 * 1. Creates .opencode directory if needed
 * 2. Downloads the plugin from Bitbucket (zip)
 * 3. Extracts it to node_modules (without .git)
 * 4. Creates a default remote-config.json if needed
 * 5. Updates opencode.json to include the plugin
 * 6. Installs plugin dependencies
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync, copyFileSync, statSync } from "fs"
import { join, basename } from "path"
import { $ } from "bun"
import { Readable } from "stream"
import { createWriteStream } from "fs"
import { pipeline } from "stream/promises"

const PLUGIN_NAME = "opencode-remote-config"
const PLUGIN_ZIP_URL = "https://bitbucket.org/softrestaurant-team/opencode-remote-config/get/main.zip"

async function downloadFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.statusText}`)
  }
  const fileStream = createWriteStream(destPath)
  await pipeline(Readable.fromWeb(response.body as any), fileStream)
}

async function extractZip(zipPath: string, destDir: string): Promise<void> {
  // Use PowerShell on Windows to extract zip
  const isWindows = process.platform === "win32"
  
  if (isWindows) {
    await $`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`
  } else {
    await $`unzip -o ${zipPath} -d ${destDir}`
  }
}

function copyDirRecursive(src: string, dest: string): void {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true })
  }
  
  const entries = readdirSync(src, { withFileTypes: true })
  
  for (const entry of entries) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)
    
    // Skip .git directory
    if (entry.name === ".git") continue
    
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

async function main() {
  const cwd = process.cwd()
  const opencodeDir = join(cwd, ".opencode")
  const nodeModulesDir = join(opencodeDir, "node_modules")
  const pluginDir = join(nodeModulesDir, PLUGIN_NAME)
  
  console.log("🔧 OpenCode Remote Config Setup\n")
  
  // 1. Create .opencode directory
  if (!existsSync(opencodeDir)) {
    mkdirSync(opencodeDir, { recursive: true })
    console.log("✓ Created .opencode directory")
  } else {
    console.log("✓ .opencode directory exists")
  }
  
  // 2. Download and extract plugin
  if (!existsSync(pluginDir)) {
    console.log("📥 Downloading plugin from Bitbucket...")
    
    const tempDir = join(opencodeDir, "_temp")
    const zipPath = join(opencodeDir, "plugin.zip")
    
    try {
      // Create temp directory
      mkdirSync(tempDir, { recursive: true })
      mkdirSync(nodeModulesDir, { recursive: true })
      
      // Download zip
      await downloadFile(PLUGIN_ZIP_URL, zipPath)
      console.log("✓ Downloaded plugin")
      
      // Extract zip
      await extractZip(zipPath, tempDir)
      console.log("✓ Extracted plugin")
      
      // Find extracted folder (Bitbucket adds a prefix)
      const extractedFolders = readdirSync(tempDir).filter(f => 
        statSync(join(tempDir, f)).isDirectory()
      )
      
      if (extractedFolders.length === 0) {
        throw new Error("No folder found in zip")
      }
      
      const extractedFolder = join(tempDir, extractedFolders[0])
      
      // Copy to node_modules (without .git)
      copyDirRecursive(extractedFolder, pluginDir)
      console.log("✓ Installed plugin to node_modules")
      
      // Cleanup
      rmSync(tempDir, { recursive: true, force: true })
      rmSync(zipPath, { force: true })
      
    } catch (err) {
      // Cleanup on error
      if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true })
      if (existsSync(zipPath)) rmSync(zipPath, { force: true })
      throw err
    }
  } else {
    console.log("✓ Plugin already installed")
  }
  
  // 3. Install plugin dependencies
  console.log("\n📦 Installing plugin dependencies...")
  
  try {
    await $`bun install`.cwd(pluginDir).quiet()
    console.log("✓ Plugin dependencies installed")
  } catch {
    try {
      await $`npm install`.cwd(pluginDir).quiet()
      console.log("✓ Plugin dependencies installed")
    } catch {
      console.log("⚠ Could not install plugin dependencies automatically")
      console.log("  Run manually: cd .opencode/node_modules/opencode-remote-config && bun install")
    }
  }
  
  // 4. Create default remote-config.json if not exists
  const remoteConfigPath = join(opencodeDir, "remote-config.json")
  if (!existsSync(remoteConfigPath)) {
    const defaultConfig = {
      repositories: [
        {
          url: "https://bitbucket.org/your-org/your-skills-repo.git",
          ref: "main"
        }
      ],
      installMethod: "copy",
      logLevel: "info"
    }
    writeFileSync(remoteConfigPath, JSON.stringify(defaultConfig, null, 2) + "\n")
    console.log("✓ Created remote-config.json (edit this file to add your repositories)")
  } else {
    console.log("✓ remote-config.json already exists")
  }
  
  // 5. Update/create opencode.json
  const opencodeJsonPath = join(opencodeDir, "opencode.json")
  let opencodeJson: Record<string, unknown> = {}
  
  if (existsSync(opencodeJsonPath)) {
    try {
      opencodeJson = JSON.parse(readFileSync(opencodeJsonPath, "utf-8"))
    } catch {
      console.log("⚠ Could not parse existing opencode.json, creating new one")
    }
  }
  
  // Ensure $schema
  if (!opencodeJson.$schema) {
    opencodeJson.$schema = "https://opencode.ai/config.json"
  }
  
  // Ensure plugin array exists and includes our plugin with relative path
  if (!Array.isArray(opencodeJson.plugin)) {
    opencodeJson.plugin = []
  }
  
  const pluginPath = "./node_modules/opencode-remote-config"
  const plugins = opencodeJson.plugin as string[]
  
  // Remove old reference if exists and add new path-based one
  const oldIndex = plugins.indexOf(PLUGIN_NAME)
  if (oldIndex !== -1) {
    plugins.splice(oldIndex, 1)
  }
  
  if (!plugins.includes(pluginPath)) {
    plugins.push(pluginPath)
    writeFileSync(opencodeJsonPath, JSON.stringify(opencodeJson, null, 2) + "\n")
    console.log("✓ Added plugin to opencode.json")
  } else {
    console.log("✓ Plugin already in opencode.json")
  }
  
  console.log("\n🎉 Setup complete!\n")
  console.log("Next steps:")
  console.log("1. Edit .opencode/remote-config.json to add your skill repositories")
  console.log("2. Start OpenCode\n")
}

main().catch((err) => {
  console.error("✗ Setup failed:", err.message)
  process.exit(1)
})
