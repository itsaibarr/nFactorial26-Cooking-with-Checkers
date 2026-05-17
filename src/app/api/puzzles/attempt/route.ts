import { NextResponse } from "next/server"
import { z } from "zod"
import { captureServerEvent } from "@/lib/posthog/server"
import { reserveRateLimitSlot } from "@/lib/rate-limit"
import { advanceStreak, getTodayDateString } from "@/lib/streak/advance"
import { createClient } from "@/lib/supabase/server"

const attemptBodySchema = z.object({
  puzzleId: z.string().uuid(),
  solved: z.boolean(),
  timeTakenSeconds: z.number().int().min(0).optional(),
  attemptsUsed: z.number().int().min(1).default(1),
})

const storedProfileSchema = z.object({
  streak_days: z.number().int().min(0),
  last_activity_date: z.string().nullable(),
  language: z.enum(["ru", "en"]),
  subscription_tier: z.enum(["free", "pro", "family"]),
})

function getPuzzleRateLimitMessage({
  language,
  showPaywall,
}: {
  language: "ru" | "en"
  showPaywall: boolean
}) {
  if (showPaywall) {
    return language === "ru"
      ? "Бесплатный дневной лимит задач на сегодня исчерпан."
      : "You have already used today's free puzzle limit."
  }

  return language === "ru"
    ? "Лимит задач для текущего периода исчерпан."
    : "You have already used the puzzle limit for this period."
}

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

  let profileData: z.infer<typeof storedProfileSchema> | null = null

  if (solved) {
    const {data: profile, error: profileError} = await supabase
      .from("profiles")
      .select("streak_days, last_activity_date, language, subscription_tier")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({error: "Profile not found"}, {status: 404})
    }

    const parsedProfile = storedProfileSchema.safeParse(profile)
    if (!parsedProfile.success) {
      return NextResponse.json({error: "Profile is invalid"}, {status: 500})
    }

    profileData = parsedProfile.data

    const rateLimit = await reserveRateLimitSlot({
      supabase,
      userId: user.id,
      action: "puzzle",
      subscriptionTier: parsedProfile.data.subscription_tier,
    })

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: getPuzzleRateLimitMessage({
            language: parsedProfile.data.language,
            showPaywall: rateLimit.showPaywall,
          }),
          triggerReason: rateLimit.triggerReason,
          limit: rateLimit.limit,
          showPaywall: rateLimit.showPaywall,
        },
        {status: 429},
      )
    }
  }

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
  if (solved && profileData) {
    const today = getTodayDateString()
    const streakResult = advanceStreak({
      currentStreakDays: profileData.streak_days,
      lastActivityDate: profileData.last_activity_date,
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
