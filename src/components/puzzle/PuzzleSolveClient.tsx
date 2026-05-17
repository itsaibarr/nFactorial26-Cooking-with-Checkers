"use client"

import { useCallback, useState } from "react"
import { PuzzleBoard } from "@/components/puzzle/PuzzleBoard"
import type { CreateGameStateOptions, PieceColor } from "@/lib/engine/types"

interface PuzzleSolveClientProps {
  puzzleId: string
  position: CreateGameStateOptions
  sideToMove: PieceColor
  solutionMoves: string[]
  explanationRu: string
  explanationEn: string
  alreadySolved: boolean
}

export function PuzzleSolveClient({
  puzzleId,
  position,
  sideToMove,
  solutionMoves,
  explanationRu,
  explanationEn,
  alreadySolved,
}: PuzzleSolveClientProps) {
  const [solved, setSolved] = useState(alreadySolved)

  const handleSolved = useCallback(
    async (timeTakenSeconds: number, attemptsUsed: number) => {
      setSolved(true)
      await fetch("/api/puzzles/attempt", {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({
          puzzleId,
          solved: true,
          timeTakenSeconds,
          attemptsUsed,
        }),
      }).catch(() => undefined)
    },
    [puzzleId],
  )

  return (
    <PuzzleBoard
      puzzleId={puzzleId}
      position={position}
      sideToMove={sideToMove}
      solutionMoves={solutionMoves}
      explanationRu={explanationRu}
      explanationEn={explanationEn}
      alreadySolved={solved}
      onSolved={handleSolved}
    />
  )
}
