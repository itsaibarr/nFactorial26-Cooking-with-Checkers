import { describe, expect, it } from "vitest"
import { computeGameSharpness, updateSharpnessEma } from "@/lib/sharpness/compute"

describe("updateSharpnessEma", () => {
  it("applies an EMA-7 update", () => {
    expect(updateSharpnessEma(50, 90)).toBe(60)
  })
})

describe("computeGameSharpness", () => {
  it("returns bounded scores for a legal recorded game", () => {
    const analysis = computeGameSharpness({
      playerColor: "white",
      moves: [
        {notation: "c3-b4", durationMs: 1_100},
        {notation: "f6-g5", durationMs: null},
        {notation: "b4-a5", durationMs: 950},
      ],
    })

    expect(analysis.score).toBeGreaterThanOrEqual(0)
    expect(analysis.score).toBeLessThanOrEqual(100)
    expect(analysis.breakdown.accuracy).toBeGreaterThanOrEqual(0)
    expect(analysis.breakdown.blunderRate).toBeGreaterThanOrEqual(0)
    expect(analysis.breakdown.playerMoves).toBe(2)
  })
})
