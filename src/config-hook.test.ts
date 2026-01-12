import { describe, test, expect } from "bun:test"
import type { AgentConfig } from "./agent"
import type { AgentInfo, SyncResult, InstructionInfo } from "./git"

/**
 * Tests for agent collection and config injection logic.
 * These tests verify the core behavior of how agents are collected
 * from sync results and injected into the config.
 */

interface RemoteAgent {
  config: AgentConfig
  source: string
}

/**
 * Collect agents from sync results with first-repo-wins priority.
 * This mirrors the logic in performSync().
 */
function collectAgents(results: SyncResult[]): Map<string, RemoteAgent> {
  const remoteAgents = new Map<string, RemoteAgent>()

  for (const result of results) {
    if (result.error) continue

    for (const agent of result.agents) {
      if (remoteAgents.has(agent.name)) {
        continue
      }

      remoteAgents.set(agent.name, {
        config: agent.config,
        source: result.shortName,
      })
    }
  }

  return remoteAgents
}

/**
 * Inject agents into config with user config priority.
 * This mirrors the logic in the config hook.
 */
function injectAgents(
  config: { agent?: Record<string, AgentConfig | undefined> },
  remoteAgents: Map<string, RemoteAgent>
): { injected: string[]; skipped: string[] } {
  const injected: string[] = []
  const skipped: string[] = []

  if (remoteAgents.size === 0) return { injected, skipped }

  if (config.agent !== undefined && (typeof config.agent !== "object" || config.agent === null)) {
    return { injected, skipped }
  }
  config.agent = config.agent || {}

  for (const [name, { config: agentConfig }] of remoteAgents) {
    // Use hasOwnProperty to correctly handle falsy values (null, undefined set by user)
    if (Object.prototype.hasOwnProperty.call(config.agent, name)) {
      skipped.push(name)
      continue
    }

    config.agent[name] = agentConfig
    injected.push(name)
  }

  return { injected, skipped }
}

// Helper to create mock AgentInfo
function mockAgent(name: string, description: string): AgentInfo {
  return {
    name,
    path: `/mock/path/${name}.md`,
    config: { description, mode: "subagent" as const },
  }
}

// Helper to create mock SyncResult
function mockSyncResult(
  shortName: string,
  agents: AgentInfo[],
  error?: string
): SyncResult {
  return {
    repoId: `repo-${shortName}`,
    repoPath: `/path/to/${shortName}`,
    shortName,
    ref: "main",
    skills: [],
    agents,
    commands: [],
    plugins: [],
    instructions: [],
    updated: false,
    error,
  }
}

describe("agent collection", () => {
  test("collects agents from single repository", () => {
    const results = [
      mockSyncResult("repo-a", [
        mockAgent("agent-1", "First agent"),
        mockAgent("agent-2", "Second agent"),
      ]),
    ]

    const agents = collectAgents(results)

    expect(agents.size).toBe(2)
    expect(agents.get("agent-1")?.source).toBe("repo-a")
    expect(agents.get("agent-2")?.source).toBe("repo-a")
  })

  test("collects agents from multiple repositories", () => {
    const results = [
      mockSyncResult("repo-a", [mockAgent("agent-a", "From A")]),
      mockSyncResult("repo-b", [mockAgent("agent-b", "From B")]),
    ]

    const agents = collectAgents(results)

    expect(agents.size).toBe(2)
    expect(agents.get("agent-a")?.source).toBe("repo-a")
    expect(agents.get("agent-b")?.source).toBe("repo-b")
  })

  test("first repository wins for duplicate agent names", () => {
    const results = [
      mockSyncResult("repo-a", [mockAgent("shared", "From A")]),
      mockSyncResult("repo-b", [mockAgent("shared", "From B")]),
    ]

    const agents = collectAgents(results)

    expect(agents.size).toBe(1)
    expect(agents.get("shared")?.source).toBe("repo-a")
    expect(agents.get("shared")?.config.description).toBe("From A")
  })

  test("skips repositories with errors", () => {
    const results = [
      mockSyncResult("repo-a", [mockAgent("agent-a", "From A")], "Clone failed"),
      mockSyncResult("repo-b", [mockAgent("agent-b", "From B")]),
    ]

    const agents = collectAgents(results)

    expect(agents.size).toBe(1)
    expect(agents.has("agent-a")).toBe(false)
    expect(agents.get("agent-b")?.source).toBe("repo-b")
  })

  test("returns empty map for no results", () => {
    const agents = collectAgents([])
    expect(agents.size).toBe(0)
  })

  test("returns empty map when all repos have errors", () => {
    const results = [
      mockSyncResult("repo-a", [mockAgent("agent-a", "A")], "Error A"),
      mockSyncResult("repo-b", [mockAgent("agent-b", "B")], "Error B"),
    ]

    const agents = collectAgents(results)
    expect(agents.size).toBe(0)
  })
})

