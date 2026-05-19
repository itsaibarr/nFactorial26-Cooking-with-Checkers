import Link from "next/link"
import { redirect } from "next/navigation"
import { LeagueBadge, type LeagueTier } from "@/components/common/LeagueBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getAppTranslator } from "@/lib/i18n"
import { resolveLocaleFromCookie } from "@/lib/i18n/server"
import { createClient } from "@/lib/supabase/server"

function getLeagueTierLabel(tier: string, t: ReturnType<typeof getAppTranslator>["t"]) {
  const labels: Record<string, string> = {
    bronze: t("leagues.tier.bronze"),
    silver: t("leagues.tier.silver"),
    gold: t("leagues.tier.gold"),
    diamond: t("leagues.tier.diamond"),
  }
  return labels[tier] ?? tier
}

function getResultBadge(result: string | null, t: ReturnType<typeof getAppTranslator>["t"]) {
  switch (result) {
    case "promoted":
      return <Badge className="bg-green-500 text-white hover:bg-green-500">↑ {t("leagues.result.promoted")}</Badge>
    case "relegated":
      return <Badge className="bg-red-500 text-white hover:bg-red-500">↓ {t("leagues.result.relegated")}</Badge>
    case "stayed":
      return <Badge variant="outline">→ {t("leagues.result.stayed")}</Badge>
    case "inactive":
      return <Badge variant="outline" className="text-muted-foreground">— {t("leagues.result.inactive")}</Badge>
    default:
      return null
  }
}

