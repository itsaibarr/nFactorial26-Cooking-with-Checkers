import { getBestMove } from "@/lib/engine/engine"
import type { DifficultyLevel, GameState, Move } from "@/lib/engine/types"

export interface EngineWorkerRequest {
  readonly id: string
  readonly state: GameState
  readonly level: Exclude<DifficultyLevel, "easy">
}

export interface EngineWorkerResponse {
  readonly id: string
  readonly move: Move | null
  readonly error: string | null
}

self.onmessage = (event: MessageEvent<EngineWorkerRequest>) => {
  try {
    const {id, state, level} = event.data
    const move = getBestMove(state, level)

    const payload: EngineWorkerResponse = {
      id,
      move,
      error: null,
    }

    self.postMessage(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown engine worker error"

    const payload: EngineWorkerResponse = {
      id: event.data.id,
      move: null,
      error: message,
    }

    self.postMessage(payload)
  }
}
