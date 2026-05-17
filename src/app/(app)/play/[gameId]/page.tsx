import { notFound } from "next/navigation"
import { z } from "zod"
import { GameSession } from "@/components/game/GameSession"
import {
  DEFAULT_GAMEPLAY_PREFERENCES,
  mapStoredGameplayPreferences,
  storedGameplayPreferencesSchema,
} from "@/lib/game/preferences"
import { recordedMoveListSchema, replayRecordedGame } from "@/lib/game/session"
import { sharpnessBreakdownSchema } from "@/lib/sharpness/compute"
import { isStripePlanConfigured } from "@/lib/stripe/products"
import { createClient } from "@/lib/supabase/server"
import { getAppTranslator, resolveLocaleFromCookie } from "@/lib/i18n"

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

  const {data: profile} = await supabase
    .from("profiles")
    .select(
      "language, subscription_tier, show_legal_moves, show_recommended_moves, capture_input_mode, board_theme",
    )
    .eq("id", user.id)
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

  const language = profile?.language === "en" ? "en" : "ru"
  const cookieLocale = await resolveLocaleFromCookie()
  const {t} = getAppTranslator(cookieLocale)
  const subscriptionTier =
    profile?.subscription_tier === "pro" || profile?.subscription_tier === "family"
      ? profile.subscription_tier
      : "free"
  const monthlyCheckoutEnabled = isStripePlanConfigured("monthly")
  const yearlyCheckoutEnabled = isStripePlanConfigured("yearly")
  const parsedGameplayPreferences = storedGameplayPreferencesSchema.safeParse(profile)
  const gameplayPreferences = parsedGameplayPreferences.success
    ? mapStoredGameplayPreferences(parsedGameplayPreferences.data)
    : DEFAULT_GAMEPLAY_PREFERENCES

  return (
    <main className="mx-auto flex min-h-svh max-w-6xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("gameSession.title")}</h1>
        <p className="text-muted-foreground">
          {t("gameSession.description")}
        </p>
      </header>

      <GameSession
        key={parsedGame.data.id}
        gameId={parsedGame.data.id}
        startedAt={parsedGame.data.started_at}
        playerColor={parsedGame.data.player_color}
        opponentLevel={parsedGame.data.opponent_level}
        language={language}
        subscriptionTier={subscriptionTier}
        monthlyCheckoutEnabled={monthlyCheckoutEnabled}
        yearlyCheckoutEnabled={yearlyCheckoutEnabled}
        gameplayPreferences={gameplayPreferences}
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
