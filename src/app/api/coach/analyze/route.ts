import { NextResponse } from "next/server"
import { z } from "zod"
import { isCoachAnalysisFresh } from "@/lib/coach/cache"
import { detectCriticalMoments } from "@/lib/coach/critical_moments"
import { getCoachAnalysis } from "@/lib/coach/llm"
import {
  coachAnalysisSchema,
  coachLanguageSchema,
  type CoachLanguage,
} from "@/lib/coach/types"
import type { RecordedMove } from "@/lib/game/session"
import { captureServerEvent, captureServerException } from "@/lib/posthog/server"
import type { Json } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/server"

const analyzeBodySchema = z.object({
  gameId: z.string().uuid(),
  language: coachLanguageSchema.optional(),
})

const storedGameSchema = z.object({
  id: z.string().uuid(),
  player_color: z.enum(["white", "black"]),
  opponent_level: z.enum(["easy", "medium", "hard"]),
  moves: z.array(
    z.object({
      notation: z.string().min(1).max(64),
      durationMs: z.number().int().nonnegative().nullable(),
      side: z.enum(["white", "black"]),
    }),
  ),
  result: z.enum(["win", "loss", "draw", "aborted"]).nullable(),
  sharpness_score: z.number().int().min(0).max(100).nullable(),
  ended_at: z.string().nullable(),
})

const storedProfileSchema = z.object({
  language: coachLanguageSchema,
  level: z.enum(["beginner", "intermediate", "confident"]),
  current_sharpness: z.number().int().min(0).max(100),
  streak_days: z.number().int().min(0),
  subscription_tier: z.enum(["free", "pro", "family"]),
})

const storedAnalysisSchema = z.object({
  payload: coachAnalysisSchema,
  created_at: z.string(),
})

const storedRateLimitSchema = z.object({
  count: z.number().int().min(0),
})

const ANALYSIS_ACTION = "ai_analysis"

function getAnalysisLimit(subscriptionTier: "free" | "pro" | "family") {
  return subscriptionTier === "free" ? 1 : 10
}

function getRateLimitWindowStart(
  subscriptionTier: "free" | "pro" | "family",
  now = new Date(),
) {
  if (subscriptionTier === "free") {
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    ).toISOString()
  }

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
    ),
  ).toISOString()
}

function getRateLimitMessage(language: CoachLanguage) {
  return language === "ru"
    ? "Вы уже использовали лимит AI-разборов для текущего окна."
    : "You have already used the AI analysis limit for the current window."
}

async function reserveAnalysisSlot({
  supabase,
  userId,
  subscriptionTier,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  subscriptionTier: "free" | "pro" | "family"
}) {
  const limit = getAnalysisLimit(subscriptionTier)
  const windowStart = getRateLimitWindowStart(subscriptionTier)

  const {data: rawRateLimit, error: rateLimitError} = await supabase
    .from("rate_limits")
    .select("count")
    .eq("user_id", userId)
    .eq("action", ANALYSIS_ACTION)
    .eq("window_start", windowStart)
    .maybeSingle()

  if (rateLimitError) {
    throw rateLimitError
  }

  const parsedRateLimit = storedRateLimitSchema.safeParse(rawRateLimit)
  if (!rawRateLimit || !parsedRateLimit.success) {
    const {error: insertError} = await supabase.from("rate_limits").insert({
      user_id: userId,
      action: ANALYSIS_ACTION,
      count: 1,
      window_start: windowStart,
    })

    if (insertError) {
      throw insertError
    }

    return {allowed: true, limit}
  }

  if (parsedRateLimit.data.count >= limit) {
    return {allowed: false, limit}
  }

  const {error: updateError} = await supabase
    .from("rate_limits")
    .update({
      count: parsedRateLimit.data.count + 1,
    })
    .eq("user_id", userId)
    .eq("action", ANALYSIS_ACTION)
    .eq("window_start", windowStart)

  if (updateError) {
    throw updateError
  }

  return {allowed: true, limit}
}

