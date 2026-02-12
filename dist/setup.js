#!/usr/bin/env bun
// @bun

// src/setup.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
var {$ } = globalThis.Bun;
var PLUGIN_NAME = "opencode-remote-config";
var PLUGIN_REPO_URL = "https://bitbucket.org/softrestaurant-team/opencode-remote-config.git";
async function main() {
  const cwd = process.cwd();
  const opencodeDir = join(cwd, ".opencode");
  const nodeModulesDir = join(opencodeDir, "node_modules");
  const pluginDir = join(nodeModulesDir, PLUGIN_NAME);
  console.log(`\uD83D\uDD27 OpenCode Remote Config Setup
`);
  if (!existsSync(opencodeDir)) {
    mkdirSync(opencodeDir, { recursive: true });
    console.log("\u2713 Created .opencode directory");
  } else {
    console.log("\u2713 .opencode directory exists");
  }
  if (!existsSync(pluginDir)) {
    console.log("\uD83D\uDCE5 Cloning plugin from Bitbucket...");
    try {
      mkdirSync(nodeModulesDir, { recursive: true });
      await $`git clone --depth 1 ${PLUGIN_REPO_URL} ${pluginDir}`.quiet();
      console.log("\u2713 Cloned plugin");
      const gitDir = join(pluginDir, ".git");
      if (existsSync(gitDir)) {
        rmSync(gitDir, { recursive: true, force: true });
        console.log("\u2713 Removed .git folder");
      }
    } catch (err) {
      if (existsSync(pluginDir))
        rmSync(pluginDir, { recursive: true, force: true });
      throw new Error(`Failed to clone plugin: ${err instanceof Error ? err.message : err}`);
    }
  } else {
    console.log("\u2713 Plugin already installed");
  }
  console.log(`
\uD83D\uDCE6 Installing plugin dependencies...`);
  try {
    await $`bun install`.cwd(pluginDir).quiet();
    console.log("\u2713 Plugin dependencies installed");
  } catch {
    try {
      await $`npm install`.cwd(pluginDir).quiet();
      console.log("\u2713 Plugin dependencies installed");
    } catch {
      console.log("\u26A0 Could not install plugin dependencies automatically");
      console.log("  Run manually: cd .opencode/node_modules/opencode-remote-config && bun install");
    }
  }
  const remoteConfigPath = join(opencodeDir, "remote-config.json");
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
    };
    writeFileSync(remoteConfigPath, JSON.stringify(defaultConfig, null, 2) + `
`);
    console.log("\u2713 Created remote-config.json (edit this file to add your repositories)");
  } else {
    console.log("\u2713 remote-config.json already exists");
  }
  const opencodeJsonPath = join(opencodeDir, "opencode.json");
  let opencodeJson = {};
  if (existsSync(opencodeJsonPath)) {
    try {
      opencodeJson = JSON.parse(readFileSync(opencodeJsonPath, "utf-8"));
    } catch {
      console.log("\u26A0 Could not parse existing opencode.json, creating new one");
    }
  }
  if (!opencodeJson.$schema) {
    opencodeJson.$schema = "https://opencode.ai/config.json";
  }
  if (!Array.isArray(opencodeJson.plugin)) {
    opencodeJson.plugin = [];
  }
  const pluginPath = "./node_modules/opencode-remote-config";
  const plugins = opencodeJson.plugin;
  const oldIndex = plugins.indexOf(PLUGIN_NAME);
  if (oldIndex !== -1) {
    plugins.splice(oldIndex, 1);
  }
  if (!plugins.includes(pluginPath)) {
    plugins.push(pluginPath);
    writeFileSync(opencodeJsonPath, JSON.stringify(opencodeJson, null, 2) + `
`);
    console.log("\u2713 Added plugin to opencode.json");
  } else {
    console.log("\u2713 Plugin already in opencode.json");
  }
  console.log(`
\uD83C\uDF89 Setup complete!
`);
  console.log("Next steps:");
  console.log("1. Edit .opencode/remote-config.json to add your skill repositories");
  console.log(`2. Start OpenCode
`);
}
main().catch((err) => {
  console.error("\u2717 Setup failed:", err.message);
  process.exit(1);
});
