"use client"

import { useEffect } from "react"
import { getStripeJs } from "@/lib/stripe/browser"

/**
 * Pre-loads Stripe.js on pages that may initiate checkout.
 * This enables Stripe Radar (fraud detection) and ensures the
 * redirect to Stripe Checkout is fast. Not needed on pages
 * that never show checkout/portal buttons.
 */
export function StripeScript() {
  useEffect(() => {
    getStripeJs()?.catch(() => {
      // Stripe.js failed to load — non-critical, checkout will still
      // work via server-side session redirect.
    })
  }, [])

  return null
}
