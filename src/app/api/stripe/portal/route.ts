import { NextResponse } from "next/server"
import { captureServerException } from "@/lib/posthog/server"
import { getAppUrl } from "@/lib/site"
import { getStripe } from "@/lib/stripe/client"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

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
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
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
