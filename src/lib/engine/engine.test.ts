import { describe, expect, it } from "vitest"
import { createGameState, indexToSquare, squareToIndex } from "@/lib/engine/board"
import { applyMove, evaluatePosition, getBestMove, getLegalMoves, newGame } from "@/lib/engine/engine"
import { getGameSummary } from "@/lib/engine/moves"
import type { GameState } from "@/lib/engine/types"

const playableSquares = [
  "b8",
  "d8",
  "f8",
  "h8",
  "a7",
  "c7",
  "e7",
  "g7",
  "b6",
  "d6",
  "f6",
  "h6",
  "a5",
  "c5",
  "e5",
  "g5",
  "b4",
  "d4",
  "f4",
  "h4",
  "a3",
  "c3",
  "e3",
  "g3",
  "b2",
  "d2",
  "f2",
  "h2",
  "a1",
  "c1",
  "e1",
  "g1",
] as const

const initialBoardCases = [
  {square: "b8", expected: {color: "black", king: false}},
  {square: "g7", expected: {color: "black", king: false}},
  {square: "d6", expected: {color: "black", king: false}},
  {square: "a3", expected: {color: "white", king: false}},
  {square: "f2", expected: {color: "white", king: false}},
  {square: "g1", expected: {color: "white", king: false}},
  {square: "d4", expected: null},
  {square: "e5", expected: null},
] as const

const quietMoveCases = [
  {
    description: "white men move from a central square",
    state: createGameState({
      sideToMove: "white",
      whiteMen: ["c3"],
      blackKings: ["a1"],
    }),
    expected: ["c3-b4", "c3-d4"],
  },
  {
    description: "white men move from the left edge",
    state: createGameState({
      sideToMove: "white",
      whiteMen: ["a3"],
      blackKings: ["h8"],
    }),
    expected: ["a3-b4"],
  },
  {
    description: "white men move from the right edge",
    state: createGameState({
      sideToMove: "white",
      whiteMen: ["g3"],
      blackKings: ["a1"],
    }),
    expected: ["g3-f4", "g3-h4"],
  },
  {
    description: "white men keep both promotion moves",
    state: createGameState({
      sideToMove: "white",
      whiteMen: ["g7"],
      blackKings: ["a1"],
    }),
    expected: ["g7-f8", "g7-h8"],
  },
  {
    description: "black men move from a central square",
    state: createGameState({
      sideToMove: "black",
      whiteKings: ["h8"],
      blackMen: ["c7"],
    }),
    expected: ["c7-b6", "c7-d6"],
  },
  {
    description: "black men move from the left edge",
    state: createGameState({
      sideToMove: "black",
      whiteKings: ["h8"],
      blackMen: ["a7"],
    }),
    expected: ["a7-b6"],
  },
  {
    description: "black men move from the right edge",
    state: createGameState({
      sideToMove: "black",
      whiteKings: ["a1"],
      blackMen: ["g7"],
    }),
    expected: ["g7-f6", "g7-h6"],
  },
  {
    description: "black men keep both promotion moves",
    state: createGameState({
      sideToMove: "black",
      whiteKings: ["h8"],
      blackMen: ["b2"],
    }),
    expected: ["b2-a1", "b2-c1"],
  },
] as const

const singleCaptureCases = [
  {
    description: "white men capture to the north-west",
    state: createGameState({
      sideToMove: "white",
      whiteMen: ["d4"],
      blackMen: ["c5"],
    }),
    expected: ["d4:b6"],
  },
  {
    description: "white men capture to the north-east",
    state: createGameState({
      sideToMove: "white",
      whiteMen: ["d4"],
      blackMen: ["e5"],
    }),
    expected: ["d4:f6"],
  },
  {
    description: "white men capture to the south-west",
    state: createGameState({
      sideToMove: "white",
      whiteMen: ["d4"],
      blackMen: ["c3"],
    }),
    expected: ["d4:b2"],
  },
  {
    description: "white men capture to the south-east",
    state: createGameState({
      sideToMove: "white",
      whiteMen: ["d4"],
      blackMen: ["e3"],
    }),
    expected: ["d4:f2"],
  },
  {
    description: "black men capture to the north-west",
    state: createGameState({
      sideToMove: "black",
      whiteMen: ["d6"],
      blackMen: ["e5"],
    }),
    expected: ["e5:c7"],
  },
  {
    description: "black men capture to the north-east",
    state: createGameState({
      sideToMove: "black",
      whiteMen: ["f6"],
      blackMen: ["e5"],
    }),
    expected: ["e5:g7"],
  },
  {
    description: "black men capture to the south-west",
    state: createGameState({
      sideToMove: "black",
      whiteMen: ["d4"],
      blackMen: ["e5"],
    }),
    expected: ["e5:c3"],
  },
  {
    description: "black men capture to the south-east",
    state: createGameState({
      sideToMove: "black",
      whiteMen: ["f4"],
      blackMen: ["e5"],
    }),
    expected: ["e5:g3"],
  },
] as const

