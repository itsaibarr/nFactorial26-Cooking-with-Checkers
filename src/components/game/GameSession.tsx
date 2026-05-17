"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { z } from "zod"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Board } from "@/components/board/Board"
import { GameControls } from "@/components/game/GameControls"
import { GameResultModal } from "@/components/game/GameResultModal"
import { MoveList } from "@/components/game/MoveList"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getBestMove, getLegalMoves } from "@/lib/engine/engine"
import type { DifficultyLevel, GameState, Move, PieceColor } from "@/lib/engine/types"
import { getPlayerGameResult, type RecordedMove } from "@/lib/game/session"
import { useGameSessionStore } from "@/lib/game/store"
import { sharpnessBreakdownSchema, type SharpnessBreakdown } from "@/lib/sharpness/compute"
import type { EngineWorkerRequest, EngineWorkerResponse } from "@/workers/engine.worker"

interface PersistedGameSnapshot {
  readonly result: "win" | "loss" | "draw" | "aborted" | null
  readonly endReason: string | null
  readonly endedAt: string | null
  readonly sharpnessScore: number | null
  readonly sharpnessBreakdown: SharpnessBreakdown | null
}

const persistedGameSnapshotSchema = z.object({
  result: z.enum(["win", "loss", "draw", "aborted"]).nullable(),
  endReason: z.string().nullable(),
  endedAt: z.string().nullable(),
  sharpnessScore: z.number().int().min(0).max(100).nullable(),
  sharpnessBreakdown: sharpnessBreakdownSchema.nullable(),
})

interface GameSessionProps {
  readonly gameId: string
  readonly startedAt: string
  readonly playerColor: PieceColor
  readonly opponentLevel: DifficultyLevel
  readonly initialState: GameState
  readonly initialMoves: readonly RecordedMove[]
  readonly persistedGame: PersistedGameSnapshot
}

type PendingWorkerRequest = {
  readonly resolve: (move: Move) => void
  readonly reject: (error: Error) => void
}

