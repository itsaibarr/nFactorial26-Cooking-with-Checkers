"use client"

import { Badge } from "@/components/ui/badge"
import type { CoachHighlight, CoachLanguage } from "@/lib/coach/types"

function getHighlightLabel(type: CoachHighlight["type"], language: CoachLanguage) {
  if (language === "ru") {
    if (type === "best_move") {
      return "Сильный ход"
    }

    if (type === "good_idea") {
      return "Хорошая идея"
    }

    if (type === "missed_tactic") {
      return "Упущенный шанс"
    }

    return "Зевок"
  }

  if (type === "best_move") {
    return "Best move"
  }

  if (type === "good_idea") {
    return "Good idea"
  }

  if (type === "missed_tactic") {
    return "Missed tactic"
  }

  return "Blunder"
}

function getBadgeVariant(type: CoachHighlight["type"]) {
  if (type === "best_move") {
    return "default"
  }

  if (type === "good_idea") {
    return "secondary"
  }

  if (type === "missed_tactic") {
    return "outline"
  }

  return "destructive"
}

export function CoachExplanationBubble({
  highlight,
  language,
}: {
  highlight: CoachHighlight
  language: CoachLanguage
}) {
  return (
    <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={getBadgeVariant(highlight.type)}>
          {getHighlightLabel(highlight.type, language)}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {language === "ru" ? `Ход ${highlight.move_number}` : `Move ${highlight.move_number}`}
        </span>
      </div>
      <div className="space-y-2">
        <p className="font-medium">{highlight.what_you_did}</p>
        <p className="text-sm text-muted-foreground">{highlight.what_to_consider}</p>
      </div>
    </div>
  )
}
