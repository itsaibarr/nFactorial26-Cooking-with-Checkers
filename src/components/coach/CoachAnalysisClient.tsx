"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { PaywallModal } from "@/components/PaywallModal"
import { AnalysisCard } from "@/components/coach/AnalysisCard"
import { CoachExplanationBubble } from "@/components/coach/CoachExplanationBubble"
import { SharpnessGauge } from "@/components/common/SharpnessGauge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type {
  CoachAnalysis,
  CoachAnalysisFailureReason,
  CoachLanguage,
} from "@/lib/coach/types"
import {
  coachAnalysisFailureReasonSchema,
  coachAnalysisSchema,
} from "@/lib/coach/types"
import type { PaywallTriggerReason, SubscriptionTier } from "@/lib/rate-limit"

const ANALYSIS_REQUEST_TIMEOUT_MS = 28_000
const PROGRESS_STAGES = [
  { delayMs: 0, progress: 20 },
  { delayMs: 2_500, progress: 45 },
  { delayMs: 6_000, progress: 72 },
  { delayMs: 10_000, progress: 90 },
] as const

const coachAnalysisResponseSchema = coachAnalysisSchema.extend({
  degraded: z.boolean().optional(),
  failureReason: coachAnalysisFailureReasonSchema.nullable().optional(),
})