export function GameSession({
  gameId,
  startedAt,
  playerColor,
  opponentLevel,
  initialState,
  initialMoves,
  persistedGame,
}: GameSessionProps) {
  const hydrated = useGameSessionStore((store) => store.hydrated)
  const state = useGameSessionStore((store) => store.state)
  const recordedMoves = useGameSessionStore((store) => store.recordedMoves)
  const selectedSquare = useGameSessionStore((store) => store.selectedSquare)
  const ambiguousMoves = useGameSessionStore((store) => store.ambiguousMoves)
  const persistedComplete = useGameSessionStore((store) => store.persistedComplete)
  const initializeSession = useGameSessionStore((store) => store.initializeSession)
  const selectSquare = useGameSessionStore((store) => store.selectSquare)
  const setAmbiguousMoves = useGameSessionStore((store) => store.setAmbiguousMoves)
  const clearMoveChoiceState = useGameSessionStore((store) => store.clearMoveChoiceState)
  const applyRecordedMove = useGameSessionStore((store) => store.applyRecordedMove)

  const [botStatus, setBotStatus] = useState<"idle" | "thinking" | "error">("idle")
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">(
    persistedGame.endedAt ? "saved" : "idle",
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [resultDialogDismissed, setResultDialogDismissed] = useState(false)
  const [savedGame, setSavedGame] = useState<PersistedGameSnapshot>(persistedGame)

  const workerRef = useRef<Worker | null>(null)
  const pendingRequestsRef = useRef<Map<string, PendingWorkerRequest>>(new Map())
  const playerTurnStartedAtRef = useRef<number | null>(null)
  const saveAttemptedRef = useRef(persistedGame.endedAt !== null)

  useEffect(() => {
    initializeSession({
      gameId,
      state: initialState,
      playerColor,
      opponentLevel,
      startedAt,
      recordedMoves: initialMoves,
      persistedComplete: persistedGame.endedAt !== null,
    })
    saveAttemptedRef.current = persistedGame.endedAt !== null
    playerTurnStartedAtRef.current = null
  }, [
    gameId,
    initialMoves,
    initialState,
    initializeSession,
    opponentLevel,
    persistedGame,
    playerColor,
    startedAt,
  ])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const pendingRequests = pendingRequestsRef.current
    const worker = new Worker(new URL("../../workers/engine.worker.ts", import.meta.url), {
      type: "module",
    })

    worker.onmessage = (event: MessageEvent<EngineWorkerResponse>) => {
      const pending = pendingRequests.get(event.data.id)
      if (!pending) {
        return
      }

      pendingRequests.delete(event.data.id)

      if (event.data.error || !event.data.move) {
        pending.reject(new Error(event.data.error ?? "Bot move failed"))
        return
      }

      pending.resolve(event.data.move)
    }

    worker.onerror = () => {
      for (const pending of pendingRequests.values()) {
        pending.reject(new Error("Engine worker crashed"))
      }

      pendingRequests.clear()
    }

    workerRef.current = worker

    return () => {
      worker.terminate()
      workerRef.current = null
      pendingRequests.clear()
    }
  }, [])

  const legalMoves = useMemo(() => getLegalMoves(state), [state])
  const isFinished = state.status !== "playing"
  const resultDialogOpen = isFinished && !resultDialogDismissed
  const isPlayerTurn = !isFinished && state.sideToMove === playerColor
  const playerMoves = useMemo(
    () => (isPlayerTurn ? legalMoves : []),
    [isPlayerTurn, legalMoves],
  )
  const selectedMoves = useMemo(
    () => (selectedSquare === null ? [] : playerMoves.filter((move) => move.from === selectedSquare)),
    [playerMoves, selectedSquare],
  )
  const selectableSquares = useMemo(
    () => new Set(playerMoves.map((move) => move.from)),
    [playerMoves],
  )
  const destinationSquares = useMemo(
    () => new Set(selectedMoves.map((move) => move.to)),
    [selectedMoves],
  )

  useEffect(() => {
    if (isPlayerTurn) {
      playerTurnStartedAtRef.current = performance.now()
      return
    }

    playerTurnStartedAtRef.current = null
  }, [isPlayerTurn, state.moveHistory.length])

  const requestWorkerMove = useCallback(
    (currentState: GameState, level: Exclude<DifficultyLevel, "easy">) =>
      new Promise<Move>((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error("Engine worker is unavailable"))
          return
        }

        const id = crypto.randomUUID()
        pendingRequestsRef.current.set(id, {resolve, reject})

        const payload: EngineWorkerRequest = {
          id,
          state: currentState,
          level,
        }

        workerRef.current.postMessage(payload)
      }),
    [],
  )

  const commitMove = useCallback(
    (move: Move, durationMs: number | null) => {
      applyRecordedMove(move, durationMs)
      setErrorMessage(null)
    },
    [applyRecordedMove],
  )

  const handlePlayerMove = useCallback(
    (move: Move) => {
      const startedAtMs = playerTurnStartedAtRef.current
      const durationMs =
        startedAtMs === null ? null : Math.max(0, Math.round(performance.now() - startedAtMs))

      commitMove(move, durationMs)
    },
    [commitMove],
  )

  const saveCompletedGame = useCallback(async () => {
    saveAttemptedRef.current = true
    setSaveStatus("saving")
    setErrorMessage(null)

    try {
      const response = await fetch("/api/games/save", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          gameId,
          moves: recordedMoves.map((move) => ({
            notation: move.notation,
            durationMs: move.durationMs,
          })),
        }),
      })

      const payload = (await response.json()) as PersistedGameSnapshot | {error?: string}
      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Failed to save game")
      }

      const parsedPayload = persistedGameSnapshotSchema.parse(payload)
      setSavedGame(parsedPayload)
      setSaveStatus("saved")
    } catch (error) {
      saveAttemptedRef.current = false
      setSaveStatus("error")
      setErrorMessage(error instanceof Error ? error.message : "Не удалось сохранить партию")
    }
  }, [gameId, recordedMoves])

  useEffect(() => {
    if (!hydrated || isFinished || !workerRef.current) {
      return
    }

    if (state.sideToMove === playerColor || botStatus !== "idle") {
      return
    }

    let cancelled = false

    async function playBotMove() {
      setBotStatus("thinking")
      setErrorMessage(null)

      try {
        const move =
          opponentLevel === "easy"
            ? getBestMove(state, "easy")
            : await requestWorkerMove(state, opponentLevel)

        if (cancelled) {
          return
        }

        commitMove(move, null)
        setBotStatus("idle")
      } catch (error) {
        if (cancelled) {
          return
        }

        setBotStatus("error")
        setErrorMessage(error instanceof Error ? error.message : "Бот не смог сделать ход")
      }
    }

    void playBotMove()

    return () => {
      cancelled = true
    }
  }, [botStatus, commitMove, hydrated, isFinished, opponentLevel, playerColor, requestWorkerMove, state])

  useEffect(() => {
    if (!hydrated || !isFinished || persistedComplete || saveAttemptedRef.current) {
      return
    }

    void saveCompletedGame()
  }, [hydrated, isFinished, persistedComplete, saveCompletedGame])

  const playerResult =
    state.status === "playing" ? null : getPlayerGameResult(state, playerColor)

  const handleSquarePress = (index: number) => {
    if (!isPlayerTurn || botStatus === "thinking" || saveStatus === "saving") {
      return
    }

    const destinationMoves = selectedMoves.filter((move) => move.to === index)
    if (destinationMoves.length === 1) {
      handlePlayerMove(destinationMoves[0]!)
      return
    }

    if (destinationMoves.length > 1) {
      setAmbiguousMoves(destinationMoves)
      return
    }

    if (selectableSquares.has(index)) {
      setErrorMessage(null)
      setAmbiguousMoves([])
      selectSquare(selectedSquare === index ? null : index)
      return
    }

    clearMoveChoiceState()
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="space-y-4">
          <GameControls
            playerColor={playerColor}
            opponentLevel={opponentLevel}
            isPlayerTurn={isPlayerTurn}
            isFinished={isFinished}
            botStatus={botStatus}
            saveStatus={saveStatus}
          />

          {errorMessage ? (
            <Alert variant="destructive">
              <AlertTitle>Проблема во время партии</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <Board
            state={state}
            selectedSquare={selectedSquare}
            selectableSquares={selectableSquares}
            destinationSquares={destinationSquares}
            disabled={!isPlayerTurn || botStatus === "thinking"}
            onSquarePress={handleSquarePress}
          />

          {ambiguousMoves.length > 0 ? (
            <Card size="sm">
              <CardHeader>
                <CardTitle>Выберите траекторию взятия</CardTitle>
                <CardDescription>
                  Для этой клетки есть несколько легальных продолжений.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {ambiguousMoves.map((move) => (
                  <Button
                    key={move.notation}
                    variant="outline"
                    className="h-auto px-3 py-2 text-sm"
                    onClick={() => handlePlayerMove(move)}
                  >
                    {move.notation}
                  </Button>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </section>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Статус партии</CardTitle>
              <CardDescription>
                {playerResult
                  ? `Результат: ${playerResult === "win" ? "победа" : playerResult === "loss" ? "поражение" : "ничья"}`
                  : "Следите за очередью хода и списком ходов."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ходов сыграно</span>
                <span className="font-medium">{recordedMoves.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Сторона игрока</span>
                <span className="font-medium">{playerColor === "white" ? "Белые" : "Чёрные"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Идентификатор</span>
                <span className="font-mono text-xs">{gameId.slice(0, 8)}</span>
              </div>
            </CardContent>
          </Card>

          <MoveList moves={recordedMoves} />
        </aside>
      </div>

      <GameResultModal
        open={resultDialogOpen}
        onOpenChange={(open) => setResultDialogDismissed(!open)}
        playerColor={playerColor}
        state={state}
        saveStatus={saveStatus}
        sharpnessScore={savedGame.sharpnessScore}
        sharpnessBreakdown={savedGame.sharpnessBreakdown}
        endReason={savedGame.endReason}
        onRetrySave={() => {
          if (saveStatus !== "saving") {
            void saveCompletedGame()
          }
        }}
      />
    </>
  )
}
