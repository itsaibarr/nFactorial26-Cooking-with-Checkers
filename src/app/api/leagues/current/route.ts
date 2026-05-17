import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get current user's league tier
  const { data: profile } = await supabase
    .from("profiles")
    .select("league_tier, display_name")
    .eq("id", user.id)
    .single()

  const userTier = profile?.league_tier ?? "bronze"

  // Get or create current season
  const { data: seasonId, error: seasonError } = await supabase.rpc(
    "get_or_create_current_season",
  )

  if (seasonError || !seasonId) {
    return NextResponse.json({ error: "Failed to get season" }, { status: 500 })
  }

  // Fetch season details
  const { data: season } = await supabase
    .from("league_seasons")
    .select("id, season_number, start_date, end_date, settled")
    .eq("id", seasonId)
    .single()

  if (!season) {
    return NextResponse.json({ error: "Season not found" }, { status: 500 })
  }

  // Fetch leaderboard: top 50 in user's tier by avg_sharpness DESC
  const { data: leaderboardRows } = await supabase
    .from("league_entries")
    .select(
      "id, user_id, league_tier, games_played, avg_sharpness",
    )
    .eq("season_id", seasonId)
    .eq("league_tier", userTier)
    .order("avg_sharpness", { ascending: false, nullsFirst: false })
    .limit(50)

  const rows = leaderboardRows ?? []

  // Find user's own entry (may not be in top 50)
  let userEntry = rows.find((r) => r.user_id === user.id) ?? null
  if (!userEntry) {
    const { data: ownEntry } = await supabase
      .from("league_entries")
      .select("id, user_id, league_tier, games_played, avg_sharpness")
      .eq("season_id", seasonId)
      .eq("user_id", user.id)
      .single()
    userEntry = ownEntry ?? null
  }

  // Fetch display names for leaderboard users
  const leaderboardUserIds = rows.map((r) => r.user_id)
  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", leaderboardUserIds.length > 0 ? leaderboardUserIds : ["00000000-0000-0000-0000-000000000000"])

  const profileMap = new Map((profileRows ?? []).map((p) => [p.id, p.display_name]))

  // Count total users in tier for rank calculation
  const { count: totalInTier } = await supabase
    .from("league_entries")
    .select("id", { count: "exact", head: true })
    .eq("season_id", seasonId)
    .eq("league_tier", userTier)

  // Compute user's rank
  let userRank: number | null = null
  if (userEntry) {
    if (userEntry.avg_sharpness !== null) {
      const { count: aboveCount } = await supabase
        .from("league_entries")
        .select("id", { count: "exact", head: true })
        .eq("season_id", seasonId)
        .eq("league_tier", userTier)
        .gt("avg_sharpness", userEntry.avg_sharpness)
      userRank = (aboveCount ?? 0) + 1
    } else {
      userRank = totalInTier ?? null
    }
  }

  const leaderboard = rows.map((row, index) => {
    const rawName = profileMap.get(row.user_id) ?? "Player"
    const displayName = rawName.split(" ")[0] // first name only for privacy
    return {
      rank: index + 1,
      userId: row.user_id,
      displayName,
      gamesPlayed: row.games_played,
      avgSharpness: row.avg_sharpness !== null ? Number(row.avg_sharpness) : null,
      isCurrentUser: row.user_id === user.id,
    }
  })

  return NextResponse.json({
    season: {
      id: season.id,
      seasonNumber: season.season_number,
      startDate: season.start_date,
      endDate: season.end_date,
      settled: season.settled,
    },
    userEntry: userEntry
      ? {
          leagueTier: userEntry.league_tier,
          gamesPlayed: userEntry.games_played,
          avgSharpness: userEntry.avg_sharpness !== null ? Number(userEntry.avg_sharpness) : null,
          rank: userRank,
          totalInTier: totalInTier ?? 0,
        }
      : null,
    leaderboard,
  })
}