describe("config injection", () => {
  test("injects agents into empty config", () => {
    const config: { agent?: Record<string, AgentConfig | undefined> } = {}
    const remoteAgents = new Map<string, RemoteAgent>([
      ["agent-1", { config: { description: "Agent 1" }, source: "repo" }],
      ["agent-2", { config: { description: "Agent 2" }, source: "repo" }],
    ])

    const { injected, skipped } = injectAgents(config, remoteAgents)

    expect(injected).toEqual(["agent-1", "agent-2"])
    expect(skipped).toEqual([])
    expect(config.agent?.["agent-1"]?.description).toBe("Agent 1")
    expect(config.agent?.["agent-2"]?.description).toBe("Agent 2")
  })

  test("respects existing user config (user priority)", () => {
    const config: { agent?: Record<string, AgentConfig | undefined> } = {
      agent: {
        "my-agent": { description: "User's agent", mode: "primary" },
      },
    }
    const remoteAgents = new Map<string, RemoteAgent>([
      ["my-agent", { config: { description: "Remote agent" }, source: "repo" }],
      ["new-agent", { config: { description: "New agent" }, source: "repo" }],
    ])

    const { injected, skipped } = injectAgents(config, remoteAgents)

    expect(injected).toEqual(["new-agent"])
    expect(skipped).toEqual(["my-agent"])
    // User's config preserved
    expect(config.agent?.["my-agent"]?.description).toBe("User's agent")
    expect(config.agent?.["my-agent"]?.mode).toBe("primary")
    // New agent added
    expect(config.agent?.["new-agent"]?.description).toBe("New agent")
  })

  test("handles empty remote agents", () => {
    const config: { agent?: Record<string, AgentConfig | undefined> } = {
      agent: { existing: { description: "Existing" } },
    }
    const remoteAgents = new Map<string, RemoteAgent>()

    const { injected, skipped } = injectAgents(config, remoteAgents)

    expect(injected).toEqual([])
    expect(skipped).toEqual([])
    expect(config.agent?.["existing"]?.description).toBe("Existing")
  })

  test("respects user's null value (does not overwrite)", () => {
    // User explicitly set an agent to null (disabled)
    const config: { agent?: Record<string, AgentConfig | null | undefined> } = {
      agent: {
        "disabled-agent": null,
      },
    }
    const remoteAgents = new Map<string, RemoteAgent>([
      ["disabled-agent", { config: { description: "Remote version" }, source: "repo" }],
      ["new-agent", { config: { description: "New agent" }, source: "repo" }],
    ])

    const { injected, skipped } = injectAgents(config as any, remoteAgents)

    // disabled-agent should be skipped because user has it (even though null)
    expect(skipped).toContain("disabled-agent")
    expect(injected).toContain("new-agent")
    // User's null value preserved
    expect(config.agent?.["disabled-agent"]).toBeNull()
  })

  test("creates agent object if undefined", () => {
    const config: { agent?: Record<string, AgentConfig | undefined> } = {
      agent: undefined,
    }
    const remoteAgents = new Map<string, RemoteAgent>([
      ["new", { config: { description: "New" }, source: "repo" }],
    ])

    injectAgents(config, remoteAgents)

    expect(config.agent).toBeDefined()
    expect(config.agent?.["new"]?.description).toBe("New")
  })
})

