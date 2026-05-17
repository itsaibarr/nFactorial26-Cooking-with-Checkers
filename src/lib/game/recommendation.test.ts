import { describe, expect, it, vi } from "vitest"
import { getBestMove, newGame } from "@/lib/engine/engine"
import { resolveRecommendedMove } from "@/lib/game/recommendation"

describe("resolveRecommendedMove", () => {
  it("uses the worker result when available", async () => {
    const state = newGame()
    const workerMove = getBestMove(state, "medium")
    const requestWorkerMove = vi.fn().mockResolvedValue(workerMove)

    const move = await resolveRecommendedMove({
      state,
      requestWorkerMove,
    })

    expect(move.notation).toBe(workerMove.notation)
    expect(requestWorkerMove).toHaveBeenCalledWith(state, "medium")
  })

  it("falls back to the local engine when the worker fails", async () => {
    const state = newGame()
    const fallbackMove = getBestMove(state, "medium")
    const requestWorkerMove = vi.fn().mockRejectedValue(new Error("worker unavailable"))

    const move = await resolveRecommendedMove({
      state,
      requestWorkerMove,
    })

    expect(move.notation).toBe(fallbackMove.notation)
    expect(requestWorkerMove).toHaveBeenCalledWith(state, "medium")
  })
})
