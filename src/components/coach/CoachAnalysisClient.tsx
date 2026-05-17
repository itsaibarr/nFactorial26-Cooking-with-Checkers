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
import type { PaywallTriggerReason } from "@/lib/rate-limit"

const ANALYSIS_REQUEST_TIMEOUT_MS = 28_000
const PROGRESS_STAGES = [
  { delayMs: 0, progress: 20 },
  { delayMs: 2_500, progress: 45 },
  { delayMs: 6_000, progress: 72 },
  { delayMs: 10_000, progress: 90 },
] as const

const coachAnalysisResponseSchema = coachAnalysisSchema.extend({
  degraded: z.boolean().optional(),
  failureReason: coachAnalysisFailureReasonSchema.optional(),
})

function getCopy(language: CoachLanguage) {
  if (language === "ru") {
    return {
      title: "AI-разбор партии",
      description: "Тёплый разбор на основе ваших ходов и оценок движка.",
      loading: "Готовим персональный разбор партии...",
      error: "Не удалось получить разбор. Попробуйте ещё раз.",
      timeoutError: "AI-разбор отвечает слишком долго. Попробуйте ещё раз.",
      rateLimitFree:
        "Лимит бесплатных разборов достигнут. Откройте Pro, чтобы продолжить без паузы.",
      rateLimitPaid:
        "Почасовой лимит для платного тарифа уже использован. Попробуйте снова в следующем часу.",
      retry: "Повторить запрос",
      retryFull: "Повторить полный AI-разбор",
      unlock: "Открыть Pro",
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
      progressTitle: "Готовность AI-разбора",
      progressLabels: {
        20: "Перепроверяем ходы партии",
        45: "Ищем поворотные моменты",
        72: "Собираем персональные советы",
        90: "Проверяем и сохраняем результат",
      } satisfies Record<number, string>,
      readyToast: "AI-разбор готов",
      degradedToast: "Пока готов только быстрый разбор",
      degradedBannerTitle: "Показан быстрый engine-based разбор",
      degradedBannerDescription:
        "Полный ответ от AI Coach не успел прийти. Этот вариант всё ещё опирается на движок и реальные ходы, но позже можно попробовать запросить более подробный разбор ещё раз.",
      degradedReasonLabels: {
        timeout: "Причина: модель отвечала слишком долго.",
        parse: "Причина: ответ модели пришлось заменить безопасным fallback.",
        auth: "Причина: AI-провайдер временно недоступен.",
        unknown: "Причина: сервер вернул безопасный fallback.",
      } satisfies Record<CoachAnalysisFailureReason, string>,
    }
  }

  return {
    title: "AI game review",
    description: "A warm recap built from your real moves and engine signals.",
    loading: "Preparing your personal game review...",
    error: "The review could not be loaded. Please try again.",
    timeoutError: "The AI review took too long to respond. Please try again.",
    rateLimitFree:
      "You have reached the free analysis limit for now. Unlock Pro to continue right away.",
    rateLimitPaid:
      "You have reached the paid hourly analysis limit. Please try again next hour.",
    retry: "Try again",
    retryFull: "Retry full AI review",
    unlock: "Unlock Pro",
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
    progressTitle: "AI review readiness",
    progressLabels: {
      20: "Replaying your moves",
      45: "Finding turning points",
      72: "Drafting personal coaching notes",
      90: "Validating and saving the result",
    } satisfies Record<number, string>,
    readyToast: "Your AI review is ready",
    degradedToast: "A quick fallback review is ready",
    degradedBannerTitle: "A quick engine-based review is being shown",
    degradedBannerDescription:
      "The full AI Coach response did not arrive in time. This version is still grounded in the engine and your real moves, but you can retry later for a fuller explanation.",
    degradedReasonLabels: {
      timeout: "Reason: the model took too long to answer.",
      parse: "Reason: the model response was replaced with a safe fallback.",
      auth: "Reason: the AI provider is temporarily unavailable.",
      unknown: "Reason: the server returned a safe fallback.",
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
}: {
  gameId: string
  language: CoachLanguage
  initialAnalysis: CoachAnalysis | null
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
    if (status !== "idle") {
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
              nextFailureReason === undefined
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
  }, [copy, gameId, language, progressToastId, requestVersion])

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