describe("end-to-end priority", () => {
  test("full priority chain: user > first repo > subsequent repos", () => {
    // Simulate user config
    const config: { agent?: Record<string, AgentConfig | undefined> } = {
      agent: {
        "user-agent": { description: "User defined" },
      },
    }

    // Simulate sync results from multiple repos
    const results = [
      mockSyncResult("repo-a", [
        mockAgent("user-agent", "From A - should be skipped"),
        mockAgent("shared", "From A - should win"),
        mockAgent("unique-a", "From A"),
      ]),
      mockSyncResult("repo-b", [
        mockAgent("shared", "From B - should be skipped"),
        mockAgent("unique-b", "From B"),
      ]),
    ]

    // Collect agents (repo priority) - includes user-agent from repo since
    // user config filtering happens at injection time
    const remoteAgents = collectAgents(results)
    expect(remoteAgents.size).toBe(4) // user-agent, shared, unique-a, unique-b
    expect(remoteAgents.get("shared")?.source).toBe("repo-a")
    expect(remoteAgents.get("user-agent")?.source).toBe("repo-a")

    // Inject into config (user priority)
    const { injected, skipped } = injectAgents(config, remoteAgents)

    // user-agent is skipped because it exists in user config
    expect(skipped).toContain("user-agent")
    expect(injected).toContain("shared")
    expect(injected).toContain("unique-a")
    expect(injected).toContain("unique-b")
    expect(injected).not.toContain("user-agent")

    // Verify final state
    expect(config.agent?.["user-agent"]?.description).toBe("User defined")
    expect(config.agent?.["shared"]?.description).toBe("From A - should win")
    expect(config.agent?.["unique-a"]?.description).toBe("From A")
    expect(config.agent?.["unique-b"]?.description).toBe("From B")
  })
})

// Helper to create mock InstructionInfo
function mockInstruction(name: string, path: string): InstructionInfo {
  return { name, path }
}

// Helper to create mock SyncResult with instructions
function mockSyncResultWithInstructions(
  shortName: string,
  instructions: InstructionInfo[],
  error?: string
): SyncResult {
  return {
    repoId: `repo-${shortName}`,
    repoPath: `/path/to/${shortName}`,
    shortName,
    ref: "main",
    skills: [],
    agents: [],
    commands: [],
    plugins: [],
    instructions,
    updated: false,
    error,
  }
}

/**
 * Collect instructions from sync results.
 * Unlike agents/commands, instructions don't have first-wins - all are appended.
 *
 * NOTE: This helper mirrors production logic from performSync() in index.ts.
 * Since production code is encapsulated in the plugin closure, we cannot directly
 * test it. This approach has a known limitation: if both the helper and production
 * code have the same bug, tests would pass incorrectly.
 *
 * To mitigate this risk, tests focus on behavioral edge cases (error handling,
 * empty inputs, type validation) rather than verifying the algorithm itself.
 * The collection logic is intentionally kept simple (flat iteration) to minimize
 * divergence risk.
 */
function collectInstructions(results: SyncResult[]): string[] {
  const remoteInstructions: string[] = []

  for (const result of results) {
    if (result.error) continue
    for (const instruction of result.instructions) {
      remoteInstructions.push(instruction.path)
    }
  }

  return remoteInstructions
}

/**
 * Inject instructions into config.
 * Returns true if injection succeeded, false if skipped due to invalid type.
 *
 * NOTE: This helper mirrors production logic from the config hook in index.ts.
 * Since production code is encapsulated in the plugin closure, we cannot directly
 * test it. This approach has a known limitation: if both the helper and production
 * code have the same bug, tests would pass incorrectly.
 *
 * To mitigate this risk, tests focus on:
 * - Input validation (invalid types rejected)
 * - Edge cases (empty inputs, type coercion from string to array)
 * - Expected output shapes for given inputs
 *
 * rather than verifying the injection algorithm itself.
 */
