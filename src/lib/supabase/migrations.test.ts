import { readdirSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const MIGRATIONS_DIR = path.resolve(process.cwd(), "supabase/migrations")

describe("supabase migrations", () => {
  it("uses unique numeric versions", () => {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith(".sql"))
      .sort()

    const versions = files.map((file) => {
      const match = file.match(/^(\d+)_/)

      expect(match, `${file} must start with a numeric version followed by "_"`).not.toBeNull()

      return match?.[1] ?? ""
    })

    expect(new Set(versions).size).toBe(versions.length)
  })
})
