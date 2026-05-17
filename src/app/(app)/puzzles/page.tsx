import Link from "next/link"
import { redirect } from "next/navigation"
import { LanguageToggle } from "@/components/common/LanguageToggle"
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
import { getAppTranslator } from "@/lib/i18n"
import { resolveLocaleFromCookie } from "@/lib/i18n/server"

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
    const locale = await resolveLocaleFromCookie()
    const {t} = getAppTranslator(locale)
    return (
      <main className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-4 px-6 py-12">
        <p className="text-muted-foreground">{t("puzzles.notLoaded")}</p>
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
  const cookieLocale = await resolveLocaleFromCookie()
  const {t} = getAppTranslator(cookieLocale)

  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col justify-center gap-6 px-6 py-12">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">{t("puzzles.backToDashboard")}</Link>
        </Button>
        <LanguageToggle locale={cookieLocale} label={t("puzzles.langToggle")} ariaLabel={t("puzzles.langToggleAria")} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            {nextPuzzleId && subscriptionTier === "free" ? t("puzzles.limitTitle", { count: FREE_DAILY_TASK_LIMIT }) : t("puzzles.allComplete")}
          </CardTitle>
          <CardDescription>
            {nextPuzzleId && subscriptionTier === "free"
              ? t("puzzles.limitDescription", { count: FREE_DAILY_TASK_LIMIT })
              : t("puzzles.allCompleteDescription")}
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
                {t("puzzles.monthlyCta")}
              </PricingCheckoutButton>
              <PricingCheckoutButton
                plan="yearly"
                className="w-full"
                variant="outline"
                disabled={!yearlyCheckoutEnabled}
              >
                {t("puzzles.yearlyCta")}
              </PricingCheckoutButton>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  )
}