function injectInstructions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: { instructions?: any },
  remoteInstructions: string[]
): boolean {
  if (remoteInstructions.length === 0) return true

  // Validate config.instructions type: must be undefined, string, or string[]
  if (config.instructions !== undefined &&
      typeof config.instructions !== "string" &&
      !Array.isArray(config.instructions)) {
    return false
  }

  // Validate array contents are all strings
  if (Array.isArray(config.instructions) &&
      !config.instructions.every((x: unknown) => typeof x === "string")) {
    return false
  }

  // Ensure config.instructions is an array
  if (!Array.isArray(config.instructions)) {
    config.instructions = config.instructions ? [config.instructions] : []
  }

  // Append all remote instructions
  config.instructions.push(...remoteInstructions)
  return true
}

describe("instruction collection", () => {
  test("collects instructions from single repository", () => {
    const results = [
      mockSyncResultWithInstructions("repo-a", [
        mockInstruction("session-protocol.md", "/path/to/repo-a/session-protocol.md"),
        mockInstruction("coding-style.md", "/path/to/repo-a/coding-style.md"),
      ]),
    ]

    const instructions = collectInstructions(results)

    expect(instructions.length).toBe(2)
    expect(instructions).toContain("/path/to/repo-a/session-protocol.md")
    expect(instructions).toContain("/path/to/repo-a/coding-style.md")
  })

  test("collects instructions from multiple repositories (all appended)", () => {
    const results = [
      mockSyncResultWithInstructions("repo-a", [
        mockInstruction("instructions-a.md", "/path/to/repo-a/instructions-a.md"),
      ]),
      mockSyncResultWithInstructions("repo-b", [
        mockInstruction("instructions-b.md", "/path/to/repo-b/instructions-b.md"),
      ]),
    ]

    const instructions = collectInstructions(results)

    expect(instructions.length).toBe(2)
    expect(instructions).toContain("/path/to/repo-a/instructions-a.md")
    expect(instructions).toContain("/path/to/repo-b/instructions-b.md")
  })

  test("includes duplicate instruction names from different repos (no first-wins)", () => {
    const results = [
      mockSyncResultWithInstructions("repo-a", [
        mockInstruction("shared.md", "/path/to/repo-a/shared.md"),
      ]),
      mockSyncResultWithInstructions("repo-b", [
        mockInstruction("shared.md", "/path/to/repo-b/shared.md"),
      ]),
    ]

    const instructions = collectInstructions(results)

    // Both are included - no deduplication by name
    expect(instructions.length).toBe(2)
    expect(instructions).toContain("/path/to/repo-a/shared.md")
    expect(instructions).toContain("/path/to/repo-b/shared.md")
  })

  test("skips repositories with errors", () => {
    const results = [
      mockSyncResultWithInstructions("repo-a", [
        mockInstruction("instructions-a.md", "/path/to/repo-a/instructions-a.md"),
      ], "Clone failed"),
      mockSyncResultWithInstructions("repo-b", [
        mockInstruction("instructions-b.md", "/path/to/repo-b/instructions-b.md"),
      ]),
    ]

    const instructions = collectInstructions(results)

    expect(instructions.length).toBe(1)
    expect(instructions).not.toContain("/path/to/repo-a/instructions-a.md")
    expect(instructions).toContain("/path/to/repo-b/instructions-b.md")
  })

  test("returns empty array for no results", () => {
    const instructions = collectInstructions([])
    expect(instructions.length).toBe(0)
  })

  test("returns empty array when all repos have errors", () => {
    const results = [
      mockSyncResultWithInstructions("repo-a", [
        mockInstruction("a.md", "/path/a.md"),
      ], "Error A"),
      mockSyncResultWithInstructions("repo-b", [
        mockInstruction("b.md", "/path/b.md"),
      ], "Error B"),
    ]

    const instructions = collectInstructions(results)
    expect(instructions.length).toBe(0)
  })
})

