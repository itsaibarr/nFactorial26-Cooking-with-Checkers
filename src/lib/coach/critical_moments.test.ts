import { describe, expect, it } from "vitest"
import { detectCriticalMoments } from "@/lib/coach/critical_moments"

describe("detectCriticalMoments", () => {
  it("tracks player move numbers from the player's perspective", () => {
    const moments = detectCriticalMoments({
      playerColor: "white",
      moves: [
        {notation: "c3-b4", durationMs: 1200},
        {notation: "f6-g5", durationMs: null},
        {notation: "b4-a5", durationMs: 900},
        {notation: "g5-f4", durationMs: null},
        {notation: "e3:g5", durationMs: 1500},
      ],
    })

    expect(moments.length).toBeGreaterThan(0)
    expect(moments.map((moment) => moment.move_number)).toEqual(
      expect.arrayContaining([1, 2, 3]),
    )
    expect(moments.every((moment) => moment.swing >= 0)).toBe(true)
  })

  it("falls back to the biggest player swings when nothing clears the threshold", () => {
    const moments = detectCriticalMoments({
      playerColor: "white",
      moves: [
        {notation: "c3-b4", durationMs: 1000},
        {notation: "f6-g5", durationMs: null},
        {notation: "b4-a5", durationMs: 900},
      ],
    })

    expect(moments.length).toBe(2)
    expect(moments[0]?.move_number).toBe(1)
    expect(moments[1]?.move_number).toBe(2)
  })
})
