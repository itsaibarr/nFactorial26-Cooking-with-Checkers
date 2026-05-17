"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { Board } from "@/components/board/Board"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createGameState } from "@/lib/engine/board"
import { applyMove, getLegalMoves } from "@/lib/engine/engine"
import type { CreateGameStateOptions, GameState, Move, PieceColor } from "@/lib/engine/types"

interface PuzzleBoardProps {
  puzzleId: string
  position: CreateGameStateOptions
  sideToMove: PieceColor
  solutionMoves: string[]
  explanationRu: string
  explanationEn: string
  alreadySolved: boolean
  onSolved: (timeTakenSeconds: number, attemptsUsed: number) => void
}

type PuzzlePhase = "playing" | "wrong" | "correct"

// Lazy initializer avoids calling createGameState on every render.
function buildInitialState(position: CreateGameStateOptions, sideToMove: PieceColor): GameState {
  return createGameState({...position, sideToMove})
}

export function PuzzleBoard({
  position,
  sideToMove,
  solutionMoves,
  explanationRu,
  onSolved,
  alreadySolved,
}: PuzzleBoardProps) {
  // useState with a function reference avoids re-running on every render.
  const [state, setState] = useState<GameState>(() =>
    buildInitialState(position, sideToMove),
  )
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null)
  const [phase, setPhase] = useState<PuzzlePhase>(alreadySolved ? "correct" : "playing")
  const [attemptsUsed, setAttemptsUsed] = useState(0)
  // eslint-disable-next-line react-hooks/purity -- useRef initializer only runs once on mount
  const startedAtRef = useRef<number>(performance.now())
  // Keep a stable ref to the initial state for the reset button.
  const initialStateRef = useRef<GameState>(state)

  const legalMoves = useMemo(() => getLegalMoves(state), [state])

  const selectedMoves = useMemo(
    () => (selectedSquare === null ? [] : legalMoves.filter((m) => m.from === selectedSquare)),
    [legalMoves, selectedSquare],
  )

  const selectableSquares = useMemo(
    () => new Set(legalMoves.map((m) => m.from)),
    [legalMoves],
  )

  const destinationSquares = useMemo(
    () => new Set(selectedMoves.map((m) => m.to)),
    [selectedMoves],
  )

  const handleMove = useCallback(
    (move: Move) => {
      const expectedNotation = solutionMoves[0]
      const newAttemptsUsed = attemptsUsed + 1
      setAttemptsUsed(newAttemptsUsed)

      if (move.notation === expectedNotation) {
        setState(applyMove(state, move))
        setSelectedSquare(null)
        setPhase("correct")
        const elapsed = Math.round((performance.now() - startedAtRef.current) / 1000)
        onSolved(elapsed, newAttemptsUsed)
      } else {
        setPhase("wrong")
        setSelectedSquare(null)
      }
    },
    [attemptsUsed, onSolved, solutionMoves, state],
  )

  const handleReset = useCallback(() => {
    setState(initialStateRef.current)
    setSelectedSquare(null)
    setPhase("playing")
  }, [])

  const handleSquarePress = useCallback(
    (index: number) => {
      if (phase !== "playing") return

      const destinationMoves = selectedMoves.filter((m) => m.to === index)
      if (destinationMoves.length >= 1) {
        handleMove(destinationMoves[0]!)
        return
      }

      if (selectableSquares.has(index)) {
        setSelectedSquare(selectedSquare === index ? null : index)
        return
      }

      setSelectedSquare(null)
    },
    [handleMove, phase, selectedMoves, selectedSquare, selectableSquares],
  )

  return (
    <div className="space-y-4">
      <Board
        state={state}
        selectedSquare={selectedSquare}
        selectableSquares={phase === "playing" ? selectableSquares : new Set<number>()}
        destinationSquares={phase === "playing" ? destinationSquares : new Set<number>()}
        disabled={phase !== "playing"}
        onSquarePress={handleSquarePress}
      />

      {phase === "wrong" && (
        <Alert variant="destructive">
          <AlertTitle>Неверный ход</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>Попробуйте ещё раз — найдите лучший ход.</span>
            <Button size="sm" variant="outline" onClick={handleReset}>
              Сбросить
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {phase === "correct" && (
        <Card className="border-green-500/40 bg-green-50/60 dark:bg-green-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-700 dark:text-green-400">
              ✓ Правильно!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{explanationRu}</p>
          </CardContent>
        </Card>
      )}

      {phase === "playing" && (
        <p className="text-center text-sm text-muted-foreground">
          {sideToMove === "white" ? "Ход белых" : "Ход чёрных"} — найдите лучшее взятие
        </p>
      )}
    </div>
  )
}
