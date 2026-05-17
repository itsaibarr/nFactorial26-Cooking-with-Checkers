import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

function getColorLabel(color: "white" | "black") {
  return color === "white" ? "Белые" : "Чёрные"
}

function getLevelLabel(level: "easy" | "medium" | "hard") {
  if (level === "easy") {
    return "Лёгкий"
  }

  if (level === "medium") {
    return "Средний"
  }

  return "Сильный"
}

function getTurnLabel({
  isFinished,
  isPlayerTurn,
  isBotThinking,
}: {
  isFinished: boolean
  isPlayerTurn: boolean
  isBotThinking: boolean
}) {
  if (isFinished) {
    return "Партия завершена"
  }

  if (isBotThinking) {
    return "Бот думает…"
  }

  return isPlayerTurn ? "Ваш ход" : "Ход бота"
}

export function GameControls({
  playerColor,
  opponentLevel,
  isPlayerTurn,
  isFinished,
  botStatus,
  saveStatus,
  canResign,
  onResign,
}: {
  playerColor: "white" | "black"
  opponentLevel: "easy" | "medium" | "hard"
  isPlayerTurn: boolean
  isFinished: boolean
  botStatus: "idle" | "thinking" | "error"
  saveStatus: "idle" | "saving" | "saved" | "error" | "rate_limited"
  canResign: boolean
  onResign: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">Вы: {getColorLabel(playerColor)}</Badge>
        <Badge variant="outline">Бот: {getLevelLabel(opponentLevel)}</Badge>
        <Badge variant={isPlayerTurn ? "default" : "secondary"}>
          {getTurnLabel({
            isFinished,
            isPlayerTurn,
            isBotThinking: botStatus === "thinking",
          })}
        </Badge>
        {saveStatus === "saving" ? <Badge variant="secondary">Сохраняем…</Badge> : null}
        {saveStatus === "saved" ? <Badge variant="outline">Сохранено</Badge> : null}
        {saveStatus === "rate_limited" ? <Badge variant="destructive">Лимит</Badge> : null}
      </div>

      <div className="flex gap-2">
        <Button variant="destructive" onClick={onResign} disabled={!canResign}>
          Сдаться
        </Button>
        <Button asChild variant="outline">
          <Link href="/play">Новая партия</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/dashboard">К дашборду</Link>
        </Button>
      </div>
    </div>
  )
}
