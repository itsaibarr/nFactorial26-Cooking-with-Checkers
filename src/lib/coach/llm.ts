import OpenAI from "openai"
import { buildCoachPrompts } from "@/lib/coach/prompt"
import {
  coachAnalysisSchema,
  type CoachAnalysis,
  type CoachAnalysisResult,
  type CoachGameContext,
  type CoachHighlight,
  type CoachOverallQuality,
} from "@/lib/coach/types"

const FIREWORKS_BASE_URL = "https://api.fireworks.ai/inference/v1"
const DEFAULT_COACH_MODEL = "accounts/fireworks/models/qwen3p6-plus"
const MAX_RETRIES = 2

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

function sanitizeCoachAnalysis(
  rawAnalysis: CoachAnalysis,
  context: CoachGameContext,
) {
  const playerMoveCount = context.moves.filter(
    (move) => move.side === context.playerColor,
  ).length

  const highlights = rawAnalysis.highlights.filter(
    (highlight) => highlight.move_number >= 1 && highlight.move_number <= playerMoveCount,
  )

  if (highlights.length === 0) {
    return buildEngineFallbackAnalysis(context)
  }

  return {
    ...rawAnalysis,
    sharpness_score_for_this_game: context.sharpnessScore,
    highlights,
  } satisfies CoachAnalysis
}

export async function getCoachAnalysis(
  context: CoachGameContext,
): Promise<CoachAnalysisResult> {
  const model = getCoachModel()
  const {systemPrompt, userPrompt} = buildCoachPrompts(context)
  let lastTokensIn: number | null = null
  let lastTokensOut: number | null = null
  let lastCostUsd: number | null = null
  let lastModel = model

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
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
      })

      lastModel = completion.model || model
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

      return {
        analysis: sanitizeCoachAnalysis(parsed, context),
        model: lastModel,
        tokensIn: lastTokensIn,
        tokensOut: lastTokensOut,
        costUsd: lastCostUsd,
      }
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        return {
          analysis: buildEngineFallbackAnalysis(context),
          model: error instanceof Error && error.message.includes("FIREWORKS_API_KEY")
            ? "engine-only-fallback"
            : lastModel,
          tokensIn: lastTokensIn,
          tokensOut: lastTokensOut,
          costUsd: lastCostUsd,
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
  }
}
