import OpenAI from "openai"
import { buildCoachPrompts } from "@/lib/coach/prompt"
import {
  coachAnalysisFailureReasonSchema,
  coachAnalysisSchema,
  type CoachAnalysis,
  type CoachAnalysisFailureReason,
  type CoachAnalysisResult,
  type CoachGameContext,
  type CoachHighlight,
  type CoachOverallQuality,
} from "@/lib/coach/types"

const FIREWORKS_BASE_URL = "https://api.fireworks.ai/inference/v1"
const DEFAULT_COACH_MODEL = "accounts/fireworks/models/qwen3p6-plus"
const MAX_RETRIES = 2
const ATTEMPT_TIMEOUT_MS = 10_000
const TOTAL_TIMEOUT_MS = 22_000

let fireworksClient: OpenAI | null = null

function getCoachModel() {
  return process.env.COACH_MODEL?.trim() || DEFAULT_COACH_MODEL
}

function getFireworksClient() {
  const apiKey = process.env.FIREWORKS_API_KEY?.trim()
  if (!apiKey) {
    throw new Error("FIREWORKS_API_KEY is not configured")
  }

  if (!fireworksClient) {
    fireworksClient = new OpenAI({
      apiKey,
      baseURL: FIREWORKS_BASE_URL,
    })
  }

  return fireworksClient
}

function roundToFiveDecimals(value: number) {
  return Math.round(value * 100_000) / 100_000
}

function computeCostUsd({
  promptTokens,
  cachedTokens,
  completionTokens,
}: {
  promptTokens: number
  cachedTokens: number
  completionTokens: number
}) {
  const uncachedTokens = Math.max(0, promptTokens - cachedTokens)

  return roundToFiveDecimals(
    uncachedTokens * (0.5 / 1_000_000) +
      cachedTokens * (0.1 / 1_000_000) +
      completionTokens * (3 / 1_000_000),
  )
}

function getFallbackOverallQuality({
  result,
  sharpnessScore,
}: Pick<CoachGameContext, "result" | "sharpnessScore">): CoachOverallQuality {
  if (result === "win" && sharpnessScore >= 80) {
    return "excellent"
  }

  if (sharpnessScore >= 70) {
    return "good"
  }

  if (sharpnessScore >= 55) {
    return "developing"
  }

  return "tough_game"
}

function buildFallbackHighlight(
  context: CoachGameContext,
  highlight: CoachGameContext["criticalMoments"][number],
): CoachHighlight {
  const bestMoveLine =
    highlight.best_move && highlight.best_move !== highlight.notation
      ? context.language === "ru"
        ? ` Стоило внимательнее проверить ${highlight.best_move}.`
        : ` It was worth checking ${highlight.best_move} more carefully.`
      : ""

  if (context.language === "ru") {
    if (highlight.type === "best_move" || highlight.type === "good_idea") {
      return {
        move_number: highlight.move_number,
        type: highlight.type,
        what_you_did: `На ходу ${highlight.move_number} вы выбрали ${highlight.notation} и удержали инициативу в позиции.`,
        what_to_consider: `Это был практичный ход: после него оценка стала лучше для вас.${bestMoveLine}`,
      }
    }

    return {
      move_number: highlight.move_number,
      type: highlight.type,
      what_you_did: `На ходу ${highlight.move_number} вы выбрали ${highlight.notation}, и после этого позиция стала заметно проще для соперника.`,
      what_to_consider: `Идея была понятной, но здесь стоило ещё раз проверить все ответы соперника.${bestMoveLine}`,
    }
  }

  if (highlight.type === "best_move" || highlight.type === "good_idea") {
    return {
      move_number: highlight.move_number,
      type: highlight.type,
      what_you_did: `On move ${highlight.move_number} you chose ${highlight.notation} and kept the initiative.`,
      what_to_consider: `This was a practical decision because the engine liked the position more for you afterward.${bestMoveLine}`,
    }
  }

  return {
    move_number: highlight.move_number,
    type: highlight.type,
    what_you_did: `On move ${highlight.move_number} you played ${highlight.notation}, and the position became easier for the opponent after that.`,
    what_to_consider: `The idea made sense, but this was a moment to double-check the opponent's reply before committing.${bestMoveLine}`,
  }
}

function getCoachFailureReason(error: unknown): CoachAnalysisFailureReason {
  if (error instanceof SyntaxError) {
    return "parse"
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof error.name === "string" &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  ) {
    return "timeout"
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    if (message.includes("timeout") || message.includes("abort")) {
      return "timeout"
    }

    if (
      message.includes("fireworks_api_key") ||
      message.includes("api key") ||
      message.includes("unauthorized") ||
      message.includes("authentication")
    ) {
      return "auth"
    }

    if (
      message.includes("json") ||
      message.includes("parse") ||
      message.includes("zod")
    ) {
      return "parse"
    }
  }

  return "unknown"
}

