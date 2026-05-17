import { describe, expect, it } from "vitest"
import { createGameState } from "@/lib/engine/board"
import { getPlayerGameResult, replayRecordedGame } from "@/lib/game/session"

describe("replayRecordedGame", () => {
  it("replays legal move notations in order", () => {
    const { moves, state } = replayRecordedGame([
      {notation: "c3-b4", durationMs: 1_200},
      {notation: "f6-g5", durationMs: null},
      {notation: "b4-a5", durationMs: 900},
    ])

    expect(state.moveHistory).toEqual(["c3-b4", "f6-g5", "b4-a5"])
    expect(state.sideToMove).toBe("black")
    expect(moves.map((move) => move.side)).toEqual(["white", "black", "white"])
  })

  it("rejects illegal recorded moves", () => {
    expect(() =>
      replayRecordedGame([{notation: "a1-b2", durationMs: null}]),
    ).toThrow("Illegal recorded move: a1-b2")
  })
})

describe("getPlayerGameResult", () => {
  it("maps the engine result from the player's perspective", () => {
    expect(getPlayerGameResult(createGameState({status: "won", result: "white"}), "white")).toBe(
      "win",
    )
    expect(getPlayerGameResult(createGameState({status: "won", result: "white"}), "black")).toBe(
      "loss",
    )
    expect(getPlayerGameResult(createGameState({status: "drawn", result: "draw"}), "white")).toBe(
      "draw",
    )
  })
})
