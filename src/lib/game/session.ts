import { applyMove, getLegalMoves, newGame } from "@/lib/engine/engine"
import type { GameState, PieceColor } from "@/lib/engine/types"
import { z } from "zod"

export interface RecordedMoveInput {
  readonly notation: string
  readonly durationMs: number | null
}

export interface RecordedMove extends RecordedMoveInput {
  readonly side: PieceColor
}

export type PlayerGameResult = "win" | "loss" | "draw"

export const recordedMoveInputSchema = z.object({
  notation: z.string().min(1).max(64),
  durationMs: z.number().int().nonnegative().nullable(),
})

export const recordedMoveInputListSchema = z.array(recordedMoveInputSchema).max(400)
export const recordedMoveSchema = recordedMoveInputSchema.extend({
  side: z.enum(["white", "black"]),
})
export const recordedMoveListSchema = z.array(recordedMoveSchema).max(400)

export function replayRecordedGame(inputs: readonly RecordedMoveInput[]) {
  let state = newGame()
  const moves: RecordedMove[] = []

  for (const input of inputs) {
    const move = getLegalMoves(state).find((candidate) => candidate.notation === input.notation)
    if (!move) {
      throw new Error(`Illegal recorded move: ${input.notation}`)
    }

    moves.push({
      notation: move.notation,
      durationMs: input.durationMs ?? null,
      side: state.sideToMove,
    })

    state = applyMove(state, move)
  }

  return {
    moves: Object.freeze(moves),
    state,
  }
}

export function getPlayerGameResult(
  state: Pick<GameState, "status" | "result">,
  playerColor: PieceColor,
): PlayerGameResult {
  if (state.status === "drawn" || state.result === "draw") {
    return "draw"
  }

  if (state.status !== "won" || !state.result) {
    throw new Error("Cannot derive a player result from an unfinished game")
  }

  return state.result === playerColor ? "win" : "loss"
}
