"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AnalysisCard } from "@/components/coach/AnalysisCard"
import { CoachExplanationBubble } from "@/components/coach/CoachExplanationBubble"
import { SharpnessGauge } from "@/components/common/SharpnessGauge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { CoachAnalysis, CoachLanguage } from "@/lib/coach/types"
import { coachAnalysisSchema } from "@/lib/coach/types"

function getCopy(language: CoachLanguage) {
  if (language === "ru") {
    return {
      title: "AI-разбор партии",
      description: "Тёплый разбор на основе ваших ходов и оценок движка.",
      loading: "Готовим персональный разбор партии...",
      error: "Не удалось получить разбор. Попробуйте ещё раз.",
      rateLimit: "Лимит бесплатных разборов достигнут. Попробуйте позже или откройте Pro в следующей фазе.",
      retry: "Повторить запрос",
      highlightsTitle: "Ключевые моменты",
      highlightsDescription: "Разбор опирается на реальные ходы из этой партии.",
      lessonTitle: "Главный урок",
      encouragementTitle: "Поддержка от тренера",
      backToGame: "Назад к партии",
      playAgain: "Сыграть ещё",
      scoreLabel: "Sharpness Score",
      scoreDescription: "Этот показатель должен совпадать с сохранённой партией.",
      verdicts: {
        excellent: "Отличная партия",
        good: "Хорошая партия",
        developing: "Есть что закрепить",
        tough_game: "Трудная партия, но полезный опыт",
      },
    }
  }

  return {
    title: "AI game review",
    description: "A warm recap built from your real moves and engine signals.",
    loading: "Preparing your personal game review...",
    error: "The review could not be loaded. Please try again.",
    rateLimit: "You have reached the free analysis limit for now. Try again later or unlock Pro in a later phase.",
    retry: "Try again",
    highlightsTitle: "Key moments",
    highlightsDescription: "These notes refer to real moves from this game.",
    lessonTitle: "Main lesson",
    encouragementTitle: "Coach encouragement",
    backToGame: "Back to game",
    playAgain: "Play again",
    scoreLabel: "Sharpness Score",
    scoreDescription: "This should match the score saved with the game.",
    verdicts: {
      excellent: "Excellent game",
      good: "Good game",
      developing: "Good progress",
      tough_game: "Tough game, useful lesson",
    },
  }
}

function AnalysisLoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  )
}

export function CoachAnalysisClient({
  gameId,
  language,
  initialAnalysis,
}: {
  gameId: string
  language: CoachLanguage
  initialAnalysis: CoachAnalysis | null
}) {
  const copy = useMemo(() => getCopy(language), [language])
  const [analysis, setAnalysis] = useState(initialAnalysis)
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error" | "rate_limited">(
    initialAnalysis ? "ready" : "idle",
  )

  useEffect(() => {
    if (analysis || status !== "idle") {
      return
    }

    let cancelled = false

    async function loadAnalysis() {
      setStatus("loading")

      try {
        const response = await fetch("/api/coach/analyze", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            gameId,
            language,
          }),
        })

        if (cancelled) {
          return
        }

        if (response.status === 429) {
          setStatus("rate_limited")
          return
        }

        const payload = await response.json()
        if (!response.ok) {
          throw new Error(
            typeof payload?.error === "string" ? payload.error : "Failed to load analysis",
          )
        }

        setAnalysis(coachAnalysisSchema.parse(payload))
        setStatus("ready")
      } catch {
        if (!cancelled) {
          setStatus("error")
        }
      }
    }

    void loadAnalysis()

    return () => {
      cancelled = true
    }
  }, [analysis, gameId, language, status])

  if (status === "loading" || status === "idle") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{copy.loading}</p>
        <AnalysisLoadingState />
      </div>
    )
  }

  if (!analysis || status === "error" || status === "rate_limited") {
    return (
      <AnalysisCard title={copy.title} description={copy.description}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {status === "rate_limited" ? copy.rateLimit : copy.error}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                setAnalysis(null)
                setStatus("idle")
              }}
            >
              {copy.retry}
            </Button>
            <Button asChild variant="outline">
              <Link href={`/play/${gameId}`}>{copy.backToGame}</Link>
            </Button>
          </div>
        </div>
      </AnalysisCard>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <AnalysisCard
          title={copy.verdicts[analysis.overall_quality]}
          description={copy.description}
        >
          <div className="space-y-4">
            <SharpnessGauge
              value={analysis.sharpness_score_for_this_game}
              label={copy.scoreLabel}
            />
            <p className="text-sm text-muted-foreground">{copy.scoreDescription}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href={`/play/${gameId}`}>{copy.backToGame}</Link>
              </Button>
              <Button asChild>
                <Link href="/play">{copy.playAgain}</Link>
              </Button>
            </div>
          </div>
        </AnalysisCard>

        <AnalysisCard title={copy.encouragementTitle}>
          <p className="leading-7">{analysis.encouragement}</p>
        </AnalysisCard>
      </div>

      <AnalysisCard
        title={copy.highlightsTitle}
        description={copy.highlightsDescription}
      >
        <div className="space-y-4">
          {analysis.highlights.map((highlight) => (
            <CoachExplanationBubble
              key={`${highlight.move_number}:${highlight.type}`}
              highlight={highlight}
              language={language}
            />
          ))}
        </div>
      </AnalysisCard>

      <AnalysisCard title={copy.lessonTitle}>
        <p className="leading-7">{analysis.key_lesson}</p>
      </AnalysisCard>
    </div>
  )
}
