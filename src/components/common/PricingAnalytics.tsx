"use client"

import { useEffect } from "react"
import { posthog } from "@/lib/posthog/client"

export function PricingAnalytics({
  source,
  canceledPlan,
  canceledPriceId,
}: {
  source: "page" | "modal"
  canceledPlan?: string
  canceledPriceId?: string
}) {
  useEffect(() => {
    if (!posthog.__loaded) {
      return
    }

    posthog.capture("pricing_viewed", {source})

    if (canceledPlan) {
      posthog.capture("checkout_abandoned", {
        plan: canceledPlan,
        price_id: canceledPriceId ?? undefined,
      })
    }
  }, [canceledPlan, canceledPriceId, source])

  return null
}
