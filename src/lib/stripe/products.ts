import { z } from "zod"

export const checkoutPlanSchema = z.enum(["monthly", "yearly"])
export type CheckoutPlan = z.infer<typeof checkoutPlanSchema>

export type DisplayPlan = CheckoutPlan | "family"
export type SubscriptionTier = "free" | "pro" | "family"

type PricingPlan = {
  plan: DisplayPlan
  title: string
  priceLabel: string
  amountCents: number
  description: string
  highlight?: string
  available: boolean
}

export const pricingPlans: readonly PricingPlan[] = [
  {
    plan: "monthly",
    title: "Pro Monthly",
    priceLabel: "$4.99/mo",
    amountCents: 499,
    description: "Unlimited AI coaching, puzzles, and higher limits.",
    highlight: "Best to start",
    available: true,
  },
  {
    plan: "yearly",
    title: "Pro Yearly",
    priceLabel: "$39.99/yr",
    amountCents: 3999,
    description: "Two free months if you know you want a daily habit.",
    highlight: "33% off",
    available: true,
  },
  {
    plan: "family",
    title: "Family",
    priceLabel: "$9.99/mo",
    amountCents: 999,
    description: "Caregiver plan UI now, checkout in a later phase.",
    highlight: "Coming soon",
    available: false,
  },
] as const

function getPriceIdEnvName(plan: CheckoutPlan) {
  return plan === "monthly"
    ? "STRIPE_PRICE_PRO_MONTHLY"
    : "STRIPE_PRICE_PRO_YEARLY"
}

export function isStripePlanConfigured(plan: CheckoutPlan) {
  return Boolean(process.env[getPriceIdEnvName(plan)]?.trim())
}

export function getStripePriceId(plan: CheckoutPlan) {
  const priceId = process.env[getPriceIdEnvName(plan)]?.trim()

  if (!priceId) {
    throw new Error(`Missing ${getPriceIdEnvName(plan)} configuration`)
  }

  return priceId
}

export function getPlanFromPriceId(priceId: string): DisplayPlan | null {
  const priceMap: Record<string, DisplayPlan> = {}

  const monthly = process.env.STRIPE_PRICE_PRO_MONTHLY?.trim()
  const yearly = process.env.STRIPE_PRICE_PRO_YEARLY?.trim()
  const familyMonthly = process.env.STRIPE_PRICE_FAMILY_MONTHLY?.trim()
  const familyYearly = process.env.STRIPE_PRICE_FAMILY_YEARLY?.trim()

  if (monthly) priceMap[monthly] = "monthly"
  if (yearly) priceMap[yearly] = "yearly"
  if (familyMonthly) priceMap[familyMonthly] = "family"
  if (familyYearly) priceMap[familyYearly] = "family"

  return priceMap[priceId] ?? null
}

export function getTierFromPriceId(priceId: string): Exclude<SubscriptionTier, "free"> | null {
  const plan = getPlanFromPriceId(priceId)

  if (!plan) {
    return null
  }

  return plan === "family" ? "family" : "pro"
}
