import Link from "next/link"
import { notFound } from "next/navigation"
import { PuzzleSolveClient } from "@/components/puzzle/PuzzleSolveClient"
import { StreakBadge } from "@/components/common/StreakBadge"
import { Button } from "@/components/ui/button"
import {
  DEFAULT_GAMEPLAY_PREFERENCES,
  mapStoredGameplayPreferences,
  storedGameplayPreferencesSchema,
} from "@/lib/game/preferences"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/server"
import type { CreateGameStateOptions, PieceColor } from "@/lib/engine/types"
import { isStripePlanConfigured } from "@/lib/stripe/products"
import { getAppTranslator, resolveLocaleFromCookie } from "@/lib/i18n"

interface PageProps {
  params: Promise<{puzzleId: string}>
}

function difficultyLabel(n: number, t: ReturnType<typeof getAppTranslator>["t"]): string {
  const labels: Record<number, string> = {
    1: t("puzzles.difficulty1"),
    2: t("puzzles.difficulty2"),
    3: t("puzzles.difficulty3"),
    4: t("puzzles.difficulty4"),
    5: t("puzzles.difficulty5"),
  }
  return labels[n] ?? String(n)
}

function themeLabel(theme: string | null, t: ReturnType<typeof getAppTranslator>["t"]): string {
  const labels: Record<string, string> = {
    basic_capture: t("puzzles.themeBasicCapture"),
    double_capture: t("puzzles.themeDoubleCapture"),
    triple_capture: t("puzzles.themeTripleCapture"),
    backward_capture: t("puzzles.themeBackwardCapture"),
    promotion: t("puzzles.themePromotion"),
    king_capture: t("puzzles.themeKingCapture"),
  }
  return theme ? (labels[theme] ?? theme) : t("puzzles.themeDefault")
}

export default async function PuzzlePage({params}: PageProps) {
  const {puzzleId} = await params
  const supabase = await createClient()

  const {
    data: {user},
  } = await supabase.auth.getUser()
  if (!user) return null

  const [puzzleResult, profileResult, attemptResult] = await Promise.all([
    supabase
      .from("puzzles")
      .select("id, slug, position, side_to_move, solution_moves, theme, difficulty, explanation_ru, explanation_en")
      .eq("id", puzzleId)
      .single(),
    supabase
      .from("profiles")
      .select(
        "streak_days, language, subscription_tier, show_legal_moves, show_recommended_moves, capture_input_mode, board_theme",
      )
      .eq("id", user.id)
      .single(),
    supabase
      .from("puzzle_attempts")
      .select("solved")
      .eq("user_id", user.id)
      .eq("puzzle_id", puzzleId)
      .maybeSingle(),
  ])

  if (puzzleResult.error || !puzzleResult.data) {
    notFound()
  }

  const puzzle = puzzleResult.data
  const profile = profileResult.data
  const alreadySolved = attemptResult.data?.solved === true

  const position = puzzle.position as CreateGameStateOptions
  const solutionMoves = puzzle.solution_moves as string[]
  const language = profile?.language === "en" ? "en" : "ru"
  const explanation = language === "en" ? puzzle.explanation_en : puzzle.explanation_ru
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
  const cookieLocale = await resolveLocaleFromCookie()
  const {t} = getAppTranslator(cookieLocale)

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 px-6 py-12">
      <header className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">{t("puzzles.backToDashboard")}</Link>
        </Button>
        <StreakBadge days={profile?.streak_days ?? 0} />
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>{t("puzzles.dailyTask")}</CardTitle>
              <CardDescription className="mt-1">
                {t("puzzles.findBestMove", { side: puzzle.side_to_move === "white" ? t("puzzles.whiteSide") : t("puzzles.blackSide") })}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant="outline">{difficultyLabel(puzzle.difficulty, t)}</Badge>
              <Badge variant="secondary" className="text-xs">
                {themeLabel(puzzle.theme, t)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PuzzleSolveClient
            puzzleId={puzzle.id}
            position={position}
            sideToMove={puzzle.side_to_move as PieceColor}
            solutionMoves={solutionMoves}
            explanation={explanation}
            alreadySolved={alreadySolved}
            language={language}
            subscriptionTier={subscriptionTier}
            monthlyCheckoutEnabled={monthlyCheckoutEnabled}
            yearlyCheckoutEnabled={yearlyCheckoutEnabled}
            gameplayPreferences={gameplayPreferences}
          />
        </CardContent>
      </Card>
    </main>
  )
}
