import { describe, test, expect } from "bun:test"
import { platform } from "os"
import { IS_WINDOWS, DEFAULT_INSTALL_METHOD, getRepoShortName, getRepoId } from "./config"
import { containsPathTraversal } from "./manifest"

describe("Windows compatibility", () => {
  describe("platform detection", () => {
    test("IS_WINDOWS matches os.platform()", () => {
      expect(IS_WINDOWS).toBe(platform() === "win32")
    })

    test("DEFAULT_INSTALL_METHOD is 'copy' on Windows, 'link' elsewhere", () => {
      if (IS_WINDOWS) {
        expect(DEFAULT_INSTALL_METHOD).toBe("copy")
      } else {
        expect(DEFAULT_INSTALL_METHOD).toBe("link")
      }
    })
  })

  describe("path handling", () => {
    describe("getRepoShortName", () => {
      test("handles Unix-style file:// URLs", () => {
        expect(getRepoShortName("file:///path/to/my-skills")).toBe("my-skills")
      })

      test("handles Windows-style file:// URLs with drive letter", () => {
        expect(getRepoShortName("file:///C:/Users/name/skills")).toBe("skills")
      })

      test("handles Windows backslash paths in file:// URLs", () => {
        // Windows paths with backslashes (edge case)
        expect(getRepoShortName("file:///C:\\Users\\name\\skills")).toBe("skills")
      })

      test("handles trailing slashes", () => {
        expect(getRepoShortName("file:///path/to/skills/")).toBe("skills")
      })
    })

    describe("getRepoId", () => {
      test("handles Windows-style paths", () => {
        const id = getRepoId("file:///C:/Users/name/skills")
        expect(id.startsWith("local-")).toBe(true)
        expect(id).not.toContain(":")  // Colons should be sanitized
      })

      test("handles Windows backslash paths", () => {
        const id = getRepoId("file:///C:\\Users\\name\\skills")
        expect(id.startsWith("local-")).toBe(true)
        expect(id).not.toContain(":")
      })
    })

    describe("containsPathTraversal", () => {
      test("detects traversal with forward slashes", () => {
        expect(containsPathTraversal("../secret")).toBe(true)
        expect(containsPathTraversal("path/../other")).toBe(true)
        expect(containsPathTraversal("./current")).toBe(true)
      })

      test("detects traversal with backslashes (Windows)", () => {
        expect(containsPathTraversal("..\\secret")).toBe(true)
        expect(containsPathTraversal("path\\..\\other")).toBe(true)
        expect(containsPathTraversal(".\\current")).toBe(true)
      })

      test("allows safe paths with forward slashes", () => {
        expect(containsPathTraversal("path/to/file.md")).toBe(false)
        expect(containsPathTraversal("file.md")).toBe(false)
      })

      test("allows safe paths with backslashes", () => {
        expect(containsPathTraversal("path\\to\\file.md")).toBe(false)
        expect(containsPathTraversal("file.md")).toBe(false)
      })

      test("detects mixed separators", () => {
        expect(containsPathTraversal("path/../subdir")).toBe(true)
        expect(containsPathTraversal("path\\..\\subdir")).toBe(true)
      })
    })
  })

  describe("symlink configuration", () => {
    test("IS_WINDOWS flag is exported", () => {
      expect(typeof IS_WINDOWS).toBe("boolean")
    })

    test("DEFAULT_INSTALL_METHOD is valid", () => {
      expect(["link", "copy"]).toContain(DEFAULT_INSTALL_METHOD)
    })
  })
})
