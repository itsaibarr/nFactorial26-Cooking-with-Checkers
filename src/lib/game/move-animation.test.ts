import { describe, expect, it } from "vitest"
import { createGameState } from "@/lib/engine/board"
import { getLegalMoves } from "@/lib/engine/engine"
import {
  buildPreparedMoveAnimation,
  getMoveAnimationDuration,
} from "@/lib/game/move-animation"

describe("move animation helpers", () => {
  it("builds animation data for a quiet move", () => {
    const state = createGameState({
      sideToMove: "white",
      whiteMen: ["c3"],
      blackMen: ["h8"],
    })
    const move = getLegalMoves(state).find((candidate) => candidate.notation === "c3-b4")

    expect(move).toBeDefined()
    expect(buildPreparedMoveAnimation(state, move!)).toEqual({
      from: move!.from,
      to: move!.to,
      movingPiece: {
        color: "white",
        king: false,
      },
      capturedPieces: [],
    })
    expect(getMoveAnimationDuration(move!)).toBe(200)
  })

  it("includes captured pieces from the pre-move state", () => {
    const state = createGameState({
      sideToMove: "white",
      whiteMen: ["c3"],
      blackMen: ["d4"],
    })
    const move = getLegalMoves(state)[0]

    expect(move).toBeDefined()
    expect(move!.captures).toHaveLength(1)
    expect(buildPreparedMoveAnimation(state, move!)).toEqual({
      from: move!.from,
      to: move!.to,
      movingPiece: {
        color: "white",
        king: false,
      },
      capturedPieces: [
        {
          square: move!.captures[0]!,
          piece: {
            color: "black",
            king: false,
          },
        },
      ],
    })
    expect(getMoveAnimationDuration(move!)).toBe(320)
  })

  it("marks promotion moves as kings in the animation snapshot", () => {
    const state = createGameState({
      sideToMove: "white",
      whiteMen: ["c7"],
      blackMen: ["h8"],
    })
    const move = getLegalMoves(state).find((candidate) => candidate.endsAsKing)

    expect(move).toBeDefined()
    expect(buildPreparedMoveAnimation(state, move!)).toEqual({
      from: move!.from,
      to: move!.to,
      movingPiece: {
        color: "white",
        king: true,
      },
      capturedPieces: [],
    })
  })
})
