import { applyLegalMoveRaw, createInitialState, freezeState } from "@/lib/engine/board"
import { evaluateState } from "@/lib/engine/eval"
import { getGameSummary, getLegalMoves as generateLegalMoves } from "@/lib/engine/moves"
import { searchBestMove } from "@/lib/engine/search"
import type { DifficultyLevel, GameState, Move } from "@/lib/engine/types"

function annotateState(state: GameState) {
  const summary = getGameSummary(state)

  if (
    summary.status === state.status &&
    summary.result === state.result &&
    summary.endReason === state.endReason
  ) {
    return state
  }

  return freezeState({
    ...state,
    ...summary,
  })
}

export function newGame() {
  return annotateState(createInitialState())
}

export function getLegalMoves(state: GameState) {
  const annotatedState = annotateState(state)

  if (annotatedState.status !== "playing") {
    return Object.freeze([]) as readonly Move[]
  }

  return generateLegalMoves(annotatedState)
}

export function applyMove(state: GameState, move: Move) {
  const annotatedState = annotateState(state)

  if (annotatedState.status !== "playing") {
    throw new Error("Cannot apply a move to a finished game")
  }

  const legalMove = getLegalMoves(annotatedState).find(
    (candidate) => candidate.notation === move.notation,
  )

  if (!legalMove) {
    throw new Error(`Illegal move: ${move.notation}`)
  }

  return annotateState(applyLegalMoveRaw(annotatedState, legalMove))
}

export function getBestMove(state: GameState, level: DifficultyLevel) {
  const annotatedState = annotateState(state)
  const legalMoves = getLegalMoves(annotatedState)

  if (legalMoves.length === 0) {
    throw new Error("No legal moves available")
  }

  if (level === "easy") {
    const randomIndex = Math.floor(Math.random() * legalMoves.length)
    return legalMoves[randomIndex]!
  }

  const result = searchBestMove(annotatedState, level)
  return result.bestMove ?? legalMoves[0]!
}

export function evaluatePosition(state: GameState) {
  const annotatedState = annotateState(state)

  if (annotatedState.status !== "playing") {
    return {
      eval: evaluateState(annotatedState),
      bestMove: null,
    }
  }

  const result = searchBestMove(annotatedState, "medium")

  return {
    eval: result.eval,
    bestMove: result.bestMove,
  }
}
