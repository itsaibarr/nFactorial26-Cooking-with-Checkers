"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { z } from "zod"
import { PaywallModal } from "@/components/PaywallModal"
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
import { indexToSquare } from "@/lib/engine/board"
import { getLegalMoves } from "@/lib/engine/engine"
import type { DifficultyLevel, GameState, Move, PieceColor } from "@/lib/engine/types"
import { resolveBotMove } from "@/lib/game/bot"
import {
  findMoveMatchingPath,
  getCapturePathNextSquares,
} from "@/lib/game/capture-selection"
import type { GameplayPreferences } from "@/lib/game/preferences"
import {
  buildPreparedMoveAnimation,
  getMoveAnimationDuration,
  type ActiveMoveAnimation,
} from "@/lib/game/move-animation"
import { resolveRecommendedMove } from "@/lib/game/recommendation"
import { getPlayerGameResult, type RecordedMove } from "@/lib/game/session"
import { useGameSessionStore } from "@/lib/game/store"
import type { PaywallTriggerReason, SubscriptionTier } from "@/lib/rate-limit"
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
const rateLimitedSaveResponseSchema = z.object({
  error: z.string().optional(),
  triggerReason: z
    .enum(["analysis_limit", "game_limit", "puzzle_limit", "manual"])
    .optional(),
  showPaywall: z.boolean().optional(),
})
const saveErrorResponseSchema = z.object({
  error: z.string(),
})

interface GameSessionProps {
  readonly gameId: string
  readonly startedAt: string
  readonly playerColor: PieceColor
  readonly opponentLevel: DifficultyLevel
  readonly language: "ru" | "en"
  readonly subscriptionTier: SubscriptionTier
  readonly gameplayPreferences: GameplayPreferences
  readonly initialState: GameState
  readonly initialMoves: readonly RecordedMove[]
  readonly persistedGame: PersistedGameSnapshot
}

type PendingWorkerRequest = {
  readonly resolve: (move: Move) => void
  readonly reject: (error: Error) => void
  readonly timeoutId: number
}

type SessionResult = "win" | "loss" | "draw" | "aborted"
const EMPTY_SQUARE_SET = new Set<number>()
const ANIMATION_CLEANUP_BUFFER_MS = 80

function getSessionResultLabel(result: SessionResult) {
  if (result === "win") {
    return "победа"
  }

  if (result === "loss") {
    return "поражение"
  }

  if (result === "aborted") {
    return "прервана"
  }

  return "ничья"
}

