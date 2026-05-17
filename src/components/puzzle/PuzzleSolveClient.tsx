"use client"

import { useCallback, useState } from "react"
import { PaywallModal } from "@/components/PaywallModal"
import { PuzzleBoard } from "@/components/puzzle/PuzzleBoard"
import type { GameplayPreferences } from "@/lib/game/preferences"
import type { CreateGameStateOptions, PieceColor } from "@/lib/engine/types"
import type { PaywallTriggerReason, SubscriptionTier } from "@/lib/rate-limit"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type PuzzleSolveResponse = {
  accepted: boolean
}

interface PuzzleSolveClientProps {
  puzzleId: string
  position: CreateGameStateOptions
  sideToMove: PieceColor
  solutionMoves: string[]
  explanation: string
  alreadySolved: boolean
  language: "ru" | "en"
  subscriptionTier: SubscriptionTier
  gameplayPreferences: GameplayPreferences
}

export function PuzzleSolveClient({
  puzzleId,
  position,
  sideToMove,
  solutionMoves,
  explanation,
  alreadySolved,
  language,
  subscriptionTier,
  gameplayPreferences,
}: PuzzleSolveClientProps) {
  const [solved, setSolved] = useState(alreadySolved)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [paywallReason, setPaywallReason] = useState<PaywallTriggerReason>("puzzle_limit")
  const [showPaywall, setShowPaywall] = useState(false)

  const handleSolved = useCallback(
    async (timeTakenSeconds: number, attemptsUsed: number): Promise<PuzzleSolveResponse> => {
      setErrorMessage(null)

      const response = await fetch("/api/puzzles/attempt", {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({
          puzzleId,
          solved: true,
          timeTakenSeconds,
          attemptsUsed,
        }),
      }).catch(() => null)

      if (!response) {
        setErrorMessage("Не удалось сохранить решение задачи.")
        return {accepted: false}
      }

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string
            triggerReason?: PaywallTriggerReason
            showPaywall?: boolean
          }
        | null

      if (response.status === 429) {
        setErrorMessage(
          payload?.error ?? "Бесплатный дневной лимит задач на сегодня исчерпан.",
        )
        setPaywallReason(payload?.triggerReason ?? "puzzle_limit")
        setShowPaywall(Boolean(payload?.showPaywall))
        if (payload?.showPaywall) {
          setPaywallOpen(true)
        }
        return {accepted: false}
      }

      if (!response.ok) {
        setErrorMessage(payload?.error ?? "Не удалось сохранить решение задачи.")
        return {accepted: false}
      }

      setSolved(true)
      setShowPaywall(false)
      return {accepted: true}
    },
    [puzzleId],
  )

  return (
    <div className="space-y-4">
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>Не удалось зачесть решение</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <PuzzleBoard
        puzzleId={puzzleId}
        position={position}
        sideToMove={sideToMove}
        solutionMoves={solutionMoves}
        explanation={explanation}
        alreadySolved={solved}
        gameplayPreferences={gameplayPreferences}
        onSolved={handleSolved}
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
    </div>
  )
}
