"use client"

import { create } from "zustand"
import { applyMove as applyEngineMove, newGame } from "@/lib/engine/engine"
import type { DifficultyLevel, GameState, Move, PieceColor } from "@/lib/engine/types"
import type { RecordedMove } from "@/lib/game/session"

export interface GameSessionSnapshot {
  readonly gameId: string
  readonly state: GameState
  readonly playerColor: PieceColor
  readonly opponentLevel: DifficultyLevel
  readonly startedAt: string
  readonly recordedMoves: readonly RecordedMove[]
  readonly persistedComplete: boolean
}

interface GameSessionStore {
  readonly hydrated: boolean
  readonly gameId: string | null
  readonly state: GameState
  readonly playerColor: PieceColor
  readonly opponentLevel: DifficultyLevel
  readonly startedAt: string | null
  readonly recordedMoves: readonly RecordedMove[]
  readonly selectedSquare: number | null
  readonly ambiguousMoves: readonly Move[]
  readonly persistedComplete: boolean
  initializeSession: (snapshot: GameSessionSnapshot) => void
  selectSquare: (square: number | null) => void
  setAmbiguousMoves: (moves: readonly Move[]) => void
  clearMoveChoiceState: () => void
  applyRecordedMove: (move: Move, durationMs: number | null) => void
}

function buildDefaultState() {
  return {
    hydrated: false,
    gameId: null,
    state: newGame(),
    playerColor: "white" as PieceColor,
    opponentLevel: "easy" as DifficultyLevel,
    startedAt: null,
    recordedMoves: [] as readonly RecordedMove[],
    selectedSquare: null,
    ambiguousMoves: [] as readonly Move[],
    persistedComplete: false,
  }
}

export const useGameSessionStore = create<GameSessionStore>((set) => ({
  ...buildDefaultState(),
  initializeSession: (snapshot) =>
    set({
      hydrated: true,
      gameId: snapshot.gameId,
      state: snapshot.state,
      playerColor: snapshot.playerColor,
      opponentLevel: snapshot.opponentLevel,
      startedAt: snapshot.startedAt,
      recordedMoves: snapshot.recordedMoves,
      selectedSquare: null,
      ambiguousMoves: [],
      persistedComplete: snapshot.persistedComplete,
    }),
  selectSquare: (square) => set({selectedSquare: square}),
  setAmbiguousMoves: (moves) => set({ambiguousMoves: moves}),
  clearMoveChoiceState: () => set({selectedSquare: null, ambiguousMoves: []}),
  applyRecordedMove: (move, durationMs) =>
    set((current) => ({
      state: applyEngineMove(current.state, move),
      recordedMoves: [
        ...current.recordedMoves,
        {
          notation: move.notation,
          durationMs,
          side: current.state.sideToMove,
        },
      ],
      selectedSquare: null,
      ambiguousMoves: [],
    })),
}))