export function buildEngineFallbackAnalysis(context: CoachGameContext): CoachAnalysis {
  const highlightsSource =
    context.criticalMoments.length > 0
      ? context.criticalMoments.slice(0, 3)
      : [
          {
            move_number: 1,
            notation: context.moves.find((move) => move.side === context.playerColor)?.notation ?? "-",
            type: "good_idea" as const,
            eval_before: 0,
            eval_after: 0,
            swing: 0,
            best_move: null,
          },
        ]

  const highlights = highlightsSource.map((highlight) =>
    buildFallbackHighlight(context, highlight),
  )

  if (context.language === "ru") {
    return {
      overall_quality: getFallbackOverallQuality(context),
      sharpness_score_for_this_game: context.sharpnessScore,
      highlights,
      key_lesson:
        "Самая полезная привычка после партии - возвращаться к поворотным ходам и сравнивать свой замысел с тем, что видел движок.",
      encouragement:
        highlights[0]?.move_number === undefined
          ? "Вы довели партию до конца - это уже хороший материал для роста."
          : `Вы не бросили игру и дали материал для точного разбора - особенно полезно посмотреть ещё раз на ход ${highlights[0].move_number}.`,
    }
  }

  return {
    overall_quality: getFallbackOverallQuality(context),
    sharpness_score_for_this_game: context.sharpnessScore,
    highlights,
    key_lesson:
      "The best habit after a game is to revisit the turning points and compare your idea with what the engine preferred.",
    encouragement:
      highlights[0]?.move_number === undefined
        ? "You played the game to the end, and that already gives you useful material to learn from."
        : `You stayed with the game all the way through, and move ${highlights[0].move_number} is a strong place to learn from next.`,
  }
}

export function sanitizeCoachAnalysis(
  rawAnalysis: CoachAnalysis,
  context: CoachGameContext,
) {
  const playerMoveCount = context.moves.filter(
    (move) => move.side === context.playerColor,
  ).length
  const allowedCriticalMoveNumbers = new Set(
    context.criticalMoments.map((moment) => moment.move_number),
  )
  const seenMoveNumbers = new Set<number>()

  const highlights = rawAnalysis.highlights.filter(
    (highlight) => {
      if (highlight.move_number < 1 || highlight.move_number > playerMoveCount) {
        return false
      }

      if (
        allowedCriticalMoveNumbers.size > 0 &&
        !allowedCriticalMoveNumbers.has(highlight.move_number)
      ) {
        return false
      }

      if (seenMoveNumbers.has(highlight.move_number)) {
        return false
      }

      seenMoveNumbers.add(highlight.move_number)
      return true
    },
  )

  if (highlights.length === 0) {
    return {
      analysis: buildEngineFallbackAnalysis(context),
      degraded: true,
    }
  }

  return {
    analysis: {
      ...rawAnalysis,
      sharpness_score_for_this_game: context.sharpnessScore,
      highlights,
    } satisfies CoachAnalysis,
    degraded: false,
  }
}

export async function getCoachAnalysis(
  context: CoachGameContext,
): Promise<CoachAnalysisResult> {
  const model = getCoachModel()
  const {systemPrompt, userPrompt} = buildCoachPrompts(context)
  const deadlineAt = Date.now() + TOTAL_TIMEOUT_MS
  let lastTokensIn: number | null = null
  let lastTokensOut: number | null = null
  let lastCostUsd: number | null = null
  let lastFailureReason: CoachAnalysisFailureReason | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const remainingMs = deadlineAt - Date.now()
      if (remainingMs <= 0) {
        throw new Error("Coach analysis timed out")
      }

      const client = getFireworksClient()
      const completion = await client.chat.completions.create({
        model,
        messages: [
          {role: "system", content: systemPrompt},
          {role: "user", content: userPrompt},
        ],
        response_format: {type: "json_object"},
        reasoning_effort: "none",
        temperature: 0.6,
        max_tokens: 800,
      }, {
        signal: AbortSignal.timeout(Math.min(ATTEMPT_TIMEOUT_MS, remainingMs)),
      })

      lastTokensIn = completion.usage?.prompt_tokens ?? null
      lastTokensOut = completion.usage?.completion_tokens ?? null

      const cachedTokens = completion.usage?.prompt_tokens_details?.cached_tokens ?? 0
      if (lastTokensIn !== null && lastTokensOut !== null) {
        lastCostUsd = computeCostUsd({
          promptTokens: lastTokensIn,
          cachedTokens,
          completionTokens: lastTokensOut,
        })
      }

      const content = completion.choices[0]?.message?.content
      if (!content) {
        throw new Error("Coach completion did not return content")
      }

      const parsed = coachAnalysisSchema.parse(
        JSON.parse(content) satisfies Record<string, unknown>,
      )
      const sanitized = sanitizeCoachAnalysis(parsed, context)

      return {
        analysis: sanitized.analysis,
        model: sanitized.degraded ? "engine-only-fallback" : completion.model || model,
        tokensIn: lastTokensIn,
        tokensOut: lastTokensOut,
        costUsd: lastCostUsd,
        degraded: sanitized.degraded,
        failureReason: sanitized.degraded ? "parse" : null,
      }
    } catch (error) {
      lastFailureReason = coachAnalysisFailureReasonSchema.parse(
        getCoachFailureReason(error),
      )

      if (attempt === MAX_RETRIES || lastFailureReason === "auth") {
        return {
          analysis: buildEngineFallbackAnalysis(context),
          model: "engine-only-fallback",
          tokensIn: lastTokensIn,
          tokensOut: lastTokensOut,
          costUsd: lastCostUsd,
          degraded: true,
          failureReason: lastFailureReason,
        }
      }
    }
  }

  return {
    analysis: buildEngineFallbackAnalysis(context),
    model: "engine-only-fallback",
    tokensIn: lastTokensIn,
    tokensOut: lastTokensOut,
    costUsd: lastCostUsd,
    degraded: true,
    failureReason: lastFailureReason ?? "timeout",
  }
}
