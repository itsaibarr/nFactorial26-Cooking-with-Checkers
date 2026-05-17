import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PricingAnalytics } from "@/components/common/PricingAnalytics"
import { PricingCheckoutButton } from "@/components/common/PricingCheckoutButton"
import { PortalManageButton } from "@/components/common/PortalManageButton"
import { SignInButton } from "@/components/common/SignInButton"
import {
  isStripePlanConfigured,
  pricingPlans,
} from "@/lib/stripe/products"
import { createClient } from "@/lib/supabase/server"

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{canceled?: string; plan?: string; priceId?: string}>
}) {
  const {canceled, plan, priceId} = await searchParams
  const supabase = await createClient()
  const {
    data: {user},
  } = await supabase.auth.getUser()

  const {data: profile} = user
    ? await supabase
        .from("profiles")
        .select("subscription_tier, subscription_status")
        .eq("id", user.id)
        .single()
    : {data: null}

  return (
    <main className="mx-auto flex min-h-svh max-w-5xl flex-col gap-8 px-6 py-12">
      <PricingAnalytics
        source="page"
        canceledPlan={canceled === "true" ? plan : undefined}
        canceledPriceId={canceled === "true" ? priceId : undefined}
      />

      <header className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Sharpki Pro</h1>
            <p className="max-w-2xl text-muted-foreground">
              Платный тариф снимает лимиты на AI-разборы и делает ежедневную
              тренировку непрерывной.
            </p>
          </div>
          <Button asChild variant="ghost">
            <Link href={user ? "/dashboard" : "/"}>{user ? "← В кабинет" : "← На главную"}</Link>
          </Button>
        </div>

        {canceled === "true" ? (
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardContent className="py-4 text-sm text-amber-900">
              Checkout был закрыт до оплаты. Можно вернуться к выбору плана в любой момент.
            </CardContent>
          </Card>
        ) : null}

        {profile?.subscription_tier && profile.subscription_tier !== "free" ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Подписка уже активна</p>
                <p className="text-sm text-muted-foreground">
                  Текущий статус: {profile.subscription_status ?? "active"}.
                </p>
              </div>
              <PortalManageButton />
            </CardContent>
          </Card>
        ) : null}
      </header>

      {!user ? (
        <Card>
          <CardHeader>
            <CardTitle>Сначала войдите</CardTitle>
            <CardDescription>
              Stripe Checkout работает только для авторизованного пользователя,
              чтобы мы сразу привязали подписку к вашему профилю.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignInButton ctaLocation="pricing" />
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-6 md:grid-cols-3">
        {pricingPlans.map((planItem) => {
          const checkoutReady =
            planItem.plan === "family" ? false : isStripePlanConfigured(planItem.plan)

          return (
            <Card
              key={planItem.plan}
              className={
                planItem.plan === "monthly" ? "border-primary/40 shadow-sm" : undefined
              }
            >
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle>{planItem.title}</CardTitle>
                  {planItem.highlight ? (
                    <Badge variant={planItem.plan === "monthly" ? "default" : "secondary"}>
                      {planItem.highlight}
                    </Badge>
                  ) : null}
                </div>
                <div className="text-3xl font-semibold tracking-tight">
                  {planItem.priceLabel}
                </div>
                <CardDescription>{planItem.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {planItem.plan === "family" ? (
                  <Button className="w-full" disabled>
                    Скоро
                  </Button>
                ) : !user ? (
                  <SignInButton className="w-full" ctaLocation="pricing" />
                ) : profile?.subscription_tier !== "free" ? (
                  <PortalManageButton className="w-full" />
                ) : (
                  <PricingCheckoutButton
                    plan={planItem.plan}
                    className="w-full"
                    disabled={!checkoutReady}
                    variant={planItem.plan === "yearly" ? "outline" : "default"}
                  >
                    {checkoutReady ? "Открыть Stripe Checkout" : "Добавьте price ID"}
                  </PricingCheckoutButton>
                )}

                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• AI-разборы без бесплатного дневного лимита</p>
                  <p>• Быстрый возврат в игру после оплаты</p>
                  <p>• Управление картой и отменой через Stripe Portal</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>
    </main>
  )
}
