import { NextResponse } from "next/server"
import { captureServerException } from "@/lib/posthog/server"
import { getAppUrl } from "@/lib/site"
import { getStripe } from "@/lib/stripe/client"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

async function getOrCreatePortalConfiguration(stripe: ReturnType<typeof getStripe>) {
  const configurations = await stripe.billingPortal.configurations.list({
    active: true,
  })

  const existing = configurations.data.find(
    (config) => config.active,
  )

  if (existing) {
    return existing.id
  }

  const appUrl = getAppUrl()
  const configuration = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: "Sharpki subscription management",
    },
    features: {
      subscription_update: {
        enabled: true,
        default_allowed_updates: ["price"],
        products: [],
      },
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end",
        cancellation_reason: {
          enabled: true,
          options: [
            "too_expensive",
            "missing_features",
            "switched_service",
            "unused",
            "other",
          ],
        },
      },
      payment_method_update: {
        enabled: true,
      },
      invoice_history: {
        enabled: true,
      },
    },
    default_return_url: `${appUrl}/settings?portal=returned`,
  })

  return configuration.id
}

export async function POST() {
  const supabase = await createClient()
  const {
    data: {user},
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({error: "Unauthorized"}, {status: 401})
  }

  try {
    const {data: profile, error: profileError} = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single()

    if (profileError || !profile?.stripe_customer_id) {
      return NextResponse.json(
        {error: "No subscription is available to manage yet."},
        {status: 400},
      )
    }

    const stripe = getStripe()
    const configurationId = await getOrCreatePortalConfiguration(stripe)
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      configuration: configurationId,
      return_url: `${getAppUrl()}/settings?portal=returned`,
    })

    return NextResponse.json({url: session.url})
  } catch (error) {
    await captureServerException(error, user.id, {
      stage: "stripe_portal",
    }).catch(() => undefined)

    return NextResponse.json({error: "Failed to open billing portal"}, {status: 500})
  }
}