const kingQuietRayCases = [
  {
    description: "kings move along an open north-east ray",
    state: createGameState({
      sideToMove: "white",
      whiteKings: ["d4"],
      whiteMen: ["c5", "c3", "e3"],
      blackMen: ["a7"],
    }),
    expected: ["d4-e5", "d4-f6", "d4-g7", "d4-h8"],
  },
  {
    description: "kings move along an open north-west ray",
    state: createGameState({
      sideToMove: "white",
      whiteKings: ["d4"],
      whiteMen: ["e5", "c3", "e3"],
      blackMen: ["h8"],
    }),
    expected: ["d4-a7", "d4-b6", "d4-c5"],
  },
  {
    description: "kings move along an open south-east ray",
    state: createGameState({
      sideToMove: "white",
      whiteKings: ["d4"],
      whiteMen: ["c5", "c3", "e5"],
      blackMen: ["a1"],
    }),
    expected: ["d4-e3", "d4-f2", "d4-g1"],
  },
  {
    description: "kings move along an open south-west ray",
    state: createGameState({
      sideToMove: "white",
      whiteKings: ["d4"],
      whiteMen: ["c5", "e5", "e3"],
      blackMen: ["h8"],
    }),
    expected: ["d4-a1", "d4-b2", "d4-c3"],
  },
] as const

const mandatoryCaptureCases = [
  {
    description: "white men lose quiet moves when a capture exists",
    state: createGameState({
      sideToMove: "white",
      whiteMen: ["d4"],
      blackMen: ["e5"],
    }),
    expected: ["d4:f6"],
  },
  {
    description: "black men lose quiet moves when a capture exists",
    state: createGameState({
      sideToMove: "black",
      whiteMen: ["f4"],
      blackMen: ["e5"],
    }),
    expected: ["e5:g3"],
  },
  {
    description: "white kings lose quiet moves when a capture exists",
    state: createGameState({
      sideToMove: "white",
      whiteKings: ["c3"],
      blackMen: ["e5"],
    }),
    expected: ["c3:f6", "c3:g7", "c3:h8"],
  },
  {
    description: "black kings lose quiet moves when a capture exists",
    state: createGameState({
      sideToMove: "black",
      whiteMen: ["d4"],
      blackKings: ["f6"],
    }),
    expected: ["f6:a1", "f6:b2", "f6:c3"],
  },
] as const

function moveNotations(state: GameState) {
  return getLegalMoves(state).map((move) => move.notation).sort()
}

function moveNotationsFrom(state: GameState, square: string) {
  return moveNotations(state).filter((notation) => notation.startsWith(`${square}-`))
}

