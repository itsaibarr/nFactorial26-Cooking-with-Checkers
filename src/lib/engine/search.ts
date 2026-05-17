import { applyLegalMoveRaw } from "@/lib/engine/board"
import { evaluateState } from "@/lib/engine/eval"
import { getGameSummary, getLegalMoves } from "@/lib/engine/moves"
import type { DifficultyLevel, GameState, SearchResult } from "@/lib/engine/types"

const SEARCH_TIMEOUT_ERROR = "ENGINE_SEARCH_TIMEOUT"
const CHECKMATE_SCORE = 100_000
const QUIESCENCE_DEPTH = 4

class SearchTimeoutError extends Error {
  constructor() {
    super(SEARCH_TIMEOUT_ERROR)
  }
}

function annotateState(state: GameState): GameState {
  const summary = getGameSummary(state)

  if (
    summary.status === state.status &&
    summary.result === state.result &&
    summary.endReason === state.endReason
  ) {
    return state
  }

  return {
    ...state,
    ...summary,
  }
}

function ensureTimeRemaining(deadline: number) {
  if (Date.now() > deadline) {
    throw new SearchTimeoutError()
  }
}

function terminalScore(state: GameState, depth: number) {
  if (state.status === "won") {
    if (state.result === state.sideToMove) {
      return CHECKMATE_SCORE - depth
    }

    return -CHECKMATE_SCORE + depth
  }

  if (state.status === "drawn") {
    return 0
  }

  return evaluateState(state)
}

function quiescence(
  state: GameState,
  alpha: number,
  beta: number,
  depth: number,
  deadline: number,
): SearchResult {
  ensureTimeRemaining(deadline)

  const annotatedState = annotateState(state)
  const standingScore = terminalScore(annotatedState, depth)

  if (annotatedState.status !== "playing") {
    return {
      bestMove: null,
      eval: standingScore,
      principalVariation: [],
    }
  }

  let bestScore = standingScore
  let currentAlpha = alpha

  if (bestScore >= beta) {
    return {
      bestMove: null,
      eval: bestScore,
      principalVariation: [],
    }
  }

  if (bestScore > currentAlpha) {
    currentAlpha = bestScore
  }

  if (depth >= QUIESCENCE_DEPTH) {
    return {
      bestMove: null,
      eval: bestScore,
      principalVariation: [],
    }
  }

  const captureMoves = getLegalMoves(annotatedState).filter(
    (move) => move.captures.length > 0,
  )

  let bestMove = null
  let bestVariation: readonly string[] = []

  for (const move of captureMoves) {
    const child = applyLegalMoveRaw(annotatedState, move)
    const reply = quiescence(child, -beta, -currentAlpha, depth + 1, deadline)
    const score = -reply.eval

    if (score > bestScore) {
      bestScore = score
      bestMove = move
      bestVariation = [move.notation, ...reply.principalVariation]
    }

    if (score > currentAlpha) {
      currentAlpha = score
    }

    if (currentAlpha >= beta) {
      break
    }
  }

  return {
    bestMove,
    eval: bestScore,
    principalVariation: bestVariation,
  }
}

function negamax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  deadline: number,
): SearchResult {
  ensureTimeRemaining(deadline)

  const annotatedState = annotateState(state)

  if (depth === 0 || annotatedState.status !== "playing") {
    return quiescence(annotatedState, alpha, beta, 0, deadline)
  }

  const legalMoves = getLegalMoves(annotatedState)
  if (legalMoves.length === 0) {
    return {
      bestMove: null,
      eval: terminalScore(annotatedState, depth),
      principalVariation: [],
    }
  }

  let bestMove = legalMoves[0] ?? null
  let bestScore = Number.NEGATIVE_INFINITY
  let currentAlpha = alpha
  let bestVariation: readonly string[] = []

  for (const move of legalMoves) {
    const child = applyLegalMoveRaw(annotatedState, move)
    const reply = negamax(child, depth - 1, -beta, -currentAlpha, deadline)
    const score = -reply.eval

    if (score > bestScore) {
      bestScore = score
      bestMove = move
      bestVariation = [move.notation, ...reply.principalVariation]
    }

    if (score > currentAlpha) {
      currentAlpha = score
    }

    if (currentAlpha >= beta) {
      break
    }
  }

  return {
    bestMove,
    eval: bestScore,
    principalVariation: bestVariation,
  }
}

function getSearchSettings(level: Exclude<DifficultyLevel, "easy">) {
  if (level === "medium") {
    return {maxDepth: 4, timeLimitMs: 500}
  }

  return {maxDepth: 6, timeLimitMs: 1500}
}

export function searchBestMove(
  state: GameState,
  level: Exclude<DifficultyLevel, "easy">,
): SearchResult {
  const annotatedState = annotateState(state)
  const legalMoves = getLegalMoves(annotatedState)

  if (legalMoves.length === 0) {
    return {
      bestMove: null,
      eval: terminalScore(annotatedState, 0),
      principalVariation: [],
    }
  }

  const {maxDepth, timeLimitMs} = getSearchSettings(level)
  const deadline = Date.now() + timeLimitMs
  let bestResult: SearchResult = {
    bestMove: legalMoves[0] ?? null,
    eval: evaluateState(annotatedState),
    principalVariation: legalMoves[0] ? [legalMoves[0].notation] : [],
  }

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    try {
      const result = negamax(
        annotatedState,
        depth,
        Number.NEGATIVE_INFINITY,
        Number.POSITIVE_INFINITY,
        deadline,
      )

      if (result.bestMove) {
        bestResult = result
      }
    } catch (error) {
      if (
        error instanceof SearchTimeoutError ||
        (error instanceof Error && error.message === SEARCH_TIMEOUT_ERROR)
      ) {
        break
      }

      throw error
    }
  }

  return bestResult
}
