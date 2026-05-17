import { describe, expect, it } from "vitest"
import {
  getPaywallTriggerReason,
  getRateLimitPolicy,
  getRateLimitWindowStart,
  shouldShowPaywall,
} from "@/lib/rate-limit"

describe("rate-limit helpers", () => {
  it("uses a daily window for free analysis, games, and daily tasks", () => {
    const now = new Date("2026-05-17T14:23:41.000Z")

    expect(getRateLimitPolicy("free", "ai_analysis")).toEqual({
      limit: 1,
      window: "day",
    })
    expect(getRateLimitPolicy("free", "game")).toEqual({
      limit: 5,
      window: "day",
    })
    expect(getRateLimitPolicy("free", "puzzle")).toEqual({
      limit: 3,
      window: "day",
    })
    expect(getRateLimitWindowStart("free", "ai_analysis", now)).toBe(
      "2026-05-17T00:00:00.000Z",
    )
    expect(getRateLimitWindowStart("free", "game", now)).toBe(
      "2026-05-17T00:00:00.000Z",
    )
    expect(getRateLimitWindowStart("free", "puzzle", now)).toBe("2026-05-17T00:00:00.000Z")
  })

  it("uses an hourly window for paid analysis", () => {
    const now = new Date("2026-05-17T14:23:41.000Z")

    expect(getRateLimitPolicy("pro", "ai_analysis")).toEqual({
      limit: 10,
      window: "hour",
    })
    expect(getRateLimitWindowStart("pro", "ai_analysis", now)).toBe(
      "2026-05-17T14:00:00.000Z",
    )
  })

  it("keeps game and puzzle usage unlimited for paid tiers", () => {
    expect(getRateLimitPolicy("pro", "game")).toEqual({
      limit: null,
      window: "day",
    })
    expect(getRateLimitPolicy("family", "puzzle")).toEqual({
      limit: null,
      window: "day",
    })
    expect(shouldShowPaywall("free")).toBe(true)
    expect(shouldShowPaywall("pro")).toBe(false)
    expect(shouldShowPaywall("family")).toBe(false)
  })

  it("maps actions to paywall reasons expected by analytics", () => {
    expect(getPaywallTriggerReason("ai_analysis")).toBe("analysis_limit")
    expect(getPaywallTriggerReason("game")).toBe("game_limit")
    expect(getPaywallTriggerReason("puzzle")).toBe("puzzle_limit")
  })
})