export function GameSession({
  gameId,
  startedAt,
  playerColor,
  opponentLevel,
  language,
  subscriptionTier,
  gameplayPreferences,
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
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error" | "rate_limited"
  >(persistedGame.endedAt ? "saved" : "idle")
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [paywallReason, setPaywallReason] = useState<PaywallTriggerReason>("game_limit")
  const [showPaywall, setShowPaywall] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [resultDialogDismissed, setResultDialogDismissed] = useState(false)
  const [savedGame, setSavedGame] = useState<PersistedGameSnapshot>(persistedGame)
  const [moveAnimation, setMoveAnimation] = useState<ActiveMoveAnimation | null>(null)
  const [recommendedMove, setRecommendedMove] = useState<{
    readonly positionKey: string
    readonly move: Move
  } | null>(null)
  const [capturePath, setCapturePath] = useState<readonly number[]>([])
  const [lastMove, setLastMove] = useState<{readonly from: number; readonly to: number} | null>(
    null,
  )
  const [forcedResult, setForcedResult] = useState<{
    readonly result: SessionResult
    readonly endReason: string
  } | null>(null)

  const workerRef = useRef<Worker | null>(null)
  const pendingRequestsRef = useRef<Map<string, PendingWorkerRequest>>(new Map())
  const playerTurnStartedAtRef = useRef<number | null>(null)
  const saveAttemptedRef = useRef(persistedGame.endedAt !== null)
  const botRunningRef = useRef(false)
  const animationTimeoutRef = useRef<number | null>(null)
  const animationStartFrameRef = useRef<number | null>(null)
  const animationRunFrameRef = useRef<number | null>(null)

  const clearMoveAnimationTimers = useCallback(() => {
    if (animationTimeoutRef.current !== null) {
      window.clearTimeout(animationTimeoutRef.current)
      animationTimeoutRef.current = null
    }

    if (animationStartFrameRef.current !== null) {
      window.cancelAnimationFrame(animationStartFrameRef.current)
      animationStartFrameRef.current = null
    }

    if (animationRunFrameRef.current !== null) {
      window.cancelAnimationFrame(animationRunFrameRef.current)
      animationRunFrameRef.current = null
    }
  }, [])

  useEffect(() => {
    clearMoveAnimationTimers()
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
    clearMoveAnimationTimers,
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
    return () => {
      clearMoveAnimationTimers()
    }
  }, [clearMoveAnimationTimers])

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
      window.clearTimeout(pending.timeoutId)

      if (event.data.error || !event.data.move) {
        pending.reject(new Error(event.data.error ?? "Bot move failed"))
        return
      }

      pending.resolve(event.data.move)
    }

    worker.onerror = () => {
      for (const pending of pendingRequests.values()) {
        window.clearTimeout(pending.timeoutId)
        pending.reject(new Error("Engine worker crashed"))
      }

      pendingRequests.clear()
    }

    workerRef.current = worker

    return () => {
      worker.terminate()
      workerRef.current = null
      for (const pending of pendingRequests.values()) {
        window.clearTimeout(pending.timeoutId)
      }
      pendingRequests.clear()
    }
  }, [])

  const legalMoves = useMemo(() => getLegalMoves(state), [state])
  const engineResult = state.status === "playing" ? null : getPlayerGameResult(state, playerColor)
  const sessionResult = forcedResult?.result ?? savedGame.result ?? engineResult
  const sessionEndReason =
    forcedResult?.endReason ??
    savedGame.endReason ??
    (state.status === "playing" ? null : state.endReason)
  const isFinished = sessionResult !== null || savedGame.endedAt !== null
  const isAnimatingMove = moveAnimation !== null
  const resultDialogOpen = isFinished && !isAnimatingMove && !resultDialogDismissed
  const isPlayerTurn = !isFinished && state.sideToMove === playerColor
  const shouldShowRecommendedMove =
    hydrated &&
    gameplayPreferences.showRecommendedMoves &&
    isPlayerTurn &&
    !isAnimatingMove &&
    botStatus !== "thinking" &&
    saveStatus !== "saving"
  const playerMoves = useMemo(
    () => (isPlayerTurn ? legalMoves : []),
    [isPlayerTurn, legalMoves],
  )
  const selectedMoves = useMemo(
    () => (selectedSquare === null ? [] : playerMoves.filter((move) => move.from === selectedSquare)),
    [playerMoves, selectedSquare],
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
    () => new Set(playerMoves.map((move) => move.from)),
    [playerMoves],
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
  const hasPlayerMove = useMemo(
    () => recordedMoves.some((move) => move.side === playerColor),
    [playerColor, recordedMoves],
  )
  const lastMoveSquares = useMemo(
    () => (lastMove ? new Set([lastMove.from, lastMove.to]) : EMPTY_SQUARE_SET),
    [lastMove],
  )
  const recommendationPositionKey = useMemo(
    () => `${state.sideToMove}:${state.moveHistory.join("|")}`,
    [state.moveHistory, state.sideToMove],
  )
  const visibleRecommendedMove =
    shouldShowRecommendedMove && recommendedMove?.positionKey === recommendationPositionKey
      ? recommendedMove.move
      : null
  const recommendedSquares = useMemo(
    () => (visibleRecommendedMove ? new Set(visibleRecommendedMove.path) : EMPTY_SQUARE_SET),
    [visibleRecommendedMove],
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
        const timeoutId = window.setTimeout(() => {
          const pending = pendingRequestsRef.current.get(id)
          if (!pending) {
            return
          }

          pendingRequestsRef.current.delete(id)
          pending.reject(new Error("Engine worker timed out"))
        }, 10_000)

        pendingRequestsRef.current.set(id, {resolve, reject, timeoutId})

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
      const preparedAnimation = buildPreparedMoveAnimation(state, move)

      setLastMove({
        from: move.from,
        to: move.to,
      })

      if (preparedAnimation) {
        const animationDuration = getMoveAnimationDuration(move)
        clearMoveAnimationTimers()
        setMoveAnimation({
          ...preparedAnimation,
          durationMs: animationDuration,
          started: false,
        })
        animationStartFrameRef.current = window.requestAnimationFrame(() => {
          animationRunFrameRef.current = window.requestAnimationFrame(() => {
            setMoveAnimation((current) =>
              current
                ? {
                    ...current,
                    started: true,
                  }
                : null,
            )
          })
        })
        animationTimeoutRef.current = window.setTimeout(() => {
          animationTimeoutRef.current = null
          setMoveAnimation(null)
        }, animationDuration + ANIMATION_CLEANUP_BUFFER_MS)
      } else {
        setMoveAnimation(null)
      }

      applyRecordedMove(move, durationMs)
      setCapturePath([])
      setErrorMessage(null)
    },
    [applyRecordedMove, clearMoveAnimationTimers, state],
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
    setSaveErrorMessage(null)
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
          termination: forcedResult?.endReason === "resignation" ? "resignation" : undefined,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (response.status === 429) {
        const parsedRateLimitPayload = rateLimitedSaveResponseSchema.safeParse(payload)
        const rateLimitPayload = parsedRateLimitPayload.success ? parsedRateLimitPayload.data : null

        saveAttemptedRef.current = false
        setSaveStatus("rate_limited")
        setSaveErrorMessage(
          rateLimitPayload?.error ?? "Лимит партий для текущего периода исчерпан.",
        )
        setPaywallReason(rateLimitPayload?.triggerReason ?? "game_limit")
        setShowPaywall(rateLimitPayload?.showPaywall ?? false)
        if (rateLimitPayload?.showPaywall) {
          setPaywallOpen(true)
        }
        return
      }

      if (!response.ok) {
        const parsedErrorPayload = saveErrorResponseSchema.safeParse(payload)
        throw new Error(parsedErrorPayload.success ? parsedErrorPayload.data.error : "Failed to save game")
      }

      const parsedPayload = persistedGameSnapshotSchema.parse(payload)
      setSavedGame(parsedPayload)
      setForcedResult(null)
      setSaveStatus("saved")
      setShowPaywall(false)
    } catch (error) {
      saveAttemptedRef.current = false
      setSaveStatus("error")
      setSaveErrorMessage(error instanceof Error ? error.message : "Не удалось сохранить партию")
      setErrorMessage(error instanceof Error ? error.message : "Не удалось сохранить партию")
    }
  }, [forcedResult, gameId, recordedMoves])

  useEffect(() => {
    if (!shouldShowRecommendedMove) {
      return
    }

    let cancelled = false

    async function loadRecommendation() {
      try {
        const move = await resolveRecommendedMove({
          state,
          requestWorkerMove,
        })

        if (!cancelled) {
          setRecommendedMove({
            positionKey: recommendationPositionKey,
            move,
          })
        }
      } catch {}
    }

    void loadRecommendation()

    return () => {
      cancelled = true
    }
  }, [
    botStatus,
    gameplayPreferences.showRecommendedMoves,
    hydrated,
    isAnimatingMove,
    isPlayerTurn,
    requestWorkerMove,
    recommendationPositionKey,
    saveStatus,
    shouldShowRecommendedMove,
    state,
  ])

  useEffect(() => {
    if (!hydrated || isFinished || isAnimatingMove) {
      return
    }

    if (state.sideToMove === playerColor || botRunningRef.current) {
      return
    }

    if (opponentLevel !== "easy" && !workerRef.current) {
      return
    }

    let cancelled = false
    botRunningRef.current = true

    async function playBotMove() {
      setBotStatus("thinking")
      setErrorMessage(null)

      try {
        const move = await resolveBotMove({
          state,
          opponentLevel,
          requestWorkerMove,
        })

        if (cancelled) {
          return
        }

        commitMove(move, null)
        botRunningRef.current = false
        setBotStatus("idle")
      } catch (error) {
        if (cancelled) {
          return
        }

        botRunningRef.current = false
        setBotStatus("error")
        setErrorMessage(error instanceof Error ? error.message : "Бот не смог сделать ход")
      }
    }

    void playBotMove()

    return () => {
      cancelled = true
      botRunningRef.current = false
    }
  }, [commitMove, hydrated, isAnimatingMove, isFinished, opponentLevel, playerColor, requestWorkerMove, state])

  useEffect(() => {
    if (!hydrated || !isFinished || persistedComplete || saveAttemptedRef.current || isAnimatingMove) {
      return
    }

    void saveCompletedGame()
  }, [hydrated, isAnimatingMove, isFinished, persistedComplete, saveCompletedGame])

  const handleResign = useCallback(() => {
    if (
      !hasPlayerMove ||
      !isPlayerTurn ||
      isAnimatingMove ||
      botStatus === "thinking" ||
      saveStatus === "saving"
    ) {
      return
    }

    setErrorMessage(null)
    setForcedResult({
      result: "loss",
      endReason: "resignation",
    })
  }, [botStatus, hasPlayerMove, isAnimatingMove, isPlayerTurn, saveStatus])

  const handleSquarePress = useCallback(
    (index: number) => {
      if (!isPlayerTurn || isAnimatingMove || botStatus === "thinking" || saveStatus === "saving") {
        return
      }

      if (isStepByStepCaptureActive && interactiveDestinationSquares.has(index)) {
        const nextPath = [...activeCapturePath, index]
        const resolvedMove = findMoveMatchingPath(selectedMoves, nextPath)

        if (resolvedMove) {
          handlePlayerMove(resolvedMove)
          setCapturePath([])
          return
        }

        setErrorMessage(null)
        setAmbiguousMoves([])
        setCapturePath(nextPath)
        return
      }

      const destinationMoves = selectedMoves.filter((move) => move.to === index)
      if (destinationMoves.length === 1) {
        handlePlayerMove(destinationMoves[0]!)
        setCapturePath([])
        return
      }

      if (destinationMoves.length > 1) {
        setAmbiguousMoves(destinationMoves)
        setCapturePath([])
        return
      }

      if (selectableSquares.has(index)) {
        setErrorMessage(null)
        setAmbiguousMoves([])
        const nextSelectedSquare = selectedSquare === index ? null : index
        selectSquare(nextSelectedSquare)
        setCapturePath(
          gameplayPreferences.captureInputMode === "step_by_step" && nextSelectedSquare !== null
            ? [nextSelectedSquare]
            : [],
        )
        return
      }

      clearMoveChoiceState()
      setCapturePath([])
    },
    [
      activeCapturePath,
      botStatus,
      clearMoveChoiceState,
      gameplayPreferences.captureInputMode,
      handlePlayerMove,
      interactiveDestinationSquares,
      isAnimatingMove,
      isPlayerTurn,
      isStepByStepCaptureActive,
      saveStatus,
      selectableSquares,
      selectSquare,
      selectedMoves,
      selectedSquare,
      setAmbiguousMoves,
    ],
  )

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
            canResign={
              hasPlayerMove &&
              isPlayerTurn &&
              !isAnimatingMove &&
              botStatus !== "thinking" &&
              saveStatus !== "saving"
            }
            onResign={handleResign}
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
            selectableSquares={boardSelectableSquares}
            destinationSquares={boardDestinationSquares}
            lastMoveSquares={lastMoveSquares}
            recommendedSquares={recommendedSquares}
            pathPreviewSquares={capturePathPreviewSquares}
            moveAnimation={moveAnimation}
            boardTheme={gameplayPreferences.boardTheme}
            disabled={!isPlayerTurn || isAnimatingMove || botStatus === "thinking"}
            onSquarePress={handleSquarePress}
          />

          {isStepByStepCaptureActive && activeCapturePath.length > 1 ? (
            <Card size="sm">
              <CardHeader>
                <CardTitle>Пошаговое взятие</CardTitle>
                <CardDescription>
                  Текущая траектория: {capturePathLabel}. Выберите следующее продолжение на доске.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="h-auto px-3 py-2 text-sm"
                  onClick={() => setCapturePath([selectedSquare!])}
                >
                  Сбросить траекторию
                </Button>
              </CardContent>
            </Card>
          ) : null}

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
                {sessionResult
                  ? `Результат: ${getSessionResultLabel(sessionResult)}`
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
        gameId={gameId}
        open={resultDialogOpen}
        onOpenChange={(open) => setResultDialogDismissed(!open)}
        playerColor={playerColor}
        result={sessionResult}
        saveStatus={saveStatus}
        sharpnessScore={savedGame.sharpnessScore}
        sharpnessBreakdown={savedGame.sharpnessBreakdown}
        endReason={sessionEndReason}
        saveErrorMessage={saveErrorMessage}
        showPaywall={showPaywall}
        onOpenPaywall={() => setPaywallOpen(true)}
        onRetrySave={() => {
          if (saveStatus !== "saving") {
            void saveCompletedGame()
          }
        }}
      />
      {showPaywall ? (
        <PaywallModal
          open={paywallOpen}
          onOpenChange={setPaywallOpen}
          language={language}
          triggerReason={paywallReason}
          currentTier={subscriptionTier}
        />
      ) : null}
    </>
  )
}
