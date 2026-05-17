import { notFound } from "next/navigation"
import { z } from "zod"
import { GameSession } from "@/components/game/GameSession"
import { recordedMoveListSchema, replayRecordedGame } from "@/lib/game/session"
import { sharpnessBreakdownSchema } from "@/lib/sharpness/compute"
import { createClient } from "@/lib/supabase/server"

const storedGameSchema = z.object({
  id: z.string().uuid(),
  player_color: z.enum(["white", "black"]),
  opponent_level: z.enum(["easy", "medium", "hard"]),
  moves: recordedMoveListSchema,
  result: z.enum(["win", "loss", "draw", "aborted"]).nullable(),
  end_reason: z.string().nullable(),
  started_at: z.string(),
  ended_at: z.string().nullable(),
  sharpness_score: z.number().int().min(0).max(100).nullable(),
  sharpness_breakdown: sharpnessBreakdownSchema.nullable(),
})

export default async function PlayGamePage({
  params,
}: {
  params: Promise<{gameId: string}>
}) {
  const {gameId} = await params
  const supabase = await createClient()
  const {
    data: {user},
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  const {data: game} = await supabase
    .from("games")
    .select(
      "id, player_color, opponent_level, moves, result, end_reason, started_at, ended_at, sharpness_score, sharpness_breakdown",
    )
    .eq("id", gameId)
    .eq("user_id", user.id)
    .single()

  const parsedGame = storedGameSchema.safeParse(game)
  if (!parsedGame.success) {
    notFound()
  }

  const replayed = (() => {
    try {
      return replayRecordedGame(parsedGame.data.moves)
    } catch {
      return null
    }
  })()

  if (!replayed) {
    notFound()
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-6xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Игровая сессия</h1>
        <p className="text-muted-foreground">
          Движок работает локально в интерфейсе, а завершённая партия сохраняется
          через серверную валидацию ходов.
        </p>
      </header>

      <GameSession
        key={parsedGame.data.id}
        gameId={parsedGame.data.id}
        startedAt={parsedGame.data.started_at}
        playerColor={parsedGame.data.player_color}
        opponentLevel={parsedGame.data.opponent_level}
        initialState={replayed.state}
        initialMoves={replayed.moves}
        persistedGame={{
          result: parsedGame.data.result,
          endReason: parsedGame.data.end_reason,
          endedAt: parsedGame.data.ended_at,
          sharpnessScore: parsedGame.data.sharpness_score,
          sharpnessBreakdown: parsedGame.data.sharpness_breakdown,
        }}
      />
    </main>
  )
}
