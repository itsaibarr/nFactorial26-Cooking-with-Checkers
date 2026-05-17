import { describe, expect, it } from "vitest"
import { createGameState, squareToIndex } from "@/lib/engine/board"
import { getLegalMoves } from "@/lib/engine/engine"
import {
  findMoveMatchingPath,
  getCapturePathNextSquares,
  getMovesMatchingPathPrefix,
} from "@/lib/game/capture-selection"

describe("capture selection helpers", () => {
  const state = createGameState({
    sideToMove: "white",
    whiteMen: ["c3"],
    blackMen: ["d4", "d6", "f6"],
  })
  const moves = getLegalMoves(state)
  const start = squareToIndex("c3")
  const middle = squareToIndex("e5")
  const leftFinish = squareToIndex("c7")
  const rightFinish = squareToIndex("g7")

  it("keeps only moves that match the chosen path prefix", () => {
    expect(getMovesMatchingPathPrefix(moves, [start])).toHaveLength(2)
    expect(getMovesMatchingPathPrefix(moves, [start, middle])).toHaveLength(2)
    expect(getMovesMatchingPathPrefix(moves, [start, middle, leftFinish])).toEqual([
      expect.objectContaining({notation: "c3:e5:c7"}),
    ])
  })

  it("returns the next landing squares for the current partial capture path", () => {
    expect(getCapturePathNextSquares(moves, [start])).toEqual([middle])
    expect(getCapturePathNextSquares(moves, [start, middle])).toEqual([leftFinish, rightFinish])
    expect(getCapturePathNextSquares(moves, [start, middle, leftFinish])).toEqual([])
  })

  it("resolves only a fully chosen capture path to a legal move", () => {
    expect(findMoveMatchingPath(moves, [start, middle])).toBeNull()
    expect(findMoveMatchingPath(moves, [start, middle, leftFinish])).toMatchObject({
      notation: "c3:e5:c7",
    })
    expect(findMoveMatchingPath(moves, [start, middle, rightFinish])).toMatchObject({
      notation: "c3:e5:g7",
    })
  })
})
