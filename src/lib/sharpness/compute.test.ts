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

  it("does not overrate a clearly poor game", () => {
    const analysis = computeGameSharpness({
      playerColor: "white",
      moves: [
        {notation: "e3-d4", durationMs: 2056},
        {notation: "f6-g5", durationMs: null},
        {notation: "g3-f4", durationMs: 1985},
        {notation: "g5:e3:c5", durationMs: null},
        {notation: "c3-d4", durationMs: 1993},
        {notation: "c5:e3", durationMs: null},
        {notation: "d2:f4", durationMs: 2452},
        {notation: "b6-c5", durationMs: null},
        {notation: "f4-e5", durationMs: 3288},
        {notation: "d6:f4", durationMs: null},
        {notation: "f2-e3", durationMs: 376_637},
        {notation: "f4:d2", durationMs: null},
        {notation: "c1:e3", durationMs: 1656},
        {notation: "c5-d4", durationMs: null},
        {notation: "e3:c5", durationMs: 1189},
        {notation: "c7-b6", durationMs: null},
        {notation: "c5-d6", durationMs: 4343},
        {notation: "e7:c5", durationMs: null},
        {notation: "a3-b4", durationMs: 2060},
        {notation: "c5:a3:c1", durationMs: null},
        {notation: "e1-d2", durationMs: 2208},
        {notation: "c1:f4", durationMs: null},
        {notation: "h2-g3", durationMs: 2714},
        {notation: "f4:h2", durationMs: null},
        {notation: "g1-f2", durationMs: 1225},
        {notation: "b8-c7", durationMs: null},
        {notation: "a1-b2", durationMs: 1535},
        {notation: "d8-e7", durationMs: null},
        {notation: "b2-c3", durationMs: 969},
        {notation: "e7-f6", durationMs: null},
        {notation: "f2-e3", durationMs: 1993},
        {notation: "h2-e5", durationMs: null},
        {notation: "e3-f4", durationMs: 1011},
        {notation: "e5:b2", durationMs: null},
        {notation: "f4-e5", durationMs: 2015},
        {notation: "f6:d4", durationMs: null},
      ],
    })

    expect(analysis.score).toBeLessThanOrEqual(62)
    expect(analysis.breakdown.accuracy).toBeLessThanOrEqual(70)
    expect(analysis.breakdown.blunderRate).toBeLessThan(85)
  })
})
