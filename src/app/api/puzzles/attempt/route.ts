import { NextResponse } from "next/server"
import { z } from "zod"
import { captureServerEvent } from "@/lib/posthog/server"
import { advanceStreak, getTodayDateString } from "@/lib/streak/advance"
import { createClient } from "@/lib/supabase/server"

const attemptBodySchema = z.object({
  puzzleId: z.string().uuid(),
  solved: z.boolean(),
  timeTakenSeconds: z.number().int().min(0).optional(),
  attemptsUsed: z.number().int().min(1).default(1),
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
  const parsed = attemptBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({error: "Invalid payload"}, {status: 400})
  }

  const {puzzleId, solved, timeTakenSeconds, attemptsUsed} = parsed.data

  // Upsert puzzle attempt (keep first attempt record if already solved).
  const {error: attemptError} = await supabase.from("puzzle_attempts").upsert(
    {
      user_id: user.id,
      puzzle_id: puzzleId,
      solved,
      attempts_used: attemptsUsed,
      time_taken_seconds: timeTakenSeconds ?? null,
    },
    {
      onConflict: "user_id,puzzle_id",
      ignoreDuplicates: true, // don't overwrite an existing solved record
    },
  )

  if (attemptError) {
    return NextResponse.json({error: "Failed to record attempt"}, {status: 500})
  }

  // Advance streak only on a successful solve.
  let newStreakDays: number | null = null
  if (solved) {
    const {data: profile, error: profileError} = await supabase
      .from("profiles")
      .select("streak_days, last_activity_date")
      .eq("id", user.id)
      .single()

    if (!profileError && profile) {
      const today = getTodayDateString()
      const streakResult = advanceStreak({
        currentStreakDays: profile.streak_days,
        lastActivityDate: profile.last_activity_date,
        today,
      })

      if (streakResult.changed) {
        await supabase
          .from("profiles")
          .update({
            streak_days: streakResult.newStreakDays,
            last_activity_date: streakResult.newLastActivityDate,
          })
          .eq("id", user.id)
      }

      newStreakDays = streakResult.newStreakDays
    }

    await captureServerEvent({
      distinctId: user.id,
      event: "puzzle_solved",
      properties: {
        puzzle_id: puzzleId,
        time_taken_seconds: timeTakenSeconds ?? null,
        attempts_used: attemptsUsed,
        streak_days: newStreakDays,
      },
    }).catch(() => undefined)
  }

  return NextResponse.json({ok: true, streakDays: newStreakDays})
}