function getCopy(language: CoachLanguage) {
  if (language === "ru") {
    return {
      title: "AI-разбор партии",
      description: "Тёплый разбор на основе ваших ходов и оценок движка.",
      loading: "Смотрим вашу партию...",
      error: "Разбор не загрузился. Попробуйте ещё раз.",
      timeoutError: "AI-разбор слишком долго не отвечал. Попробуйте ещё раз.",
      rateLimitFree:
        "Бесплатный разбор на сегодня уже использован. Откройте Pro, чтобы продолжить.",
      rateLimitPaid:
        "Почасовой лимит разборов исчерпан. Попробуйте снова в следующем часу.",
      retry: "Повторить",
      retryFull: "Запросить полный разбор",
      unlock: "Открыть Pro",
      highlightsTitle: "Ключевые моменты",
      highlightsDescription: "Разбор основан на реальных ходах из этой партии.",
      lessonTitle: "Главный урок",
      encouragementTitle: "От тренера",
      backToGame: "Назад к партии",
      playAgain: "Сыграть ещё",
      scoreLabel: "Sharpness Score",
      scoreDescription: "Ваш результат за эту партию.",
      verdicts: {
        excellent: "Отличная партия",
        good: "Хорошая партия",
        developing: "Есть что улучшить",
        tough_game: "Трудная партия — полезный опыт",
      },
      progressTitle: "Готовим разбор",
      progressLabels: {
        20: "Перебираем ходы партии",
        45: "Ищем поворотные моменты",
        72: "Пишем советы для вас",
        90: "Сохраняем результат",
      } satisfies Record<number, string>,
      readyToast: "AI-разбор готов",
      degradedToast: "Готов краткий разбор",
      degradedBannerTitle: "Показан краткий разбор по движку",
      degradedBannerDescription:
        "Полный AI-разбор не успел прийти вовремя. Этот вариант основан на ваших реальных ходах и оценках движка. Попробуйте запросить полный разбор позже.",
      degradedReasonLabels: {
        timeout: "Модель слишком долго не отвечала.",
        parse: "Не удалось прочитать ответ модели.",
        auth: "AI-провайдер временно недоступен.",
        unknown: "На сервере произошла ошибка.",
      } satisfies Record<CoachAnalysisFailureReason, string>,
    }
  }

  return {
    title: "Game review",
    description: "What your coach noticed, based on your real moves and engine scores.",
    loading: "Looking at your game...",
    error: "Couldn't load your review. Try again.",
    timeoutError: "The AI took too long. Try again.",
    rateLimitFree:
      "You've used your free analysis for today. Upgrade to Pro to keep going.",
    rateLimitPaid:
      "You've hit the hourly limit. Try again next hour.",
    retry: "Try again",
    retryFull: "Get full review",
    unlock: "Upgrade to Pro",
    highlightsTitle: "Key moments",
    highlightsDescription: "Based on moves from this game.",
    lessonTitle: "Takeaway",
    encouragementTitle: "From your coach",
    backToGame: "Back to game",
    playAgain: "Play again",
    scoreLabel: "Sharpness Score",
    scoreDescription: "Your score for this game.",
    verdicts: {
      excellent: "Excellent",
      good: "Good game",
      developing: "Room to improve",
      tough_game: "Tough one — still worth it",
    },
    progressTitle: "Getting your review",
    progressLabels: {
      20: "Replaying your moves",
      45: "Spotting turning points",
      72: "Writing coaching notes",
      90: "Saving your review",
    } satisfies Record<number, string>,
    readyToast: "Your review is ready",
    degradedToast: "Quick review ready",
    degradedBannerTitle: "Showing a quick engine review",
    degradedBannerDescription:
      "The full AI review didn't come back in time. What you see is based on your actual moves and engine scores. Try again later for a fuller analysis.",
    degradedReasonLabels: {
      timeout: "The model was too slow to respond.",
      parse: "The model's response couldn't be read.",
      auth: "The AI provider is temporarily down.",
      unknown: "Something went wrong on the server.",
    } satisfies Record<CoachAnalysisFailureReason, string>,
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
  subscriptionTier,
  monthlyCheckoutEnabled,
  yearlyCheckoutEnabled,
}: {
  gameId: string
  language: CoachLanguage
  initialAnalysis: CoachAnalysis | null
  subscriptionTier: SubscriptionTier
  monthlyCheckoutEnabled: boolean
  yearlyCheckoutEnabled: boolean
}) {
  const copy = useMemo(() => getCopy(language), [language])
  const progressToastId = useMemo(() => `coach-analysis:${gameId}:${language}`, [gameId, language])
  const [analysis, setAnalysis] = useState(initialAnalysis)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [paywallReason, setPaywallReason] = useState<PaywallTriggerReason>("analysis_limit")
  const [showPaywall, setShowPaywall] = useState(false)
  const [degraded, setDegraded] = useState(false)
  const [failureReason, setFailureReason] = useState<CoachAnalysisFailureReason | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error" | "rate_limited">(
    initialAnalysis ? "ready" : "idle",
  )

  useEffect(() => {
    if (initialAnalysis !== null && requestVersion === 0) {
      return
    }

    let cancelled = false
    let finished = false
    const controller = new AbortController()
    const requestTimeoutId = window.setTimeout(() => controller.abort(), ANALYSIS_REQUEST_TIMEOUT_MS)
    const stageTimeoutIds = PROGRESS_STAGES.map((stage) =>
      window.setTimeout(() => {
        if (cancelled || finished) {
          return
        }

        toast.loading(`${copy.progressTitle}: ${stage.progress}%`, {
          id: progressToastId,
          description: copy.progressLabels[stage.progress],
        })
      }, stage.delayMs),
    )

    async function loadAnalysis() {
      setStatus("loading")
      setErrorMessage(null)
      setDegraded(false)
      setFailureReason(null)

      try {
        const response = await fetch("/api/coach/analyze", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            gameId,
            language,
          }),
        })

        if (cancelled) {
          return
        }

        if (response.status === 429) {
          const payload = (await response.json().catch(() => null)) as
            | {
                error?: string
                triggerReason?: PaywallTriggerReason
                showPaywall?: boolean
              }
            | null

          finished = true
          setPaywallReason(payload?.triggerReason ?? "analysis_limit")
          setShowPaywall(Boolean(payload?.showPaywall))
          if (payload?.showPaywall) {
            setPaywallOpen(true)
          }

          const nextErrorMessage =
            payload?.error ?? (payload?.showPaywall ? copy.rateLimitFree : copy.rateLimitPaid)
          setErrorMessage(nextErrorMessage)
          setStatus("rate_limited")
          toast.error(nextErrorMessage, { id: progressToastId })
          return
        }

        const payload = await response.json()
        if (!response.ok) {
          throw new Error(
            typeof payload?.error === "string" ? payload.error : "Failed to load analysis",
          )
        }

        const parsedPayload = coachAnalysisResponseSchema.parse(payload)
        const {
          degraded: nextDegraded = false,
          failureReason: nextFailureReason,
          ...analysisPayload
        } = parsedPayload

        finished = true
        setAnalysis(coachAnalysisSchema.parse(analysisPayload))
        setDegraded(nextDegraded)
        setFailureReason(nextFailureReason ?? null)
        setStatus("ready")
        if (nextDegraded) {
          toast.info(copy.degradedToast, {
            id: progressToastId,
            description:
              nextFailureReason == null
                ? copy.degradedBannerDescription
                : copy.degradedReasonLabels[nextFailureReason],
          })
          return
        }

        toast.success(copy.readyToast, { id: progressToastId })
      } catch {
        if (cancelled || finished) {
          return
        }

        finished = true
        const nextErrorMessage = controller.signal.aborted ? copy.timeoutError : copy.error
        setErrorMessage(nextErrorMessage)
        setStatus("error")
        toast.error(nextErrorMessage, { id: progressToastId })
      }
    }

    void loadAnalysis()

    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(requestTimeoutId)
      stageTimeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId))
      if (!finished) {
        toast.dismiss(progressToastId)
      }
    }
  }, [copy, gameId, initialAnalysis, language, progressToastId, requestVersion])

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
      <>
        <AnalysisCard title={copy.title} description={copy.description}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {status === "rate_limited"
                ? errorMessage ?? (showPaywall ? copy.rateLimitFree : copy.rateLimitPaid)
                : errorMessage ?? copy.error}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  setAnalysis(null)
                  setDegraded(false)
                  setFailureReason(null)
                  setErrorMessage(null)
                  setStatus("idle")
                  setRequestVersion((current) => current + 1)
                }}
              >
                {copy.retry}
              </Button>
              {status === "rate_limited" && showPaywall ? (
                <Button variant="outline" onClick={() => setPaywallOpen(true)}>
                  {copy.unlock}
                </Button>
              ) : null}
              <Button asChild variant="outline">
                <Link href={`/play/${gameId}`}>{copy.backToGame}</Link>
              </Button>
            </div>
          </div>
        </AnalysisCard>

        {showPaywall ? (
          <PaywallModal
            open={paywallOpen}
            onOpenChange={setPaywallOpen}
            language={language}
            triggerReason={paywallReason}
            currentTier={subscriptionTier}
            monthlyCheckoutEnabled={monthlyCheckoutEnabled}
            yearlyCheckoutEnabled={yearlyCheckoutEnabled}
          />
        ) : null}
      </>
    )
  }

  return (
    <div className="space-y-6">
      {degraded ? (
        <AnalysisCard title={copy.degradedBannerTitle}>
          <div className="space-y-3">
            <p className="text-sm leading-6 text-muted-foreground">
              {copy.degradedBannerDescription}
            </p>
            {failureReason ? (
              <p className="text-sm text-muted-foreground">
                {copy.degradedReasonLabels[failureReason]}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setAnalysis(null)
                  setDegraded(false)
                  setFailureReason(null)
                  setErrorMessage(null)
                  setStatus("idle")
                  setRequestVersion((current) => current + 1)
                }}
              >
                {copy.retryFull}
              </Button>
              <Button asChild variant="outline">
                <Link href={`/play/${gameId}`}>{copy.backToGame}</Link>
              </Button>
            </div>
          </div>
        </AnalysisCard>
      ) : null}

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
