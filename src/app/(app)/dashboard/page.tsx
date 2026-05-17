import Link from "next/link"
import { redirect } from "next/navigation"
import { DashboardActivityHeatmap } from "@/components/common/DashboardActivityHeatmap"
import { DashboardUpgradeToast } from "@/components/common/DashboardUpgradeToast"
import { DashboardAnalytics } from "@/components/common/DashboardAnalytics"
import { SharpnessGauge } from "@/components/common/SharpnessGauge"
import { SignOutButton } from "@/components/common/SignOutButton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  buildDashboardActivityHeatmap,
  getDashboardActivityRange,
} from "@/lib/dashboard/activity-heatmap"
import { getAppTranslator, getDateTimeLocale, resolveAppLocale, type AppLocale } from "@/lib/i18n"
import { createClient } from "@/lib/supabase/server"

function renderStreakBadge(days: number, locale: AppLocale) {
  const {t} = getAppTranslator(locale)

  if (days === 0) {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <span>🔥</span>
        <span>{t("dashboard.streak.none")}</span>
      </Badge>
    )
  }

  return (
    <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500">
      <span>🔥</span>
      <span>{t("dashboard.streak.days", {count: days})}</span>
    </Badge>
  )
}

function getRecentGameResultLabel(result: string | null, locale: AppLocale) {
  const {t} = getAppTranslator(locale)

  switch (result) {
    case "win":
      return t("dashboard.recentGames.results.win")
    case "loss":
      return t("dashboard.recentGames.results.loss")
    case "aborted":
      return t("dashboard.recentGames.results.aborted")
    default:
      return t("dashboard.recentGames.results.draw")
  }
}

function getOpponentLevelLabel(level: string, locale: AppLocale) {
  const {t} = getAppTranslator(locale)

  switch (level) {
    case "easy":
      return t("dashboard.recentGames.levels.easy")
    case "medium":
      return t("dashboard.recentGames.levels.medium")
    case "hard":
      return t("dashboard.recentGames.levels.hard")
    default:
      return level
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: {user},
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/")
  }

  const activityRange = getDashboardActivityRange()
  const activityStartTimestamp = `${activityRange.startDate}T00:00:00.000Z`

  const [{data: profile}, {data: recentGames}, {data: completedGames}, {data: solvedPuzzles}] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, current_sharpness, streak_days, language")
        .eq("id", user.id)
        .single(),
      supabase
        .from("games")
        .select("id, result, opponent_level, sharpness_score, created_at")
        .eq("user_id", user.id)
        .not("result", "is", null)
        .order("created_at", {ascending: false})
        .limit(3),
      supabase
        .from("games")
        .select("ended_at")
        .eq("user_id", user.id)
        .not("result", "is", null)
        .gte("ended_at", activityStartTimestamp),
      supabase
        .from("puzzle_attempts")
        .select("created_at")
        .eq("user_id", user.id)
        .eq("solved", true)
        .gte("created_at", activityStartTimestamp),
    ])

  const locale = resolveAppLocale(profile?.language)
  const {t} = getAppTranslator(locale)

  const activityHeatmap = buildDashboardActivityHeatmap({
    endDate: activityRange.endDate,
    startDate: activityRange.startDate,
    gameEndedAt:
      completedGames?.flatMap((game) => (game.ended_at ? [game.ended_at] : [])) ?? [],
    puzzleSolvedAt: solvedPuzzles?.map((attempt) => attempt.created_at) ?? [],
  })

  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col gap-6 px-6 py-12">
      <DashboardAnalytics />
      <DashboardUpgradeToast />

      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Sharpki</h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/settings">{t("dashboard.settings")}</Link>
          </Button>
          {renderStreakBadge(profile?.streak_days ?? 0, locale)}
          <SignOutButton label={t("dashboard.signOut")} />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{profile?.display_name ?? user.email}</CardTitle>
          <CardDescription>{t("dashboard.profileDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-4">
            <SharpnessGauge
              value={profile?.current_sharpness ?? 50}
              label={t("dashboard.sharpnessLabel")}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
            <Button asChild size="lg">
              <Link href="/play">{t("dashboard.playWithBot")}</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/puzzles">{t("dashboard.dailyPuzzle")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <DashboardActivityHeatmap data={activityHeatmap} locale={locale} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>{t("dashboard.recentGames.title")}</CardTitle>
            <CardDescription className="mt-1">
              {t("dashboard.recentGames.description")}
            </CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/history">{t("dashboard.recentGames.allGames")}</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentGames?.length ? (
            recentGames.map((game) => (
              <Link key={game.id} href={`/analysis/${game.id}`} className="block">
                <div className="flex items-center justify-between rounded-xl border p-3 text-sm transition-colors hover:bg-muted/50">
                  <div>
                    <p className="font-medium">{getRecentGameResultLabel(game.result, locale)}</p>
                    <p className="text-muted-foreground">
                      {t("dashboard.recentGames.botLabel", {
                        level: getOpponentLevelLabel(game.opponent_level, locale),
                      })}{" "}
                      · {new Date(game.created_at).toLocaleString(getDateTimeLocale(locale))}
                    </p>
                  </div>
                  <p className="font-medium">
                    {game.sharpness_score === null ? "—" : `${game.sharpness_score}/100`}
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("dashboard.recentGames.empty")}
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
