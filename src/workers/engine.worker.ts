import { getBestMove } from "@/lib/engine/engine"
import type { DifficultyLevel, GameState, Move } from "@/lib/engine/types"

export interface EngineWorkerRequest {
  readonly id: string
  readonly state: GameState
  readonly level: Exclude<DifficultyLevel, "easy">
}

export interface EngineWorkerResponse {
  readonly id: string
  readonly move: Move
}

self.onmessage = (event: MessageEvent<EngineWorkerRequest>) => {
  const {id, state, level} = event.data
  const move = getBestMove(state, level)

  const payload: EngineWorkerResponse = {
    id,
    move,
  }

  self.postMessage(payload)
}