export async function POST(request: Request) {
  const startedAt = Date.now()
  const supabase = await createClient()
  const {
    data: {user},
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({error: "Unauthorized"}, {status: 401})
  }

  const body = await request.json().catch(() => null)
  const parsedBody = analyzeBodySchema.safeParse(body)
  if (!parsedBody.success) {
    return NextResponse.json({error: "Invalid payload"}, {status: 400})
  }

  try {
    const {data: rawGame, error: gameError} = await supabase
      .from("games")
      .select("id, player_color, opponent_level, moves, result, sharpness_score, ended_at")
      .eq("id", parsedBody.data.gameId)
      .eq("user_id", user.id)
      .single()

    if (gameError || !rawGame) {
      return NextResponse.json({error: "Game not found"}, {status: 404})
    }

    const parsedGame = storedGameSchema.safeParse(rawGame)
    if (!parsedGame.success) {
      return NextResponse.json({error: "Stored game is invalid"}, {status: 500})
    }

    if (!parsedGame.data.ended_at || !parsedGame.data.result || parsedGame.data.sharpness_score === null) {
      return NextResponse.json(
        {error: "Game analysis is only available after the game is saved"},
        {status: 400},
      )
    }

    const {data: rawProfile, error: profileError} = await supabase
      .from("profiles")
      .select("language, level, current_sharpness, streak_days, subscription_tier")
      .eq("id", user.id)
      .single()

    if (profileError || !rawProfile) {
      return NextResponse.json({error: "Profile not found"}, {status: 404})
    }

    const parsedProfile = storedProfileSchema.safeParse(rawProfile)
    if (!parsedProfile.success) {
      return NextResponse.json({error: "Profile is invalid"}, {status: 500})
    }

    const language = parsedBody.data.language ?? parsedProfile.data.language

    const {data: rawAnalysis, error: analysisError} = await supabase
      .from("game_analyses")
      .select("payload, created_at")
      .eq("game_id", parsedGame.data.id)
      .eq("language", language)
      .maybeSingle()

    if (analysisError) {
      throw analysisError
    }

    const parsedExistingAnalysis = storedAnalysisSchema.safeParse(rawAnalysis)
    if (
      parsedExistingAnalysis.success &&
      isCoachAnalysisFresh(parsedExistingAnalysis.data.created_at)
    ) {
      return NextResponse.json(parsedExistingAnalysis.data.payload)
    }

    const rateLimit = await reserveAnalysisSlot({
      supabase,
      userId: user.id,
      subscriptionTier: parsedProfile.data.subscription_tier,
    })

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: getRateLimitMessage(language),
          triggerReason: "analysis_limit_reached",
          limit: rateLimit.limit,
        },
        {status: 429},
      )
    }

    const criticalMoments = detectCriticalMoments({
      playerColor: parsedGame.data.player_color,
      moves: parsedGame.data.moves,
    })

    const analysisResult = await getCoachAnalysis({
      gameId: parsedGame.data.id,
      language,
      playerColor: parsedGame.data.player_color,
      playerLevel: parsedProfile.data.level,
      opponentLevel: parsedGame.data.opponent_level,
      result: parsedGame.data.result === "aborted" ? "loss" : parsedGame.data.result,
      sharpnessScore: parsedGame.data.sharpness_score,
      currentSharpness: parsedProfile.data.current_sharpness,
      streakDays: parsedProfile.data.streak_days,
      moves: parsedGame.data.moves as readonly RecordedMove[],
      criticalMoments,
    })

    const {error: upsertError} = await supabase.from("game_analyses").upsert(
      {
        game_id: parsedGame.data.id,
        user_id: user.id,
        language,
        payload: analysisResult.analysis as Json,
        model: analysisResult.model,
        tokens_in: analysisResult.tokensIn,
        tokens_out: analysisResult.tokensOut,
        cost_usd: analysisResult.costUsd,
        created_at: new Date().toISOString(),
      },
      {
        onConflict: "game_id,language",
      },
    )

    if (upsertError) {
      throw upsertError
    }

    await captureServerEvent({
      distinctId: user.id,
      event: "ai_analysis_completed",
      properties: {
        game_id: parsedGame.data.id,
        language,
        latency_ms: Date.now() - startedAt,
        tokens_in: analysisResult.tokensIn,
        tokens_out: analysisResult.tokensOut,
        cost_usd: analysisResult.costUsd,
      },
    }).catch(() => undefined)

    return NextResponse.json(analysisResult.analysis)
  } catch (error) {
    await captureServerException(error, user.id, {
      stage: "coach_analyze",
      game_id: parsedBody.data.gameId,
    }).catch(() => undefined)

    return NextResponse.json({error: "Failed to analyze game"}, {status: 500})
  }
}
