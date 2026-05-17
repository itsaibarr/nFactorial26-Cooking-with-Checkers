import { getBestMove } from "@/lib/engine/engine"
import type { DifficultyLevel, GameState, Move } from "@/lib/engine/types"

export async function resolveBotMove({
  state,
  opponentLevel,
  requestWorkerMove,
}: {
  state: GameState
  opponentLevel: DifficultyLevel
  requestWorkerMove: (
    state: GameState,
    level: Exclude<DifficultyLevel, "easy">,
  ) => Promise<Move>
}) {
  if (opponentLevel === "easy") {
    return getBestMove(state, "easy")
  }

  try {
    return await requestWorkerMove(state, opponentLevel)
  } catch {
    return getBestMove(state, opponentLevel)
  }
}
