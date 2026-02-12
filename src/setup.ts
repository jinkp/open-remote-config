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
 * 2. Clones the plugin from Bitbucket (shallow clone)
 * 3. Removes .git folder to avoid nested repos
 * 4. Creates a default remote-config.json if needed
 * 5. Updates opencode.json to include the plugin
 * 6. Installs plugin dependencies
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "fs"
import { join } from "path"
import { $ } from "bun"

const PLUGIN_NAME = "opencode-remote-config"
const PLUGIN_REPO_URL = "https://bitbucket.org/softrestaurant-team/opencode-remote-config.git"

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
  
  // 2. Clone plugin (shallow clone)
  if (!existsSync(pluginDir)) {
    console.log("📥 Cloning plugin from Bitbucket...")
    
    try {
      // Create node_modules directory
      mkdirSync(nodeModulesDir, { recursive: true })
      
      // Shallow clone
      await $`git clone --depth 1 ${PLUGIN_REPO_URL} ${pluginDir}`.quiet()
      console.log("✓ Cloned plugin")
      
      // Remove .git folder to avoid nested repo issues
      const gitDir = join(pluginDir, ".git")
      if (existsSync(gitDir)) {
        rmSync(gitDir, { recursive: true, force: true })
        console.log("✓ Removed .git folder")
      }
      
    } catch (err) {
      // Cleanup on error
      if (existsSync(pluginDir)) rmSync(pluginDir, { recursive: true, force: true })
      throw new Error(`Failed to clone plugin: ${err instanceof Error ? err.message : err}`)
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
