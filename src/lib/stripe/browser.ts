import { loadStripe } from "@stripe/stripe-js"

let stripePromise: ReturnType<typeof loadStripe> | null = null

export function getStripeJs() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

  if (!publishableKey) {
    return null
  }

  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey)
  }

  return stripePromise
}
