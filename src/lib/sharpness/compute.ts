import { applyMove, getLegalMoves, newGame } from "@/lib/engine/engine"
import { evaluateState } from "@/lib/engine/eval"
import type { Move, PieceColor } from "@/lib/engine/types"
import type { RecordedMoveInput } from "@/lib/game/session"
import { z } from "zod"

export interface SharpnessBreakdown {
  readonly accuracy: number
  readonly speed: number
  readonly blunderRate: number
  readonly topThreeMatches: number
  readonly playerMoves: number
  readonly blunders: number
  readonly averageMoveTimeMs: number | null
}

export interface SharpnessAnalysis {
  readonly score: number
  readonly breakdown: SharpnessBreakdown
}

export const sharpnessBreakdownSchema = z.object({
  accuracy: z.number().int().min(0).max(100),
  speed: z.number().int().min(0).max(100),
  blunderRate: z.number().int().min(0).max(100),
  topThreeMatches: z.number().int().min(0),
  playerMoves: z.number().int().min(0),
  blunders: z.number().int().min(0),
  averageMoveTimeMs: z.number().int().min(0).nullable(),
})

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score))
}

function average(values: readonly number[]) {
  if (values.length === 0) {
    return null
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function median(values: readonly number[]) {
  if (values.length === 0) {
    return null
  }

  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? null
  }

  const left = sorted[middle - 1]
  const right = sorted[middle]
  if (left === undefined || right === undefined) {
    return null
  }

  return (left + right) / 2
}

function getSpeedScore(durations: readonly number[]) {
  if (durations.length === 0) {
    return 50
  }

  const baseline = median(durations)
  if (!baseline || baseline <= 0) {
    return 50
  }

  const averageDeviationRatio =
    durations.reduce((sum, duration) => sum + Math.abs(duration - baseline) / baseline, 0) /
    durations.length

  return clampScore(Math.round(100 - averageDeviationRatio * 100))
}

function scoreRankedMove(state: ReturnType<typeof newGame>, move: Move) {
  const nextState = applyMove(state, move)
  if (nextState.status !== "playing") {
    return -evaluateState(nextState)
  }

  return Math.min(...getLegalMoves(nextState).map((reply) => evaluateState(applyMove(nextState, reply))))
}

function rankMoves(state: ReturnType<typeof newGame>) {
  return getLegalMoves(state)
    .map((move) => ({
      notation: move.notation,
      score: scoreRankedMove(state, move),
    }))
    .sort((left, right) => right.score - left.score)
}

export function computeGameSharpness({
  playerColor,
  moves,
}: {
  playerColor: PieceColor
  moves: readonly RecordedMoveInput[]
}): SharpnessAnalysis {
  let state = newGame()
  let playerMoves = 0
  let topThreeMatches = 0
  let blunders = 0
  let accuracyTotal = 0
  const playerDurations: number[] = []

  for (const recordedMove of moves) {
    const legalMoves = getLegalMoves(state)
    const move = legalMoves.find((candidate) => candidate.notation === recordedMove.notation)
    if (!move) {
      throw new Error(`Illegal recorded move: ${recordedMove.notation}`)
    }

    if (state.sideToMove === playerColor) {
      const rankedMoves = rankMoves(state)
      const bestScore = rankedMoves[0]?.score ?? 0
      const playedScore = rankedMoves.find((candidate) => candidate.notation === move.notation)?.score

      if (playedScore === undefined) {
        throw new Error(`Ranked move not found: ${move.notation}`)
      }

      const evalLoss = Math.max(0, bestScore - playedScore)
      const topThree = rankedMoves.slice(0, 3).map((candidate) => candidate.notation)

      if (topThree.includes(move.notation)) {
        topThreeMatches += 1
      }

      if (evalLoss >= 200) {
        blunders += 1
      }

      accuracyTotal += topThree.includes(move.notation)
        ? 100
        : clampScore(Math.round(100 - evalLoss / 4))

      if (typeof recordedMove.durationMs === "number" && recordedMove.durationMs >= 0) {
        playerDurations.push(recordedMove.durationMs)
      }

      playerMoves += 1
    }

    state = applyMove(state, move)
  }

  const accuracy = playerMoves === 0 ? 50 : Math.round(accuracyTotal / playerMoves)
  const speed = getSpeedScore(playerDurations)
  const blunderRate =
    playerMoves === 0 ? 100 : Math.round(((playerMoves - blunders) / playerMoves) * 100)
  const score = clampScore(Math.round(accuracy * 0.4 + speed * 0.2 + blunderRate * 0.4))
  const averageMoveTimeMs = average(playerDurations)

  return {
    score,
    breakdown: {
      accuracy,
      speed,
      blunderRate,
      topThreeMatches,
      playerMoves,
      blunders,
      averageMoveTimeMs: averageMoveTimeMs === null ? null : Math.round(averageMoveTimeMs),
    },
  }
}

export function updateSharpnessEma(currentSharpness: number, nextScore: number, period = 7) {
  const alpha = 2 / (period + 1)

  return clampScore(Math.round(currentSharpness + alpha * (nextScore - currentSharpness)))
}
