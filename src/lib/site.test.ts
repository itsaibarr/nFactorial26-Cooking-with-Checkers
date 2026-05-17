import { afterEach, describe, expect, it } from "vitest"
import { getAppUrl } from "@/lib/site"

const originalEnv = {...process.env}

function setEnv(key: string, value: string | undefined) {
  const env = process.env as Record<string, string | undefined>

  if (value === undefined) {
    delete env[key]
    return
  }

  env[key] = value
}

afterEach(() => {
  process.env = {...originalEnv}
})

describe("getAppUrl", () => {
  it("trims configured URLs before returning them", () => {
    setEnv("NEXT_PUBLIC_APP_URL", "https://sharpki.online/\n")
    setEnv("NODE_ENV", "production")

    expect(getAppUrl()).toBe("https://sharpki.online")
  })

  it("falls back to the Vercel deployment URL when no app URL is configured", () => {
    setEnv("NEXT_PUBLIC_APP_URL", undefined)
    setEnv("VERCEL_URL", "sharpki-preview.vercel.app")
    setEnv("NODE_ENV", "production")

    expect(getAppUrl()).toBe("https://sharpki-preview.vercel.app")
  })
})
