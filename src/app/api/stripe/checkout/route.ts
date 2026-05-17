import { NextResponse } from "next/server"
import { z } from "zod"
import { captureServerEvent, captureServerException } from "@/lib/posthog/server"
import { getAppUrl } from "@/lib/site"
import { getStripe } from "@/lib/stripe/client"
import { checkoutPlanSchema, getStripePriceId } from "@/lib/stripe/products"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

const checkoutBodySchema = z.object({
  plan: checkoutPlanSchema,
})

async function getOrCreateStripeCustomer({
  supabase,
  userId,
  email,
  displayName,
  existingCustomerId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  email: string | null | undefined
  displayName: string | null
  existingCustomerId: string | null
}) {
  if (existingCustomerId) {
    return existingCustomerId
  }

  const stripe = getStripe()
  const customer = await stripe.customers.create({
    email: email ?? undefined,
    name: displayName ?? email ?? undefined,
    metadata: {
      user_id: userId,
    },
  })

  const {error: profileUpdateError} = await supabase
    .from("profiles")
    .update({
      stripe_customer_id: customer.id,
    })
    .eq("id", userId)

  if (profileUpdateError) {
    throw profileUpdateError
  }

  return customer.id
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: {user},
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({error: "Unauthorized"}, {status: 401})
  }

  const body = await request.json().catch(() => null)
  const parsedBody = checkoutBodySchema.safeParse(body)

  if (!parsedBody.success) {
    return NextResponse.json({error: "Invalid payload"}, {status: 400})
  }

  try {
    const {data: profile, error: profileError} = await supabase
      .from("profiles")
      .select("display_name, stripe_customer_id, subscription_tier")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({error: "Profile not found"}, {status: 404})
    }

    if (profile.subscription_tier !== "free") {
      return NextResponse.json(
        {error: "You already have an active plan. Manage it from settings."},
        {status: 400},
      )
    }

    const plan = parsedBody.data.plan
    const priceId = getStripePriceId(plan)
    const customerId = await getOrCreateStripeCustomer({
      supabase,
      userId: user.id,
      email: user.email,
      displayName: profile.display_name,
      existingCustomerId: profile.stripe_customer_id,
    })

    const appUrl = getAppUrl()
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      success_url: `${appUrl}/dashboard?upgraded=true&plan=${plan}`,
      cancel_url: `${appUrl}/pricing?canceled=true&plan=${plan}&priceId=${priceId}`,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan,
        },
      },
    })

    if (!session.url) {
      throw new Error("Stripe checkout session did not include a redirect URL")
    }

    await captureServerEvent({
      distinctId: user.id,
      event: "checkout_started",
      properties: {
        plan,
        price_id: priceId,
      },
    }).catch(() => undefined)

    return NextResponse.json({url: session.url})
  } catch (error) {
    await captureServerException(error, user.id, {
      stage: "stripe_checkout",
    }).catch(() => undefined)

    return NextResponse.json({error: "Failed to start checkout"}, {status: 500})
  }
}
