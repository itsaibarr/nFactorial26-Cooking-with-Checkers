"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { Board } from "@/components/board/Board"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createGameState, indexToSquare } from "@/lib/engine/board"
import { applyMove, getLegalMoves } from "@/lib/engine/engine"
import {
  findMoveMatchingPath,
  getCapturePathNextSquares,
} from "@/lib/game/capture-selection"
import type { GameplayPreferences } from "@/lib/game/preferences"
import type { CreateGameStateOptions, GameState, Move, PieceColor } from "@/lib/engine/types"

interface PuzzleBoardProps {
  puzzleId: string
  position: CreateGameStateOptions
  sideToMove: PieceColor
  solutionMoves: string[]
  explanation: string
  alreadySolved: boolean
  gameplayPreferences: GameplayPreferences
  onSolved: (
    timeTakenSeconds: number,
    attemptsUsed: number,
  ) => Promise<{accepted: boolean}>
}

type PuzzlePhase = "playing" | "wrong" | "submitting" | "correct"
const EMPTY_SQUARE_SET = new Set<number>()

// Lazy initializer avoids calling createGameState on every render.
function buildInitialState(position: CreateGameStateOptions, sideToMove: PieceColor): GameState {
  return createGameState({...position, sideToMove})
}

export function PuzzleBoard({
  position,
  sideToMove,
  solutionMoves,
  explanation,
  onSolved,
  alreadySolved,
  gameplayPreferences,
}: PuzzleBoardProps) {
  // useState with a function reference avoids re-running on every render.
  const [state, setState] = useState<GameState>(() =>
    buildInitialState(position, sideToMove),
  )
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null)
  const [phase, setPhase] = useState<PuzzlePhase>(alreadySolved ? "correct" : "playing")
  const [attemptsUsed, setAttemptsUsed] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [capturePath, setCapturePath] = useState<readonly number[]>([])
  // eslint-disable-next-line react-hooks/purity -- useRef initializer only runs once on mount
  const startedAtRef = useRef<number>(performance.now())
  // Keep a stable ref to the initial state for the reset button.
  const initialStateRef = useRef<GameState>(state)

  const legalMoves = useMemo(() => getLegalMoves(state), [state])

  const selectedMoves = useMemo(
    () => (selectedSquare === null ? [] : legalMoves.filter((m) => m.from === selectedSquare)),
    [legalMoves, selectedSquare],
  )
  const isStepByStepCaptureActive =
    gameplayPreferences.captureInputMode === "step_by_step" &&
    selectedSquare !== null &&
    selectedMoves.length > 0 &&
    selectedMoves.every((move) => move.captures.length > 0)
  const activeCapturePath = useMemo(
    () =>
      isStepByStepCaptureActive
        ? capturePath.length > 0
          ? capturePath
          : [selectedSquare!]
        : [],
    [capturePath, isStepByStepCaptureActive, selectedSquare],
  )

  const selectableSquares = useMemo(
    () => new Set(legalMoves.map((m) => m.from)),
    [legalMoves],
  )

  const interactiveDestinationSquares = useMemo(
    () =>
      new Set(
        isStepByStepCaptureActive
          ? getCapturePathNextSquares(selectedMoves, activeCapturePath)
          : selectedMoves.map((move) => move.to),
      ),
    [activeCapturePath, isStepByStepCaptureActive, selectedMoves],
  )
  const boardSelectableSquares = useMemo(
    () => (gameplayPreferences.showLegalMoves ? selectableSquares : EMPTY_SQUARE_SET),
    [gameplayPreferences.showLegalMoves, selectableSquares],
  )
  const boardDestinationSquares = useMemo(
    () =>
      gameplayPreferences.showLegalMoves || isStepByStepCaptureActive
        ? interactiveDestinationSquares
        : EMPTY_SQUARE_SET,
    [gameplayPreferences.showLegalMoves, interactiveDestinationSquares, isStepByStepCaptureActive],
  )
  const capturePathPreviewSquares = useMemo(
    () =>
      activeCapturePath.length > 1
        ? new Set(activeCapturePath.slice(1, activeCapturePath.length))
        : EMPTY_SQUARE_SET,
    [activeCapturePath],
  )
  const capturePathLabel = useMemo(
    () => activeCapturePath.map((square) => indexToSquare(square)).join(" → "),
    [activeCapturePath],
  )

  const handleMove = useCallback(
    async (move: Move) => {
      const newAttemptsUsed = attemptsUsed + 1

      if (solutionMoves.includes(move.notation)) {
        const previousState = state
        const nextState = applyMove(state, move)
        setSelectedSquare(null)
        setCapturePath([])
        setState(nextState)
        setPhase("submitting")
        const elapsed = Math.round((performance.now() - startedAtRef.current) / 1000)
        setIsSubmitting(true)

        try {
          const result = await onSolved(elapsed, newAttemptsUsed)

          if (!result.accepted) {
            setState(previousState)
            setPhase("playing")
            return
          }

          setAttemptsUsed(newAttemptsUsed)
          setPhase("correct")
        } finally {
          setIsSubmitting(false)
        }
      } else {
        setAttemptsUsed(newAttemptsUsed)
        setPhase("wrong")
        setSelectedSquare(null)
        setCapturePath([])
      }
    },
    [attemptsUsed, onSolved, solutionMoves, state],
  )

  const handleReset = useCallback(() => {
    setState(initialStateRef.current)
    setSelectedSquare(null)
    setPhase("playing")
    setCapturePath([])
    setAttemptsUsed(0)
    startedAtRef.current = performance.now()
  }, [])

  const handleSquarePress = useCallback(
    (index: number) => {
      if (phase !== "playing" || isSubmitting) return

      if (isStepByStepCaptureActive && interactiveDestinationSquares.has(index)) {
        const nextPath = [...activeCapturePath, index]
        const resolvedMove = findMoveMatchingPath(selectedMoves, nextPath)

        if (resolvedMove) {
          void handleMove(resolvedMove)
          return
        }

        setCapturePath(nextPath)
        return
      }

      const destinationMoves = selectedMoves.filter((m) => m.to === index)
      if (destinationMoves.length >= 1) {
        void handleMove(destinationMoves[0]!)
        return
      }

      if (selectableSquares.has(index)) {
        const nextSelectedSquare = selectedSquare === index ? null : index
        setSelectedSquare(nextSelectedSquare)
        setCapturePath(
          gameplayPreferences.captureInputMode === "step_by_step" && nextSelectedSquare !== null
            ? [nextSelectedSquare]
            : [],
        )
        return
      }

      setSelectedSquare(null)
      setCapturePath([])
    },
    [
      activeCapturePath,
      gameplayPreferences.captureInputMode,
      handleMove,
      interactiveDestinationSquares,
      isStepByStepCaptureActive,
      isSubmitting,
      phase,
      selectedMoves,
      selectedSquare,
      selectableSquares,
    ],
  )

  return (
    <div className="space-y-4">
      <Board
        state={state}
        selectedSquare={selectedSquare}
        selectableSquares={phase === "playing" ? boardSelectableSquares : EMPTY_SQUARE_SET}
        destinationSquares={phase === "playing" ? boardDestinationSquares : EMPTY_SQUARE_SET}
        pathPreviewSquares={capturePathPreviewSquares}
        boardTheme={gameplayPreferences.boardTheme}
        disabled={phase !== "playing" || isSubmitting}
        onSquarePress={handleSquarePress}
      />

      {isStepByStepCaptureActive && activeCapturePath.length > 1 ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Пошаговое взятие</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Текущая траектория: {capturePathLabel}</p>
            <Button size="sm" variant="outline" onClick={() => setCapturePath([selectedSquare!])}>
              Сбросить траекторию
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {isSubmitting ? (
        <p className="text-center text-sm text-muted-foreground">
          Сохраняем решение и проверяем лимит…
        </p>
      ) : null}

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
            <p className="text-sm text-muted-foreground">{explanation}</p>
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
