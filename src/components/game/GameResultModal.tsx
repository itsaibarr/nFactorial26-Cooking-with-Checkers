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
import type { GameState, PieceColor } from "@/lib/engine/types"
import { getPlayerGameResult, type PlayerGameResult } from "@/lib/game/session"
import type { SharpnessBreakdown } from "@/lib/sharpness/compute"

function getHeadline(result: PlayerGameResult) {
  if (result === "win") {
    return "Победа"
  }

  if (result === "loss") {
    return "Поражение"
  }

  return "Ничья"
}

function getDescription(result: PlayerGameResult, playerColor: PieceColor) {
  if (result === "win") {
    return playerColor === "white"
      ? "Вы довели партию белыми до победы."
      : "Вы выдержали старт белых и выиграли чёрными."
  }

  if (result === "loss") {
    return "Партия завершилась не в вашу пользу."
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

  return endReason
}

export function GameResultModal({
  open,
  onOpenChange,
  playerColor,
  state,
  saveStatus,
  sharpnessScore,
  sharpnessBreakdown,
  endReason,
  onRetrySave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  playerColor: PieceColor
  state: GameState
  saveStatus: "idle" | "saving" | "saved" | "error"
  sharpnessScore: number | null
  sharpnessBreakdown: SharpnessBreakdown | null
  endReason: string | null
  onRetrySave: () => void
}) {
  if (state.status === "playing") {
    return null
  }

  const result = getPlayerGameResult(state, playerColor)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{getHeadline(result)}</DialogTitle>
          <DialogDescription>{getDescription(result, playerColor)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-xl border bg-muted/40 p-3">
            <p className="text-sm text-muted-foreground">Причина завершения</p>
            <p className="font-medium">{getReasonLabel(endReason ?? state.endReason)}</p>
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
              Не удалось сохранить партию. Нажмите «Повторить сохранение».
            </p>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          {saveStatus === "error" ? (
            <Button onClick={onRetrySave}>Повторить сохранение</Button>
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
