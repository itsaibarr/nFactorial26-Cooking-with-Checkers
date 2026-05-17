import { NextResponse } from "next/server"
import { z } from "zod"
import { captureServerEvent, captureServerException } from "@/lib/posthog/server"
import { getPlayerGameResult, recordedMoveInputListSchema, replayRecordedGame } from "@/lib/game/session"
import {
  computeGameSharpness,
  sharpnessBreakdownSchema,
  updateSharpnessEma,
} from "@/lib/sharpness/compute"
import type { Json } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/server"

const saveGameBodySchema = z.object({
  gameId: z.string().uuid(),
  moves: recordedMoveInputListSchema,
  termination: z.enum(["resignation"]).optional(),
})

const storedGameSchema = z.object({
  id: z.string().uuid(),
  player_color: z.enum(["white", "black"]),
  opponent_level: z.enum(["easy", "medium", "hard"]),
  started_at: z.string(),
  result: z.enum(["win", "loss", "draw", "aborted"]).nullable(),
  end_reason: z.string().nullable(),
  ended_at: z.string().nullable(),
  sharpness_score: z.number().int().min(0).max(100).nullable(),
  sharpness_breakdown: sharpnessBreakdownSchema.nullable(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: {user},
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({error: "Unauthorized"}, {status: 401})
  }

  const body = await request.json().catch(() => null)
  const parsedBody = saveGameBodySchema.safeParse(body)
  if (!parsedBody.success) {
    return NextResponse.json({error: "Invalid payload"}, {status: 400})
  }

  const {data: rawGame, error: gameError} = await supabase
    .from("games")
    .select(
      "id, player_color, opponent_level, started_at, result, end_reason, ended_at, sharpness_score, sharpness_breakdown",
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

  if (parsedGame.data.ended_at) {
    return NextResponse.json({
      result: parsedGame.data.result,
      endReason: parsedGame.data.end_reason,
      endedAt: parsedGame.data.ended_at,
      sharpnessScore: parsedGame.data.sharpness_score,
      sharpnessBreakdown: parsedGame.data.sharpness_breakdown,
    })
  }

  try {
    const replayed = replayRecordedGame(parsedBody.data.moves)
    const playerMoveCount = replayed.moves.filter(
      (move) => move.side === parsedGame.data.player_color,
    ).length
    const resigned = parsedBody.data.termination === "resignation"

    if (resigned && playerMoveCount === 0) {
      return NextResponse.json(
        {error: "Play at least one move before resigning"},
        {status: 400},
      )
    }

    if (replayed.state.status === "playing" && !resigned) {
      return NextResponse.json({error: "Game is not finished yet"}, {status: 400})
    }

    const playerResult = resigned
      ? "loss"
      : getPlayerGameResult(replayed.state, parsedGame.data.player_color)
    const endReason = resigned ? "resignation" : replayed.state.endReason
    const sharpness = computeGameSharpness({
      playerColor: parsedGame.data.player_color,
      moves: parsedBody.data.moves,
    })

    const {data: profile, error: profileError} = await supabase
      .from("profiles")
      .select("current_sharpness")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({error: "Profile not found"}, {status: 404})
    }

    const nextSharpness = updateSharpnessEma(profile.current_sharpness, sharpness.score)
    const endedAt = new Date().toISOString()
    const startedAtMs = Date.parse(parsedGame.data.started_at)
    const durationSeconds = Number.isNaN(startedAtMs)
      ? null
      : Math.max(0, Math.round((Date.now() - startedAtMs) / 1000))
    const persistedMoves: Json = replayed.moves.map((move) => ({
      notation: move.notation,
      durationMs: move.durationMs,
      side: move.side,
    }))
    const persistedBreakdown: Json = {
      accuracy: sharpness.breakdown.accuracy,
      speed: sharpness.breakdown.speed,
      blunderRate: sharpness.breakdown.blunderRate,
      topThreeMatches: sharpness.breakdown.topThreeMatches,
      playerMoves: sharpness.breakdown.playerMoves,
      blunders: sharpness.breakdown.blunders,
      averageMoveTimeMs: sharpness.breakdown.averageMoveTimeMs,
    }

    const {error: updateGameError} = await supabase
      .from("games")
      .update({
        moves: persistedMoves,
        result: playerResult,
        end_reason: endReason,
        sharpness_score: sharpness.score,
        sharpness_breakdown: persistedBreakdown,
        ended_at: endedAt,
        duration_seconds: durationSeconds,
      })
      .eq("id", parsedGame.data.id)
      .eq("user_id", user.id)

    if (updateGameError) {
      throw updateGameError
    }

    const {error: updateProfileError} = await supabase
      .from("profiles")
      .update({
        current_sharpness: nextSharpness,
      })
      .eq("id", user.id)

    if (updateProfileError) {
      throw updateProfileError
    }

    await captureServerEvent({
      distinctId: user.id,
      event: "game_completed",
      properties: {
        game_id: parsedGame.data.id,
        result: playerResult,
        end_reason: endReason,
        duration_seconds: durationSeconds,
        moves_count: replayed.moves.length,
        sharpness_score: sharpness.score,
      },
    }).catch(() => undefined)

    return NextResponse.json({
      result: playerResult,
      endReason: endReason,
      endedAt,
      sharpnessScore: sharpness.score,
      sharpnessBreakdown: sharpness.breakdown,
      currentSharpness: nextSharpness,
    })
  } catch (error) {
    await captureServerException(error, user.id, {
      stage: "save_game",
      game_id: parsedBody.data.gameId,
    }).catch(() => undefined)

    return NextResponse.json({error: "Failed to save game"}, {status: 500})
  }
}
