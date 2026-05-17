import { applyMove, getLegalMoves, newGame } from "@/lib/engine/engine"
import { evaluateState } from "@/lib/engine/eval"
import type { GameState, Move, PieceColor } from "@/lib/engine/types"
import type { RecordedMoveInput } from "@/lib/game/session"
import { criticalMomentSchema, type CriticalMoment } from "@/lib/coach/types"

const CRITICAL_SWING_THRESHOLD = 150
const MAX_CRITICAL_MOMENTS = 5

interface RankedMove {
  readonly notation: string
  readonly score: number
}

interface ScoredMoment extends CriticalMoment {
  readonly scoredSwing: number
}

function toPlayerPerspective(
  score: number,
  sideToMove: PieceColor,
  playerColor: PieceColor,
) {
  return sideToMove === playerColor ? score : -score
}

function scoreMoveForPlayer(
  state: GameState,
  move: Move,
  playerColor: PieceColor,
) {
  const nextState = applyMove(state, move)
  if (nextState.status !== "playing") {
    return toPlayerPerspective(
      evaluateState(nextState),
      nextState.sideToMove,
      playerColor,
    )
  }

  const replyScores = getLegalMoves(nextState).map((reply) => {
    const replyState = applyMove(nextState, reply)
    return toPlayerPerspective(
      evaluateState(replyState),
      replyState.sideToMove,
      playerColor,
    )
  })

  if (replyScores.length === 0) {
    return toPlayerPerspective(
      evaluateState(nextState),
      nextState.sideToMove,
      playerColor,
    )
  }

  return Math.min(...replyScores)
}

function rankMovesForPlayer(
  state: GameState,
  playerColor: PieceColor,
) {
  return getLegalMoves(state)
    .map((move) => ({
      notation: move.notation,
      score: scoreMoveForPlayer(state, move, playerColor),
    }))
    .sort((left, right) => right.score - left.score) satisfies readonly RankedMove[]
}

function classifyMoment({
  playedMove,
  bestMove,
  evalDelta,
  decisionLoss,
}: {
  playedMove: string
  bestMove: string | null
  evalDelta: number
  decisionLoss: number
}): CriticalMoment["type"] {
  if (bestMove && playedMove === bestMove) {
    return evalDelta >= 75 ? "best_move" : "good_idea"
  }

  if (decisionLoss >= 300) {
    return "blunder"
  }

  if (decisionLoss >= 150) {
    return "missed_tactic"
  }

  if (evalDelta >= 150) {
    return "good_idea"
  }

  return evalDelta >= 0 ? "good_idea" : "missed_tactic"
}

export function detectCriticalMoments({
  playerColor,
  moves,
}: {
  playerColor: PieceColor
  moves: readonly RecordedMoveInput[]
}) {
  let state = newGame()
  let playerMoveNumber = 0
  const scoredMoments: ScoredMoment[] = []

  for (const recordedMove of moves) {
    const legalMove = getLegalMoves(state).find(
      (candidate) => candidate.notation === recordedMove.notation,
    )

    if (!legalMove) {
      throw new Error(`Illegal recorded move: ${recordedMove.notation}`)
    }

    if (state.sideToMove === playerColor) {
      playerMoveNumber += 1

      const evalBefore = toPlayerPerspective(
        evaluateState(state),
        state.sideToMove,
        playerColor,
      )
      const rankedMoves = rankMovesForPlayer(state, playerColor)
      const playedScore =
        rankedMoves.find((candidate) => candidate.notation === legalMove.notation)
          ?.score ?? evalBefore
      const bestScore = rankedMoves[0]?.score ?? playedScore
      const bestMove = rankedMoves[0]?.notation ?? null

      state = applyMove(state, legalMove)

      const evalAfter = toPlayerPerspective(
        evaluateState(state),
        state.sideToMove,
        playerColor,
      )
      const evalDelta = evalAfter - evalBefore
      const decisionLoss = Math.max(0, bestScore - playedScore)
      const scoredSwing = Math.max(Math.abs(evalDelta), decisionLoss)

      scoredMoments.push({
        move_number: playerMoveNumber,
        notation: legalMove.notation,
        type: classifyMoment({
          playedMove: legalMove.notation,
          bestMove,
          evalDelta,
          decisionLoss,
        }),
        eval_before: evalBefore,
        eval_after: evalAfter,
        swing: scoredSwing,
        best_move: bestMove,
        scoredSwing,
      })

      continue
    }

    state = applyMove(state, legalMove)
  }

  if (scoredMoments.length === 0) {
    return Object.freeze([]) as readonly CriticalMoment[]
  }

  const importantMoments = scoredMoments.filter(
    (moment) => moment.scoredSwing >= CRITICAL_SWING_THRESHOLD,
  )
  const sortedMoments = [...(importantMoments.length > 0 ? importantMoments : scoredMoments)].sort(
    (left, right) => right.scoredSwing - left.scoredSwing,
  )

  return Object.freeze(
    sortedMoments.slice(0, MAX_CRITICAL_MOMENTS).map((moment) =>
      criticalMomentSchema.parse({
        move_number: moment.move_number,
        notation: moment.notation,
        type: moment.type,
        eval_before: moment.eval_before,
        eval_after: moment.eval_after,
        swing: moment.swing,
        best_move: moment.best_move,
      }),
    ),
  ) as readonly CriticalMoment[]
}
