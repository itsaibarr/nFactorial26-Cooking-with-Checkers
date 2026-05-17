import Link from "next/link"
import { GamePreferencesForm } from "@/components/game/GamePreferencesForm"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PortalManageButton } from "@/components/common/PortalManageButton"
import { SignOutButton } from "@/components/common/SignOutButton"
import {
  DEFAULT_GAMEPLAY_PREFERENCES,
  mapStoredGameplayPreferences,
  storedGameplayPreferencesSchema,
} from "@/lib/game/preferences"
import { getPlanFromPriceId } from "@/lib/stripe/products"
import { createClient } from "@/lib/supabase/server"

function formatPlanLabel(priceId: string | null) {
  if (!priceId) {
    return "—"
  }

  const plan = getPlanFromPriceId(priceId)

  switch (plan) {
    case "monthly":
      return "Pro Monthly"
    case "yearly":
      return "Pro Yearly"
    case "family":
      return "Family"
    default:
      return priceId
  }
}

function formatDate(dateValue: string | null) {
  if (!dateValue) {
    return "—"
  }

  return new Date(dateValue).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{portal?: string}>
}) {
  const {portal} = await searchParams
  const supabase = await createClient()
  const {
    data: {user},
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const [{data: profile}, {data: subscriptions}] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "display_name, subscription_tier, subscription_status, stripe_customer_id, show_legal_moves, show_recommended_moves, capture_input_mode, board_theme",
      )
      .eq("id", user.id)
      .single(),
    supabase
      .from("subscriptions")
      .select("price_id, status, cancel_at_period_end, current_period_end, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", {ascending: false})
      .limit(1),
  ])

  const subscription = subscriptions?.[0] ?? null
  const parsedGameplayPreferences = storedGameplayPreferencesSchema.safeParse(profile)
  const gameplayPreferences = parsedGameplayPreferences.success
    ? mapStoredGameplayPreferences(parsedGameplayPreferences.data)
    : DEFAULT_GAMEPLAY_PREFERENCES

  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col gap-6 px-6 py-12">
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Настройки</h1>
          <p className="text-muted-foreground">
            Аккаунт, статус подписки и быстрые действия.
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/dashboard">← В кабинет</Link>
        </Button>
      </header>

      {portal === "returned" ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4 text-sm">
            Страница обновлена после возврата из Stripe Portal.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{profile?.display_name ?? user.email}</CardTitle>
          <CardDescription>Базовая информация о вашем профиле Sharpki.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="outline">Email: {user.email ?? "—"}</Badge>
          <Badge>{profile?.subscription_tier ?? "free"}</Badge>
          <Badge variant="secondary">{profile?.subscription_status ?? "inactive"}</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Подписка</CardTitle>
          <CardDescription>
            Stripe синхронизирует статус автоматически через webhook.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Текущий план</p>
              <p className="mt-1 font-medium">{formatPlanLabel(subscription?.price_id ?? null)}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Статус</p>
              <p className="mt-1 font-medium">{subscription?.status ?? profile?.subscription_status ?? "inactive"}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Следующая дата</p>
              <p className="mt-1 font-medium">
                {formatDate(subscription?.current_period_end ?? null)}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Отмена в конце периода</p>
              <p className="mt-1 font-medium">
                {subscription?.cancel_at_period_end ? "Да" : "Нет"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {profile?.stripe_customer_id ? (
              <PortalManageButton />
            ) : (
              <Button asChild>
                <Link href="/pricing">Открыть тарифы</Link>
              </Button>
            )}
            <SignOutButton />
          </div>
        </CardContent>
      </Card>

      <GamePreferencesForm initialPreferences={gameplayPreferences} />
    </main>
  )
}