describe("instruction injection", () => {
  test("injects instructions into empty config", () => {
    const config: { instructions?: string | string[] } = {}
    const remoteInstructions = ["/path/to/instruction1.md", "/path/to/instruction2.md"]

    injectInstructions(config, remoteInstructions)

    expect(config.instructions).toEqual(["/path/to/instruction1.md", "/path/to/instruction2.md"])
  })

  test("appends to existing array config", () => {
    const config: { instructions?: string | string[] } = {
      instructions: ["/existing/instruction.md"],
    }
    const remoteInstructions = ["/remote/instruction.md"]

    injectInstructions(config, remoteInstructions)

    expect(config.instructions).toEqual(["/existing/instruction.md", "/remote/instruction.md"])
  })

  test("converts string config to array and appends", () => {
    const config: { instructions?: string | string[] } = {
      instructions: "/user/instruction.md",
    }
    const remoteInstructions = ["/remote/instruction.md"]

    injectInstructions(config, remoteInstructions)

    expect(config.instructions).toEqual(["/user/instruction.md", "/remote/instruction.md"])
  })

  test("does nothing with empty remote instructions", () => {
    const config: { instructions?: string | string[] } = {
      instructions: ["/existing/instruction.md"],
    }

    injectInstructions(config, [])

    expect(config.instructions).toEqual(["/existing/instruction.md"])
  })

  test("handles undefined instructions config", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: { instructions?: any } = {
      instructions: undefined,
    }
    const remoteInstructions = ["/remote/instruction.md"]

    const result = injectInstructions(config, remoteInstructions)

    expect(result).toBe(true)
    expect(config.instructions).toEqual(["/remote/instruction.md"])
  })

  test("skips injection when config.instructions is an object", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: { instructions?: any } = {
      instructions: { invalid: "object" },
    }
    const remoteInstructions = ["/remote/instruction.md"]

    const result = injectInstructions(config, remoteInstructions)

    expect(result).toBe(false)
    expect(config.instructions).toEqual({ invalid: "object" }) // unchanged
  })

  test("skips injection when config.instructions is a number", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: { instructions?: any } = {
      instructions: 42,
    }
    const remoteInstructions = ["/remote/instruction.md"]

    const result = injectInstructions(config, remoteInstructions)

    expect(result).toBe(false)
    expect(config.instructions).toBe(42) // unchanged
  })

  test("skips injection when config.instructions is a boolean", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: { instructions?: any } = {
      instructions: true,
    }
    const remoteInstructions = ["/remote/instruction.md"]

    const result = injectInstructions(config, remoteInstructions)

    expect(result).toBe(false)
    expect(config.instructions).toBe(true) // unchanged
  })

  test("skips injection when config.instructions is null", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: { instructions?: any } = {
      instructions: null,
    }
    const remoteInstructions = ["/remote/instruction.md"]

    const result = injectInstructions(config, remoteInstructions)

    expect(result).toBe(false)
    expect(config.instructions).toBe(null) // unchanged
  })

  test("skips injection when config.instructions array contains a number", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: { instructions?: any } = {
      instructions: [42],
    }
    const remoteInstructions = ["/remote/instruction.md"]

    const result = injectInstructions(config, remoteInstructions)

    expect(result).toBe(false)
    expect(config.instructions).toEqual([42]) // unchanged
  })

  test("skips injection when config.instructions array contains null", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: { instructions?: any } = {
      instructions: [null],
    }
    const remoteInstructions = ["/remote/instruction.md"]

    const result = injectInstructions(config, remoteInstructions)

    expect(result).toBe(false)
    expect(config.instructions).toEqual([null]) // unchanged
  })

  test("skips injection when config.instructions array has mixed types", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: { instructions?: any } = {
      instructions: ["/valid/path.md", 42, null],
    }
    const remoteInstructions = ["/remote/instruction.md"]

    const result = injectInstructions(config, remoteInstructions)

    expect(result).toBe(false)
    expect(config.instructions).toEqual(["/valid/path.md", 42, null]) // unchanged
  })

  test("allows injection when config.instructions is valid string array", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: { instructions?: any } = {
      instructions: ["/valid/path1.md", "/valid/path2.md"],
    }
    const remoteInstructions = ["/remote/instruction.md"]

    const result = injectInstructions(config, remoteInstructions)

    expect(result).toBe(true)
    expect(config.instructions).toEqual(["/valid/path1.md", "/valid/path2.md", "/remote/instruction.md"])
  })
})
