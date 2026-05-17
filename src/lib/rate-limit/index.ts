import { z } from "zod"
import { FREE_DAILY_TASK_LIMIT } from "@/lib/puzzles/daily"
import { createClient } from "@/lib/supabase/server"

export type SubscriptionTier = "free" | "pro" | "family"
export type RateLimitAction = "ai_analysis" | "game" | "puzzle"
export type PaywallTriggerReason =
  | "analysis_limit"
  | "game_limit"
  | "puzzle_limit"
  | "manual"

type RateLimitPolicy = {
  limit: number | null
  window: "day" | "hour"
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

const reserveRateLimitResultSchema = z.array(
  z.object({
    allowed: z.boolean(),
    new_count: z.number().int().min(0),
  }),
)
const rateLimitRowSchema = z.object({
  count: z.number().int().min(0),
})

const POLICY_MATRIX: Record<
  SubscriptionTier,
  Record<RateLimitAction, RateLimitPolicy>
> = {
  free: {
    ai_analysis: {limit: 1, window: "day"},
    game: {limit: 5, window: "day"},
    puzzle: {limit: FREE_DAILY_TASK_LIMIT, window: "day"},
  },
  pro: {
    ai_analysis: {limit: 10, window: "hour"},
    game: {limit: null, window: "day"},
    puzzle: {limit: null, window: "day"},
  },
  family: {
    ai_analysis: {limit: 10, window: "hour"},
    game: {limit: null, window: "day"},
    puzzle: {limit: null, window: "day"},
  },
}

const PAYWALL_REASONS: Record<RateLimitAction, PaywallTriggerReason> = {
  ai_analysis: "analysis_limit",
  game: "game_limit",
  puzzle: "puzzle_limit",
}

export function getRateLimitPolicy(
  subscriptionTier: SubscriptionTier,
  action: RateLimitAction,
) {
  return POLICY_MATRIX[subscriptionTier][action]
}

export function getPaywallTriggerReason(action: RateLimitAction) {
  return PAYWALL_REASONS[action]
}

export function shouldShowPaywall(subscriptionTier: SubscriptionTier) {
  return subscriptionTier === "free"
}

export function getRateLimitWindowStart(
  subscriptionTier: SubscriptionTier,
  action: RateLimitAction,
  now = new Date(),
) {
  const policy = getRateLimitPolicy(subscriptionTier, action)

  if (policy.window === "day") {
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    ).toISOString()
  }

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
    ),
  ).toISOString()
}

export async function reserveRateLimitSlot({
  supabase,
  userId,
  action,
  subscriptionTier,
  now = new Date(),
}: {
  supabase: SupabaseClient
  userId: string
  action: RateLimitAction
  subscriptionTier: SubscriptionTier
  now?: Date
}) {
  const policy = getRateLimitPolicy(subscriptionTier, action)

  if (policy.limit === null) {
    return {
      allowed: true,
      limit: null,
      showPaywall: false,
      triggerReason: getPaywallTriggerReason(action),
    }
  }

  const windowStart = getRateLimitWindowStart(subscriptionTier, action, now)

  const {data, error} = await supabase.rpc("reserve_rate_limit_slot", {
    p_user_id: userId,
    p_action: action,
    p_window_start: windowStart,
    p_limit: policy.limit,
  })

  if (error) {
    throw error
  }

  const parsedResult = reserveRateLimitResultSchema.safeParse(data)
  if (!parsedResult.success || !parsedResult.data[0]) {
    throw new Error("reserve_rate_limit_slot returned an invalid payload")
  }

  const result = parsedResult.data[0]

  return {
    allowed: result.allowed,
    limit: policy.limit,
    showPaywall: !result.allowed && shouldShowPaywall(subscriptionTier),
    triggerReason: getPaywallTriggerReason(action),
  }
}

export async function releaseRateLimitSlot({
  supabase,
  userId,
  action,
  subscriptionTier,
  now = new Date(),
}: {
  supabase: SupabaseClient
  userId: string
  action: RateLimitAction
  subscriptionTier: SubscriptionTier
  now?: Date
}) {
  const policy = getRateLimitPolicy(subscriptionTier, action)
  if (policy.limit === null) {
    return
  }

  const windowStart = getRateLimitWindowStart(subscriptionTier, action, now)
  const {data, error} = await supabase
    .from("rate_limits")
    .select("count")
    .eq("user_id", userId)
    .eq("action", action)
    .eq("window_start", windowStart)
    .maybeSingle()

  if (error) {
    throw error
  }

  const parsedRow = rateLimitRowSchema.nullable().safeParse(data)
  if (!parsedRow.success) {
    throw new Error("rate_limits row is invalid")
  }

  if (!parsedRow.data) {
    return
  }

  if (parsedRow.data.count <= 1) {
    const {error: deleteError} = await supabase
      .from("rate_limits")
      .delete()
      .eq("user_id", userId)
      .eq("action", action)
      .eq("window_start", windowStart)

    if (deleteError) {
      throw deleteError
    }

    return
  }

  const {error: updateError} = await supabase
    .from("rate_limits")
    .update({
      count: parsedRow.data.count - 1,
    })
    .eq("user_id", userId)
    .eq("action", action)
    .eq("window_start", windowStart)

  if (updateError) {
    throw updateError
  }
}
