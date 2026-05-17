"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { posthog } from "@/lib/posthog/client"
import type { CheckoutPlan } from "@/lib/stripe/products"

const PLAN_LABELS: Record<CheckoutPlan, "monthly" | "yearly"> = {
  monthly: "monthly",
  yearly: "yearly",
}

export function PricingCheckoutButton({
  plan,
  children,
  disabled = false,
  className,
  variant = "default",
}: {
  plan: CheckoutPlan
  children: React.ReactNode
  disabled?: boolean
  className?: string
  variant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const [loading, setLoading] = useState(false)

  async function handleCheckout() {
    if (disabled || loading) {
      return
    }

    setLoading(true)

    try {
      if (posthog.__loaded) {
        posthog.capture("pricing_plan_clicked", {
          plan: PLAN_LABELS[plan],
        })
      }

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({plan}),
      })

      const payload = (await response.json().catch(() => null)) as
        | {url?: string; error?: string}
        | null

      if (!response.ok || !payload?.url) {
        const errorMessage = payload?.error

        if (errorMessage?.includes("already have an active plan")) {
          toast.error(errorMessage)
          return
        }

        throw new Error(errorMessage || "Checkout failed")
      }

      window.location.assign(payload.url)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Checkout unavailable. Please try again.",
      )
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      className={className}
      variant={variant}
      disabled={disabled || loading}
      onClick={handleCheckout}
      aria-label={`Start ${PLAN_LABELS[plan]} checkout`}
    >
      {loading ? "Opening checkout…" : children}
    </Button>
  )
}