describe("engine", () => {
  describe("board coordinates", () => {
    it.each(playableSquares)("round-trips playable square %s", (square) => {
      expect(indexToSquare(squareToIndex(square))).toBe(square)
    })
  })

  describe("initial position", () => {
    it.each(initialBoardCases)("places the expected piece on $square", ({square, expected}) => {
      const piece = newGame().board[squareToIndex(square)]

      if (!expected) {
        expect(piece).toBeNull()
        return
      }

      expect(piece).toEqual(expected)
    })
  })

  it("returns 7 legal opening moves for white", () => {
    expect(getLegalMoves(newGame())).toHaveLength(7)
  })

  describe("man quiet moves", () => {
    it.each(quietMoveCases)("$description", ({state, expected}) => {
      expect(moveNotations(state)).toEqual(expected)
    })
  })

  it("enforces mandatory captures", () => {
    const state = createGameState({
      sideToMove: "white",
      whiteMen: ["c3"],
      blackMen: ["d4"],
    })

    expect(moveNotations(state)).toEqual(["c3:e5"])
  })

  it("lets men capture backward", () => {
    const state = createGameState({
      sideToMove: "white",
      whiteMen: ["c3"],
      blackMen: ["b2"],
    })

    expect(moveNotations(state)).toEqual(["c3:a1"])
  })

  describe("single man captures", () => {
    it.each(singleCaptureCases)("$description", ({state, expected}) => {
      expect(moveNotations(state)).toEqual(expected)
    })
  })

  it("lets kings move along open diagonals", () => {
    const state = createGameState({
      sideToMove: "white",
      whiteKings: ["d4"],
      blackMen: ["h8"],
    })

    expect(moveNotations(state)).toContain("d4-g7")
    expect(moveNotations(state)).toContain("d4-a7")
  })

  describe("king quiet rays", () => {
    it.each(kingQuietRayCases)("$description", ({state, expected}) => {
      expect(moveNotationsFrom(state, "d4")).toEqual(expected)
    })
  })

  it("lets flying kings choose any landing square beyond a captured piece", () => {
    const state = createGameState({
      sideToMove: "white",
      whiteKings: ["c3"],
      blackMen: ["e5"],
    })

    expect(moveNotations(state)).toEqual(["c3:f6", "c3:g7", "c3:h8"])
  })

  describe("capture precedence", () => {
    it.each(mandatoryCaptureCases)("$description", ({state, expected}) => {
      expect(moveNotations(state)).toEqual(expected)
    })
  })

  it("continues a capture sequence after promotion", () => {
    const state = createGameState({
      sideToMove: "white",
      whiteMen: ["b6"],
      blackMen: ["c7", "f6"],
    })

    expect(moveNotations(state)).toEqual(["b6:d8:g5", "b6:d8:h4"])
  })

  it("allows players to choose among legal capture sequences instead of forcing max capture", () => {
    const state = createGameState({
      sideToMove: "white",
      whiteMen: ["c3"],
      blackMen: ["b4", "d4", "f6"],
    })

    expect(moveNotations(state)).toEqual(["c3:a5", "c3:e5:g7"])
  })

  it("tracks threefold repetition as a draw", () => {
    let state = createGameState({
      sideToMove: "white",
      whiteKings: ["b2"],
      blackKings: ["h6"],
    })

    const cycle = ["b2-a3", "h6-g5", "a3-b2", "g5-h6"] as const

    for (let index = 0; index < cycle.length * 2; index += 1) {
      const notation = cycle[index % cycle.length]
      const move = getLegalMoves(state).find((candidate) => candidate.notation === notation)
      if (!move) {
        throw new Error(`Expected move ${notation} to exist`)
      }
      state = applyMove(state, move)
    }

    expect(state.status).toBe("drawn")
    expect(state.endReason).toBe("threefold-repetition")
  })

  it("tracks the 25 quiet king-move rule as a draw", () => {
    const state = createGameState({
      sideToMove: "white",
      whiteKings: ["b2"],
      blackKings: ["h6"],
      kingQuietMoveCount: 24,
    })

    const move = getLegalMoves(state).find((candidate) => candidate.notation === "b2-a3")
    if (!move) {
      throw new Error("Expected move b2-a3 to exist")
    }

    const nextState = applyMove(state, move)

    expect(nextState.status).toBe("drawn")
    expect(nextState.endReason).toBe("25-king-moves")
  })

  it("tracks the 3 kings versus 1 king draw condition", () => {
    const state = createGameState({
      sideToMove: "white",
      whiteKings: ["a1", "c1", "e1"],
      blackKings: ["h6"],
      threeKingsVsOneKingCount: 15,
    })

    const move = getLegalMoves(state).find((candidate) => candidate.notation === "a1-b2")
    if (!move) {
      throw new Error("Expected move a1-b2 to exist")
    }

    const nextState = applyMove(state, move)

    expect(nextState.status).toBe("drawn")
    expect(nextState.endReason).toBe("three-kings-versus-one-king")
  })

  it("crowns white men after a quiet promotion", () => {
    const state = createGameState({
      sideToMove: "white",
      whiteMen: ["g7"],
      blackKings: ["a1"],
    })

    const move = getLegalMoves(state).find((candidate) => candidate.notation === "g7-h8")
    if (!move) {
      throw new Error("Expected move g7-h8 to exist")
    }

    const nextState = applyMove(state, move)

    expect(nextState.board[squareToIndex("h8")]).toEqual({color: "white", king: true})
  })

  it("crowns black men after a quiet promotion", () => {
    const state = createGameState({
      sideToMove: "black",
      whiteKings: ["h8"],
      blackMen: ["b2"],
    })

    const move = getLegalMoves(state).find((candidate) => candidate.notation === "b2-a1")
    if (!move) {
      throw new Error("Expected move b2-a1 to exist")
    }

    const nextState = applyMove(state, move)

    expect(nextState.board[squareToIndex("a1")]).toEqual({color: "black", king: true})
  })

  it("detects no-moves losses", () => {
    const state = createGameState({
      sideToMove: "black",
      whiteKings: ["h8"],
      blackMen: ["a1"],
    })

    expect(getGameSummary(state)).toEqual({
      status: "won",
      result: "white",
      endReason: "no-moves",
    })
  })

  it("detects no-pieces wins", () => {
    const state = createGameState({
      sideToMove: "white",
      whiteMen: ["c3"],
    })

    expect(getGameSummary(state)).toEqual({
      status: "won",
      result: "white",
      endReason: "no-pieces",
    })
  })

  it("keeps input state immutable when applying a move", () => {
    const state = newGame()
    const openingMove = getLegalMoves(state)[0]
    const nextState = applyMove(state, openingMove)

    expect(nextState).not.toBe(state)
    expect(getLegalMoves(state)).toHaveLength(7)
  })

  it("returns a legal hard move for a mid-game position", () => {
    const state = createGameState({
      sideToMove: "white",
      whiteMen: ["c3", "e3", "g3"],
      whiteKings: ["b2"],
      blackMen: ["d4", "f4", "f6"],
      blackKings: ["g7"],
    })

    const bestMove = getBestMove(state, "hard")

    expect(getLegalMoves(state).map((move) => move.notation)).toContain(bestMove.notation)
  })

  it("evaluates a winning material edge positively", () => {
    const state = createGameState({
      sideToMove: "white",
      whiteKings: ["d4"],
      blackMen: ["g7"],
    })

    expect(evaluatePosition(state).eval).toBeGreaterThan(0)
  })
})
