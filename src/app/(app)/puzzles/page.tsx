import Link from "next/link"
import { redirect } from "next/navigation"
import { PricingCheckoutButton } from "@/components/common/PricingCheckoutButton"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  FREE_DAILY_TASK_LIMIT,
  getDailyTaskIds,
  getNextUnsolvedPuzzleId,
} from "@/lib/puzzles/daily"
import { isStripePlanConfigured } from "@/lib/stripe/products"
import { createClient } from "@/lib/supabase/server"

/**
 * /puzzles → redirect to the next available task in today's daily set.
 */
export default async function PuzzlesPage() {
  const supabase = await createClient()
  const {
    data: {user},
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const [{data: profile}, {data: puzzles}, {data: attempts}] = await Promise.all([
    supabase
      .from("profiles")
      .select("language, subscription_tier")
      .eq("id", user.id)
      .single(),
    supabase
      .from("puzzles")
      .select("id")
      .order("created_at", {ascending: true})
      .order("id", {ascending: true}),
    supabase.from("puzzle_attempts").select("puzzle_id, created_at").eq("user_id", user.id),
  ])

  if (!puzzles || puzzles.length === 0) {
    return (
      <main className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-4 px-6 py-12">
        <p className="text-muted-foreground">Задачи ещё не загружены. Зайдите позже.</p>
      </main>
    )
  }

  const now = new Date()
  const language = profile?.language === "en" ? "en" : "ru"
  const subscriptionTier =
    profile?.subscription_tier === "pro" || profile?.subscription_tier === "family"
      ? profile.subscription_tier
      : "free"
  const puzzleIds = puzzles.map((puzzle) => puzzle.id)
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString()
  // Only count attempts from today so that puzzles rotate correctly each day.
  const todayAttempts = attempts?.filter((attempt) => attempt.created_at >= todayStart) ?? []
  const solvedTodayIds = new Set(todayAttempts.map((attempt) => attempt.puzzle_id))
  const solvedTodayCount = todayAttempts.length
  // Restrict navigation to today's 3 daily tasks only.
  const dailyTaskIds = getDailyTaskIds(puzzleIds, now)
  const nextPuzzleId = getNextUnsolvedPuzzleId(dailyTaskIds, solvedTodayIds)

  if (nextPuzzleId && (subscriptionTier !== "free" || solvedTodayCount < FREE_DAILY_TASK_LIMIT)) {
    redirect(`/puzzles/${nextPuzzleId}`)
  }

  const monthlyCheckoutEnabled = isStripePlanConfigured("monthly")
  const yearlyCheckoutEnabled = isStripePlanConfigured("yearly")
  const copy =
    language === "en"
      ? {
          back: "Back to dashboard",
          emptyDescription: "You have solved every available puzzle for now. New tasks will arrive later.",
          emptyTitle: "All tasks are complete",
          limitDescription: `Upgrade to Sharpki Pro to keep training after your ${FREE_DAILY_TASK_LIMIT} free daily tasks.`,
          limitTitle: `You already completed today's ${FREE_DAILY_TASK_LIMIT} daily tasks`,
          monthlyCta: "Start Pro Monthly",
          yearlyCta: "Start Pro Yearly",
        }
      : {
          back: "← В кабинет",
          emptyDescription:
            "Вы уже решили все доступные задачи. Новые позиции появятся позже.",
          emptyTitle: "Все задачи уже решены",
          limitDescription: `Откройте Sharpki Pro, чтобы продолжить тренировку после ${FREE_DAILY_TASK_LIMIT} бесплатных ежедневных заданий.`,
          limitTitle: `Сегодняшние ${FREE_DAILY_TASK_LIMIT} задания уже выполнены`,
          monthlyCta: "Оформить Pro Monthly",
          yearlyCta: "Взять Pro Yearly",
        }

  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col justify-center gap-6 px-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle>
            {nextPuzzleId && subscriptionTier === "free" ? copy.limitTitle : copy.emptyTitle}
          </CardTitle>
          <CardDescription>
            {nextPuzzleId && subscriptionTier === "free"
              ? copy.limitDescription
              : copy.emptyDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {nextPuzzleId && subscriptionTier === "free" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <PricingCheckoutButton
                plan="monthly"
                className="w-full"
                disabled={!monthlyCheckoutEnabled}
              >
                {copy.monthlyCta}
              </PricingCheckoutButton>
              <PricingCheckoutButton
                plan="yearly"
                className="w-full"
                variant="outline"
                disabled={!yearlyCheckoutEnabled}
              >
                {copy.yearlyCta}
              </PricingCheckoutButton>
            </div>
          ) : null}

          <Button asChild variant="ghost">
            <Link href="/dashboard">{copy.back}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
