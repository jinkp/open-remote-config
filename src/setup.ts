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
 * 2. Adds the plugin to .opencode/package.json
 * 3. Creates a default remote-config.json if needed
 * 4. Updates opencode.json to include the plugin
 * 5. Runs bun/npm install
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"
import { $ } from "bun"

const PLUGIN_NAME = "opencode-remote-config"
const PLUGIN_URL = "git+https://bitbucket.org/softrestaurant-team/opencode-remote-config.git"
const OPENCODE_PLUGIN = "@opencode-ai/plugin"
const OPENCODE_PLUGIN_VERSION = "^1.1.0"

async function main() {
  const cwd = process.cwd()
  const opencodeDir = join(cwd, ".opencode")
  
  console.log("🔧 OpenCode Remote Config Setup\n")
  
  // 1. Create .opencode directory
  if (!existsSync(opencodeDir)) {
    mkdirSync(opencodeDir, { recursive: true })
    console.log("✓ Created .opencode directory")
  } else {
    console.log("✓ .opencode directory exists")
  }
  
  // 2. Update/create package.json
  const packageJsonPath = join(opencodeDir, "package.json")
  let packageJson: Record<string, unknown> = {}
  
  if (existsSync(packageJsonPath)) {
    try {
      packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"))
    } catch {
      console.log("⚠ Could not parse existing package.json, creating new one")
    }
  }
  
  // Ensure dependencies object exists
  if (!packageJson.dependencies || typeof packageJson.dependencies !== "object") {
    packageJson.dependencies = {}
  }
  
  const deps = packageJson.dependencies as Record<string, string>
  let updated = false
  
  // Add @opencode-ai/plugin if not present
  if (!deps[OPENCODE_PLUGIN]) {
    deps[OPENCODE_PLUGIN] = OPENCODE_PLUGIN_VERSION
    updated = true
    console.log("✓ Added @opencode-ai/plugin to package.json")
  } else {
    console.log("✓ @opencode-ai/plugin already in package.json")
  }
  
  // Add plugin if not present
  if (!deps[PLUGIN_NAME]) {
    deps[PLUGIN_NAME] = PLUGIN_URL
    updated = true
    console.log("✓ Added opencode-remote-config to package.json")
  } else {
    console.log("✓ opencode-remote-config already in package.json")
  }
  
  if (updated) {
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n")
  }
  
  // 3. Create default remote-config.json if not exists
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
  
  // 4. Update/create opencode.json
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
  
  // Ensure plugin array exists and includes our plugin
  if (!Array.isArray(opencodeJson.plugin)) {
    opencodeJson.plugin = []
  }
  
  const plugins = opencodeJson.plugin as string[]
  if (!plugins.includes(PLUGIN_NAME)) {
    plugins.push(PLUGIN_NAME)
    writeFileSync(opencodeJsonPath, JSON.stringify(opencodeJson, null, 2) + "\n")
    console.log("✓ Added opencode-remote-config to opencode.json plugins")
  } else {
    console.log("✓ opencode-remote-config already in opencode.json plugins")
  }
  
  // 5. Run install
  console.log("\n📦 Installing dependencies...\n")
  
  try {
    // Try bun first
    await $`bun install`.cwd(opencodeDir)
    console.log("\n✓ Dependencies installed with bun")
  } catch {
    try {
      // Fallback to npm
      await $`npm install`.cwd(opencodeDir)
      console.log("\n✓ Dependencies installed with npm")
    } catch (err) {
      console.error("\n✗ Failed to install dependencies. Run manually:")
      console.error("  cd .opencode && bun install")
    }
  }
  
  console.log("\n🎉 Setup complete!\n")
  console.log("Next steps:")
  console.log("1. Edit .opencode/remote-config.json to add your skill repositories")
  console.log("2. Start OpenCode\n")
}

main().catch(console.error)
