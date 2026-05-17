import { NextResponse } from "next/server"
import type Stripe from "stripe"
import { captureServerEvent, captureServerException } from "@/lib/posthog/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe/client"
import { getPlanFromPriceId, getTierFromPriceId } from "@/lib/stripe/products"

export const runtime = "nodejs"

function toIsoTimestamp(unixSeconds: number | null | undefined) {
  return typeof unixSeconds === "number"
    ? new Date(unixSeconds * 1000).toISOString()
    : null
}

function getCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
) {
  if (!customer) {
    return null
  }

  return typeof customer === "string" ? customer : customer.id
}

function getSubscriptionId(
  subscription: string | Stripe.Subscription | null,
) {
  if (!subscription) {
    return null
  }

  return typeof subscription === "string" ? subscription : subscription.id
}

function getSubscriptionPriceId(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.price.id ?? null
}

function getSubscriptionCurrentPeriodEnd(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.current_period_end ?? null
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  if (
    !invoice.parent ||
    invoice.parent.type !== "subscription_details" ||
    !invoice.parent.subscription_details
  ) {
    return null
  }

  return getSubscriptionId(invoice.parent.subscription_details.subscription)
}

function hasPaidAccess(status: Stripe.Subscription.Status) {
  return status === "active" || status === "trialing"
}

async function findUserIdByCustomerId(customerId: string) {
  const admin = createAdminClient()
  const {data, error} = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data?.id ?? null
}

async function syncStripeSubscription({
  subscription,
  fallbackUserId,
}: {
  subscription: Stripe.Subscription
  fallbackUserId?: string | null
}) {
  const admin = createAdminClient()
  const customerId = getCustomerId(subscription.customer)
  const priceId = getSubscriptionPriceId(subscription)

  if (!customerId || !priceId) {
    throw new Error("Stripe subscription payload is missing a customer or price")
  }

  const userId =
    subscription.metadata.user_id?.trim() ||
    fallbackUserId ||
    (await findUserIdByCustomerId(customerId))

  if (!userId) {
    throw new Error("Could not resolve the user for this Stripe subscription")
  }

  const tier = getTierFromPriceId(priceId)
  if (!tier) {
    throw new Error("Could not map the Stripe price to a subscription tier")
  }

  const nextTier = hasPaidAccess(subscription.status) ? tier : "free"

  const {error: subscriptionError} = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      status: subscription.status,
      price_id: priceId,
      current_period_end: toIsoTimestamp(
        getSubscriptionCurrentPeriodEnd(subscription),
      ),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "stripe_subscription_id",
    },
  )

  if (subscriptionError) {
    throw subscriptionError
  }

  const {error: profileError} = await admin
    .from("profiles")
    .update({
      stripe_customer_id: customerId,
      subscription_status: subscription.status,
      subscription_tier: nextTier,
    })
    .eq("id", userId)

  if (profileError) {
    throw profileError
  }

  return {
    userId,
    customerId,
    priceId,
    plan: getPlanFromPriceId(priceId),
  }
}

export async function POST(request: Request) {
  const stripe = getStripe()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({error: "Missing Stripe signature"}, {status: 400})
  }

  const body = await request.text()

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      getStripeWebhookSecret(),
    )
  } catch {
    return NextResponse.json({error: "Webhook signature verification failed"}, {status: 400})
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const subscriptionId = getSubscriptionId(session.subscription)

        if (!subscriptionId) {
          throw new Error("Checkout session is missing a subscription id")
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const synced = await syncStripeSubscription({
          subscription,
          fallbackUserId:
            session.metadata?.user_id?.trim() || session.client_reference_id,
        })

        await captureServerEvent({
          distinctId: synced.userId,
          event: "checkout_completed",
          properties: {
            plan: synced.plan,
            price_id: synced.priceId,
            amount_cents: session.amount_total ?? null,
          },
        }).catch(() => undefined)

        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const synced = await syncStripeSubscription({subscription})

        if (subscription.cancel_at_period_end) {
          await captureServerEvent({
            distinctId: synced.userId,
            event: "subscription_cancelled",
            properties: {
              at_period_end: true,
            },
          }).catch(() => undefined)
        }

        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const synced = await syncStripeSubscription({subscription})

        await captureServerEvent({
          distinctId: synced.userId,
          event: "subscription_cancelled",
          properties: {
            at_period_end: false,
          },
        }).catch(() => undefined)

        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = getInvoiceSubscriptionId(invoice)

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const synced = await syncStripeSubscription({subscription})

          await captureServerEvent({
            distinctId: synced.userId,
            event: "subscription_payment_failed",
            properties: {
              attempt_number: invoice.attempt_count ?? null,
            },
          }).catch(() => undefined)
        }

        break
      }

      default:
        break
    }

    return NextResponse.json({received: true})
  } catch (error) {
    await captureServerException(error, undefined, {
      stage: "stripe_webhook",
      event_type: event.type,
    }).catch(() => undefined)

    return NextResponse.json({error: "Webhook handling failed"}, {status: 500})
  }
}
