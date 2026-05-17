import { getBestMove } from "@/lib/engine/engine"
import type { GameState, Move } from "@/lib/engine/types"

export async function resolveRecommendedMove({
  state,
  requestWorkerMove,
}: {
  state: GameState
  requestWorkerMove: (state: GameState, level: "medium") => Promise<Move>
}) {
  try {
    return await requestWorkerMove(state, "medium")
  } catch {
    return getBestMove(state, "medium")
  }
}
