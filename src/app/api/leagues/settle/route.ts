import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "")
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Only run on Sundays (UTC day 0)
  const today = new Date()
  if (today.getUTCDay() !== 0) {
    return NextResponse.json({ skipped: true, reason: "Not Sunday UTC" })
  }

  const supabase = await createClient()

  // Get current season id
  const { data: seasonId, error: seasonError } = await supabase.rpc(
    "get_or_create_current_season",
  )

  if (seasonError || !seasonId) {
    return NextResponse.json({ error: "Failed to get season" }, { status: 500 })
  }

  // Settle the season (idempotent)
  const { error: settleError } = await supabase.rpc("settle_league_season", {
    p_season_id: seasonId,
  })

  if (settleError) {
    return NextResponse.json({ error: settleError.message }, { status: 500 })
  }

  return NextResponse.json({ settled: true, seasonId })
}