export default async function LeaguesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/")

  const locale = await resolveLocaleFromCookie()
  const { t } = getAppTranslator(locale)

  // Get user's tier from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("league_tier, display_name")
    .eq("id", user.id)
    .single()

  const userTier = (profile?.league_tier ?? "bronze") as LeagueTier

  // Get or create current season
  const { data: seasonId } = await supabase.rpc("get_or_create_current_season")

  // Fetch current season details
  const { data: season } = seasonId
    ? await supabase
        .from("league_seasons")
        .select("id, season_number, start_date, end_date, settled")
        .eq("id", seasonId)
        .single()
    : { data: null }

  // Fetch user's entry this season
  const { data: userEntry } = seasonId
    ? await supabase
        .from("league_entries")
        .select("games_played, avg_sharpness, league_tier")
        .eq("season_id", seasonId)
        .eq("user_id", user.id)
        .single()
    : { data: null }

  // Fetch leaderboard: top 50 in user's tier
  const { data: leaderboardRows } = seasonId
    ? await supabase
        .from("league_entries")
        .select("user_id, games_played, avg_sharpness")
        .eq("season_id", seasonId)
        .eq("league_tier", userTier)
        .order("avg_sharpness", { ascending: false, nullsFirst: false })
        .limit(50)
    : { data: [] }

  const rows = leaderboardRows ?? []

  // Fetch display names for leaderboard
  const leaderboardUserIds = rows.map((r) => r.user_id)
  const { data: profileRows } = leaderboardUserIds.length > 0
    ? await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", leaderboardUserIds)
    : { data: [] }

  const profileMap = new Map((profileRows ?? []).map((p) => [p.id, p.display_name]))

  // Compute user's rank
  let userRank: number | null = null
  if (userEntry && seasonId) {
    if (userEntry.avg_sharpness !== null) {
      const { count } = await supabase
        .from("league_entries")
        .select("user_id", { count: "exact", head: true })
        .eq("season_id", seasonId)
        .eq("league_tier", userTier)
        .gt("avg_sharpness", userEntry.avg_sharpness)
      userRank = (count ?? 0) + 1
    }
  }

  const { count: totalInTier } = seasonId
    ? await supabase
        .from("league_entries")
        .select("user_id", { count: "exact", head: true })
        .eq("season_id", seasonId)
        .eq("league_tier", userTier)
    : { count: 0 }

  // Past 3 seasons (excluding current)
  const { data: pastSeasons } = await supabase
    .from("league_seasons")
    .select("id, season_number, start_date, end_date, settled")
    .eq("settled", true)
    .order("season_number", { ascending: false })
    .limit(3)

  // Fetch user's entries for past seasons
  const pastSeasonIds = (pastSeasons ?? []).map((s) => s.id)
  const { data: pastEntries } = pastSeasonIds.length > 0
    ? await supabase
        .from("league_entries")
        .select("season_id, league_tier, games_played, avg_sharpness, promotion_result")
        .eq("user_id", user.id)
        .in("season_id", pastSeasonIds)
    : { data: [] }

  const pastEntryMap = new Map(
    (pastEntries ?? []).map((e) => [e.season_id, e]),
  )

  // Season days remaining
  const nowMs = new Date().getTime()
  const daysLeft = season
    ? Math.max(0, Math.ceil((new Date(season.end_date).getTime() - nowMs) / 86400000))
    : 0

  const gamesPlayed = userEntry?.games_played ?? 0
  const gamesNeeded = Math.max(0, 3 - gamesPlayed)
  // != null catches both null (0 games) and undefined (no entry yet)
  const avgSharpness = userEntry?.avg_sharpness != null ? Number(userEntry.avg_sharpness) : null

  // Progress bar: how far from top 20%? Use rank as proxy
  const progressValue =
    userRank !== null && (totalInTier ?? 0) > 0
      ? Math.max(0, Math.min(100, Math.round((1 - (userRank - 1) / (totalInTier ?? 1)) * 100)))
      : 0

  return (
    <main className="mx-auto flex min-h-svh max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-12">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("leagues.title")}</h1>
        <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
          <Link href="/dashboard">← Dashboard</Link>
        </Button>
      </header>

      {/* Hero */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <LeagueBadge tier={userTier} size="md" labelOverride={getLeagueTierLabel(userTier, t)} />
            <span>{t("leagues.yourLeague")}</span>
          </CardTitle>
          <CardDescription>
            {season
              ? daysLeft === 0
                ? t("leagues.seasonEndsToday")
                : t("leagues.dashboard.seasonDays", { days: daysLeft })
              : t("leagues.seasonEnds")}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t("leagues.gamesThisWeek", { count: gamesPlayed })}</p>
            {gamesNeeded > 0 && (
              <p className="text-sm text-amber-600">{t("leagues.qualifyNotice", { remaining: gamesNeeded })}</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {avgSharpness !== null
                ? t("leagues.avgSharpness", { score: avgSharpness.toFixed(1) })
                : t("leagues.avgSharpness", { score: "—" })}
            </p>
          </div>
          {userRank !== null && (totalInTier ?? 0) > 0 && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t("leagues.rank", { rank: userRank, total: totalInTier ?? 0 })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress bar */}
      {gamesPlayed >= 3 && (totalInTier ?? 0) > 0 && (
        <Card>
          <CardContent className="py-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("leagues.dashboard.playMore")}</span>
              <span className="font-medium">{progressValue}%</span>
            </div>
            <Progress value={progressValue} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>{t("leagues.leaderboard.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("leagues.leaderboard.empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-2 pr-4 text-left font-medium">{t("leagues.leaderboard.rank")}</th>
                    <th className="pb-2 pr-4 text-left font-medium">{t("leagues.leaderboard.player")}</th>
                    <th className="pb-2 pr-4 text-right font-medium">{t("leagues.leaderboard.games")}</th>
                    <th className="pb-2 text-right font-medium">{t("leagues.leaderboard.avgSharpness")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const isMe = row.user_id === user.id
                    const name = (profileMap.get(row.user_id) ?? "Player").split(" ")[0]
                    return (
                      <tr
                        key={row.user_id}
                        className={
                          isMe
                            ? "rounded bg-primary/10 font-semibold"
                            : "border-b last:border-0"
                        }
                      >
                        <td className="py-2 pr-4">{index + 1}</td>
                        <td className="py-2 pr-4">{name}{isMe ? " ★" : ""}</td>
                        <td className="py-2 pr-4 text-right">{row.games_played}</td>
                        <td className="py-2 text-right">
                          {row.avg_sharpness !== null ? Number(row.avg_sharpness).toFixed(1) : "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past seasons */}
      <Card>
        <CardHeader>
          <CardTitle>{t("leagues.history.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {(pastSeasons ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("leagues.history.empty")}</p>
          ) : (
            <div className="space-y-2">
              {(pastSeasons ?? []).map((s) => {
                const entry = pastEntryMap.get(s.id)
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">Season {s.season_number}</p>
                      <p className="text-muted-foreground">
                        {new Date(s.start_date).toLocaleDateString()} –{" "}
                        {new Date(s.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {entry && (
                        <span className="text-muted-foreground">
                          {entry.avg_sharpness !== null
                            ? Number(entry.avg_sharpness).toFixed(1)
                            : "—"}
                        </span>
                      )}
                      {entry
                        ? getResultBadge(entry.promotion_result, t)
                        : getResultBadge("inactive", t)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
