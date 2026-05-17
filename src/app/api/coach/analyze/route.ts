import { NextResponse } from "next/server"
import { z } from "zod"
import { isCoachAnalysisFresh } from "@/lib/coach/cache"
import { detectCriticalMoments } from "@/lib/coach/critical_moments"
import { buildEngineFallbackAnalysis, getCoachAnalysis } from "@/lib/coach/llm"
import {
  coachAnalysisSchema,
  coachLanguageSchema,
  type CoachGameContext,
  type CoachLanguage,
} from "@/lib/coach/types"
import type { RecordedMove } from "@/lib/game/session"
import { captureServerEvent, captureServerException } from "@/lib/posthog/server"
import { releaseRateLimitSlot, reserveRateLimitSlot } from "@/lib/rate-limit"
import { sharpnessBreakdownSchema } from "@/lib/sharpness/compute"
import type { Json } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const maxDuration = 30

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
  sharpness_breakdown: sharpnessBreakdownSchema.nullable(),
  ended_at: z.string().nullable(),
})

const storedProfileSchema = z.object({
  language: coachLanguageSchema,
  level: z.enum(["beginner", "intermediate", "confident"]),
  current_sharpness: z.number().int().min(0).max(100),
  streak_days: z.number().int().min(0),
  subscription_tier: z.enum(["free", "pro", "family"]),
  goal: z.string().nullable(),
  accessibility_mode: z.boolean(),
})

const storedAnalysisSchema = z.object({
  payload: coachAnalysisSchema,
  created_at: z.string(),
  model: z.string().min(1),
})

function getCoachContext({
  game,
  profile,
  language,
}: {
  game: z.infer<typeof storedGameSchema>
  profile: z.infer<typeof storedProfileSchema>
  language: CoachLanguage
}): CoachGameContext {
  if (!game.result) {
    throw new Error("Finished game result is required for coach context")
  }

  const playerMoveCount = game.moves.filter((move) => move.side === game.player_color).length
  const result =
    game.result === "aborted" || game.result === null ? "loss" : game.result

  return {
    gameId: game.id,
    language,
    playerColor: game.player_color,
    playerLevel: profile.level,
    opponentLevel: game.opponent_level,
    result,
    sharpnessScore: game.sharpness_score ?? 50,
    currentSharpness: profile.current_sharpness,
    streakDays: profile.streak_days,
    goal: profile.goal,
    accessibilityMode: profile.accessibility_mode,
    sharpnessBreakdown: game.sharpness_breakdown ?? {
      accuracy: game.sharpness_score ?? 50,
      speed: 50,
      blunderRate: game.sharpness_score ?? 50,
      topThreeMatches: 0,
      playerMoves: playerMoveCount,
      blunders: 0,
      averageMoveTimeMs: null,
    },
    moves: game.moves as readonly RecordedMove[],
    criticalMoments: detectCriticalMoments({
      playerColor: game.player_color,
      moves: game.moves,
    }),
  }
}

function getRateLimitMessage({
  language,
  showPaywall,
}: {
  language: CoachLanguage
  showPaywall: boolean
}) {
  if (showPaywall) {
    return language === "ru"
      ? "Вы уже использовали сегодняшний бесплатный AI-разбор."
      : "You have already used today's free AI analysis."
  }

  return language === "ru"
    ? "Вы уже использовали лимит AI-разборов для текущего часа."
    : "You have already used the AI analysis limit for the current hour."
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
      .select(
        "id, player_color, opponent_level, moves, result, sharpness_score, sharpness_breakdown, ended_at",
      )
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
      .select(
        "language, level, current_sharpness, streak_days, subscription_tier, goal, accessibility_mode",
      )
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
      .select("payload, created_at, model")
      .eq("game_id", parsedGame.data.id)
      .eq("language", language)
      .maybeSingle()

    if (analysisError) {
      throw analysisError
    }

    const parsedExistingAnalysis = storedAnalysisSchema.safeParse(rawAnalysis)
    if (
      parsedExistingAnalysis.success &&
      parsedExistingAnalysis.data.model !== "engine-only-fallback" &&
      isCoachAnalysisFresh(parsedExistingAnalysis.data.created_at)
    ) {
      return NextResponse.json({
        ...parsedExistingAnalysis.data.payload,
        degraded: false,
      })
    }

    const rateLimit = await reserveRateLimitSlot({
      supabase,
      userId: user.id,
      action: "ai_analysis",
      subscriptionTier: parsedProfile.data.subscription_tier,
    })

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: getRateLimitMessage({
            language,
            showPaywall: rateLimit.showPaywall,
          }),
          triggerReason: rateLimit.triggerReason,
          limit: rateLimit.limit,
          showPaywall: rateLimit.showPaywall,
        },
        {status: 429},
      )
    }

    const coachContext = getCoachContext({
      game: parsedGame.data,
      profile: parsedProfile.data,
      language,
    })

    const analysisResult = await getCoachAnalysis(coachContext).catch(() => ({
      analysis: buildEngineFallbackAnalysis(coachContext),
      model: "engine-only-fallback",
      tokensIn: null,
      tokensOut: null,
      costUsd: null,
      degraded: true,
      failureReason: "unknown" as const,
    }))

    if (analysisResult.degraded) {
      await releaseRateLimitSlot({
        supabase,
        userId: user.id,
        action: "ai_analysis",
        subscriptionTier: parsedProfile.data.subscription_tier,
      }).catch(() => undefined)
    }

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

    if (analysisResult.degraded) {
      await captureServerEvent({
        distinctId: user.id,
        event: "ai_analysis_degraded",
        properties: {
          game_id: parsedGame.data.id,
          language,
          latency_ms: Date.now() - startedAt,
          failure_reason: analysisResult.failureReason,
        },
      }).catch(() => undefined)
    } else {
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
    }

    return NextResponse.json({
      ...analysisResult.analysis,
      degraded: analysisResult.degraded,
      failureReason: analysisResult.failureReason,
    })
  } catch (error) {
    await captureServerException(error, user.id, {
      stage: "coach_analyze",
      game_id: parsedBody.data.gameId,
    }).catch(() => undefined)

    return NextResponse.json({error: "Failed to analyze game"}, {status: 500})
  }
}
