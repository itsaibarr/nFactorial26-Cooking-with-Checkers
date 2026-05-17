"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { PieceColor } from "@/lib/engine/types"
import type { PlayerGameResult } from "@/lib/game/session"
import type { SharpnessBreakdown } from "@/lib/sharpness/compute"

type GameResult = PlayerGameResult | "aborted"

function getHeadline(result: GameResult) {
  if (result === "win") {
    return "Победа"
  }

  if (result === "loss") {
    return "Поражение"
  }

  if (result === "aborted") {
    return "Партия прервана"
  }

  return "Ничья"
}

function getDescription(result: GameResult, playerColor: PieceColor) {
  if (result === "win") {
    return playerColor === "white"
      ? "Вы довели партию белыми до победы."
      : "Вы выдержали старт белых и выиграли чёрными."
  }

  if (result === "loss") {
    return "Партия завершилась не в вашу пользу."
  }

  if (result === "aborted") {
    return "Вы завершили партию до конца."
  }

  return "Партия закончилась вничью."
}

function getReasonLabel(endReason: string | null) {
  if (!endReason) {
    return "Без дополнительной причины"
  }

  if (endReason === "no-moves") {
    return "У соперника не осталось ходов"
  }

  if (endReason === "no-pieces") {
    return "У соперника не осталось шашек"
  }

  if (endReason === "threefold-repetition") {
    return "Троекратное повторение"
  }

  if (endReason === "25-king-moves") {
    return "25 ходов королями без взятия"
  }

  if (endReason === "three-kings-versus-one-king") {
    return "3 дамки против 1 дамки"
  }

  if (endReason === "resignation") {
    return "Сдача"
  }

  return endReason
}

export function GameResultModal({
  gameId,
  open,
  onOpenChange,
  playerColor,
  result,
  saveStatus,
  sharpnessScore,
  sharpnessBreakdown,
  endReason,
  saveErrorMessage,
  showPaywall,
  onOpenPaywall,
  onRetrySave,
}: {
  gameId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  playerColor: PieceColor
  result: GameResult | null
  saveStatus: "idle" | "saving" | "saved" | "error" | "rate_limited"
  sharpnessScore: number | null
  sharpnessBreakdown: SharpnessBreakdown | null
  endReason: string | null
  saveErrorMessage: string | null
  showPaywall: boolean
  onOpenPaywall: () => void
  onRetrySave: () => void
}) {
  if (!result) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getHeadline(result)}</DialogTitle>
          <DialogDescription>{getDescription(result, playerColor)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-xl border bg-muted/40 p-3">
            <p className="text-sm text-muted-foreground">Причина завершения</p>
            <p className="font-medium">{getReasonLabel(endReason)}</p>
          </div>

          <div className="rounded-xl border bg-muted/40 p-3">
            <p className="text-sm text-muted-foreground">Sharpness Score</p>
            <p className="text-2xl font-semibold">
              {sharpnessScore === null ? "—" : `${sharpnessScore}/100`}
            </p>
            {sharpnessBreakdown ? (
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div>
                  <p>Точность</p>
                  <p className="font-medium text-foreground">{sharpnessBreakdown.accuracy}</p>
                </div>
                <div>
                  <p>Темп</p>
                  <p className="font-medium text-foreground">{sharpnessBreakdown.speed}</p>
                </div>
                <div>
                  <p>Без зевков</p>
                  <p className="font-medium text-foreground">{sharpnessBreakdown.blunderRate}</p>
                </div>
              </div>
            ) : null}
          </div>

          {saveStatus === "saving" ? (
            <p className="text-sm text-muted-foreground">Сохраняем партию и метрики…</p>
          ) : null}
          {saveStatus === "error" ? (
            <p className="text-sm text-destructive">
              {saveErrorMessage ?? "Не удалось сохранить партию. Нажмите «Повторить сохранение»."}
            </p>
          ) : null}
          {saveStatus === "rate_limited" ? (
            <p className="text-sm text-destructive">
              {saveErrorMessage ?? "Лимит партий для текущего периода исчерпан."}
            </p>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:flex-wrap sm:justify-start">
          {saveStatus === "saved" ? (
            <Button asChild>
              <Link href={`/analysis/${gameId}`}>Получить AI-разбор</Link>
            </Button>
          ) : (
            <Button disabled>Получить AI-разбор</Button>
          )}
          {saveStatus === "error" ? (
            <Button onClick={onRetrySave}>Повторить сохранение</Button>
          ) : null}
          {saveStatus === "rate_limited" && showPaywall ? (
            <Button onClick={onOpenPaywall}>Открыть Pro</Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/play">Сыграть ещё</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/dashboard">Дашборд</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
