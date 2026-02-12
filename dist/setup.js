#!/usr/bin/env bun
// @bun

// src/setup.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
var {$ } = globalThis.Bun;
var PLUGIN_NAME = "opencode-remote-config";
var PLUGIN_URL = "git+https://bitbucket.org/softrestaurant-team/opencode-remote-config.git";
async function main() {
  const cwd = process.cwd();
  const opencodeDir = join(cwd, ".opencode");
  console.log(`\uD83D\uDD27 OpenCode Remote Config Setup
`);
  if (!existsSync(opencodeDir)) {
    mkdirSync(opencodeDir, { recursive: true });
    console.log("\u2713 Created .opencode directory");
  } else {
    console.log("\u2713 .opencode directory exists");
  }
  const packageJsonPath = join(opencodeDir, "package.json");
  let packageJson = {};
  if (existsSync(packageJsonPath)) {
    try {
      packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    } catch {
      console.log("\u26A0 Could not parse existing package.json, creating new one");
    }
  }
  if (!packageJson.dependencies || typeof packageJson.dependencies !== "object") {
    packageJson.dependencies = {};
  }
  const deps = packageJson.dependencies;
  if (!deps[PLUGIN_NAME]) {
    deps[PLUGIN_NAME] = PLUGIN_URL;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + `
`);
    console.log("\u2713 Added opencode-remote-config to package.json");
  } else {
    console.log("\u2713 opencode-remote-config already in package.json");
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
  const plugins = opencodeJson.plugin;
  if (!plugins.includes(PLUGIN_NAME)) {
    plugins.push(PLUGIN_NAME);
    writeFileSync(opencodeJsonPath, JSON.stringify(opencodeJson, null, 2) + `
`);
    console.log("\u2713 Added opencode-remote-config to opencode.json plugins");
  } else {
    console.log("\u2713 opencode-remote-config already in opencode.json plugins");
  }
  console.log(`
\uD83D\uDCE6 Installing dependencies...
`);
  try {
    await $`bun install`.cwd(opencodeDir);
    console.log(`
\u2713 Dependencies installed with bun`);
  } catch {
    try {
      await $`npm install`.cwd(opencodeDir);
      console.log(`
\u2713 Dependencies installed with npm`);
    } catch (err) {
      console.error(`
\u2717 Failed to install dependencies. Run manually:`);
      console.error("  cd .opencode && bun install");
    }
  }
  console.log(`
\uD83C\uDF89 Setup complete!
`);
  console.log("Next steps:");
  console.log("1. Edit .opencode/remote-config.json to add your skill repositories");
  console.log(`2. Start OpenCode
`);
}
main().catch(console.error);
