import { describe, expect, it, vi } from "vitest"
import { getBestMove, getLegalMoves, newGame } from "@/lib/engine/engine"
import { resolveBotMove } from "@/lib/game/bot"

describe("resolveBotMove", () => {
  it("uses the local engine for easy difficulty", async () => {
    const state = newGame()
    const requestWorkerMove = vi.fn()

    const move = await resolveBotMove({
      state,
      opponentLevel: "easy",
      requestWorkerMove,
    })

    expect(getLegalMoves(state).some((candidate) => candidate.notation === move.notation)).toBe(true)
    expect(requestWorkerMove).not.toHaveBeenCalled()
  })

  it("uses the worker result for medium difficulty when available", async () => {
    const state = newGame()
    const workerMove = getBestMove(state, "medium")
    const requestWorkerMove = vi.fn().mockResolvedValue(workerMove)

    const move = await resolveBotMove({
      state,
      opponentLevel: "medium",
      requestWorkerMove,
    })

    expect(move.notation).toBe(workerMove.notation)
    expect(requestWorkerMove).toHaveBeenCalledWith(state, "medium")
  })

  it("falls back to the local engine when the worker fails", async () => {
    const state = newGame()
    const fallbackMove = getBestMove(state, "hard")
    const requestWorkerMove = vi.fn().mockRejectedValue(new Error("worker unavailable"))

    const move = await resolveBotMove({
      state,
      opponentLevel: "hard",
      requestWorkerMove,
    })

    expect(move.notation).toBe(fallbackMove.notation)
    expect(requestWorkerMove).toHaveBeenCalledWith(state, "hard")
  })
})
