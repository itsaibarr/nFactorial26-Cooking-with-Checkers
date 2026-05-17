import { NextResponse } from "next/server"
import { z } from "zod"
import { captureServerEvent, captureServerException } from "@/lib/posthog/server"
import { FREE_DAILY_TASK_LIMIT } from "@/lib/puzzles/daily"
import { releaseRateLimitSlot, reserveRateLimitSlot } from "@/lib/rate-limit"
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
      ? `Вы уже выполнили ${FREE_DAILY_TASK_LIMIT} бесплатных ежедневных задания сегодня.`
      : `You have already completed ${FREE_DAILY_TASK_LIMIT} free daily tasks today.`
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
  let reservedRateLimit: {
    subscriptionTier: z.infer<typeof storedProfileSchema>["subscription_tier"]
  } | null = null
  let attemptPersisted = false

  if (!user) {
    return NextResponse.json({error: "Unauthorized"}, {status: 401})
  }

  const body = await request.json().catch(() => null)
  const parsed = attemptBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({error: "Invalid payload"}, {status: 400})
  }

  const {puzzleId, solved, timeTakenSeconds, attemptsUsed} = parsed.data

  try {
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

      reservedRateLimit = {
        subscriptionTier: parsedProfile.data.subscription_tier,
      }
    }

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
        ignoreDuplicates: true,
      },
    )

    if (attemptError) {
      throw attemptError
    }

    attemptPersisted = true

    let newStreakDays: number | null = null
    if (solved && profileData) {
      const today = getTodayDateString()
      const streakResult = advanceStreak({
        currentStreakDays: profileData.streak_days,
        lastActivityDate: profileData.last_activity_date,
        today,
      })

      if (streakResult.changed) {
        const {error: profileUpdateError} = await supabase
          .from("profiles")
          .update({
            streak_days: streakResult.newStreakDays,
            last_activity_date: streakResult.newLastActivityDate,
          })
          .eq("id", user.id)

        if (profileUpdateError) {
          throw profileUpdateError
        }
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
  } catch (error) {
    if (reservedRateLimit && !attemptPersisted) {
      await releaseRateLimitSlot({
        supabase,
        userId: user.id,
        action: "puzzle",
        subscriptionTier: reservedRateLimit.subscriptionTier,
      }).catch(() => undefined)
    }

    await captureServerException(error, user.id, {
      stage: "puzzle_attempt",
      puzzle_id: puzzleId,
    }).catch(() => undefined)

    return NextResponse.json({error: "Failed to record attempt"}, {status: 500})
  }
}
