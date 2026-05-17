import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  createAdminClientMock,
  getStripeMock,
  getStripeWebhookSecretMock,
  captureServerEventMock,
  captureServerExceptionMock,
} = vi.hoisted(() => ({
  createAdminClientMock: vi.fn(),
  getStripeMock: vi.fn(),
  getStripeWebhookSecretMock: vi.fn(),
  captureServerEventMock: vi.fn().mockResolvedValue(undefined),
  captureServerExceptionMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: createAdminClientMock,
}))

vi.mock("@/lib/stripe/client", () => ({
  getStripe: getStripeMock,
  getStripeWebhookSecret: getStripeWebhookSecretMock,
}))

vi.mock("@/lib/posthog/server", () => ({
  captureServerEvent: captureServerEventMock,
  captureServerException: captureServerExceptionMock,
}))

import { POST } from "@/app/api/stripe/webhook/route"

const USER_ID = "0f878bb0-8648-4d49-b8db-b9c95a718750"
const SUBSCRIPTION_ID = "sub_123"
const CUSTOMER_ID = "cus_123"

function createWebhookRequest(body = JSON.stringify({id: "evt_test"})) {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: {
      "stripe-signature": "sig_test",
    },
    body,
  })
}

function createSubscription({
  status = "active",
  cancelAtPeriodEnd = false,
  priceId = "price_monthly",
  plan = "monthly",
}: {
  status?: string
  cancelAtPeriodEnd?: boolean
  priceId?: string
  plan?: string
} = {}) {
  return {
    id: SUBSCRIPTION_ID,
    customer: CUSTOMER_ID,
    status,
    cancel_at_period_end: cancelAtPeriodEnd,
    items: {
      data: [
        {
          current_period_end: 1_780_000_000,
          price: {
            id: priceId,
          },
        },
      ],
    },
    metadata: {
      user_id: USER_ID,
      plan,
    },
  }
}

function createAdminMock() {
  const subscriptionUpserts: Array<Record<string, unknown>> = []
  const profileUpdates: Array<Record<string, unknown>> = []

  const profilesTable = {
    select: vi.fn(() => ({
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: USER_ID,
        },
        error: null,
      }),
    })),
    update: vi.fn((values: Record<string, unknown>) => {
      profileUpdates.push(values)

      return {
        eq: vi.fn().mockResolvedValue({error: null}),
      }
    }),
  }

  const subscriptionsTable = {
    upsert: vi.fn((values: Record<string, unknown>) => {
      subscriptionUpserts.push(values)
      return Promise.resolve({error: null})
    }),
  }

  return {
    admin: {
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return profilesTable
        }

        if (table === "subscriptions") {
          return subscriptionsTable
        }

        throw new Error(`Unexpected table: ${table}`)
      }),
    },
    subscriptionUpserts,
    profileUpdates,
  }
}

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_PRICE_PRO_MONTHLY = "price_monthly"
    process.env.STRIPE_PRICE_PRO_YEARLY = "price_yearly"
    getStripeWebhookSecretMock.mockReturnValue("whsec_test")
  })

  it("rejects invalid signatures without leaking the raw Stripe error", async () => {
    getStripeMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() => {
          throw new Error("bad signature")
        }),
      },
    })

    const response = await POST(createWebhookRequest("{}"))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: "Webhook signature verification failed",
    })
  })

  it("syncs a completed checkout into Supabase and PostHog", async () => {
    const {admin, subscriptionUpserts, profileUpdates} = createAdminMock()
    createAdminClientMock.mockReturnValue(admin)

    const subscription = createSubscription()
    getStripeMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue({
          type: "checkout.session.completed",
          data: {
            object: {
              id: "cs_test",
              amount_total: 499,
              customer: CUSTOMER_ID,
              subscription: SUBSCRIPTION_ID,
              client_reference_id: USER_ID,
              metadata: {
                user_id: USER_ID,
                plan: "monthly",
              },
            },
          },
        }),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue(subscription),
      },
    })

    const response = await POST(createWebhookRequest())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({received: true})
    expect(subscriptionUpserts[0]).toMatchObject({
      user_id: USER_ID,
      stripe_subscription_id: SUBSCRIPTION_ID,
      stripe_customer_id: CUSTOMER_ID,
      status: "active",
      price_id: "price_monthly",
      cancel_at_period_end: false,
    })
    expect(profileUpdates[0]).toEqual({
      stripe_customer_id: CUSTOMER_ID,
      subscription_status: "active",
      subscription_tier: "pro",
    })
    expect(captureServerEventMock).toHaveBeenCalledWith({
      distinctId: USER_ID,
      event: "checkout_completed",
      properties: {
        plan: "monthly",
        price_id: "price_monthly",
        amount_cents: 499,
      },
    })
  })

  it("syncs subscription updates and tracks period-end cancellations", async () => {
    const {admin, subscriptionUpserts, profileUpdates} = createAdminMock()
    createAdminClientMock.mockReturnValue(admin)

    getStripeMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue({
          type: "customer.subscription.updated",
          data: {
            object: createSubscription({
              status: "active",
              cancelAtPeriodEnd: true,
            }),
          },
        }),
      },
      subscriptions: {
        retrieve: vi.fn(),
      },
    })

    const response = await POST(createWebhookRequest())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({received: true})
    expect(subscriptionUpserts[0]).toMatchObject({
      user_id: USER_ID,
      status: "active",
      cancel_at_period_end: true,
      price_id: "price_monthly",
    })
    expect(profileUpdates[0]).toEqual({
      stripe_customer_id: CUSTOMER_ID,
      subscription_status: "active",
      subscription_tier: "pro",
    })
    expect(captureServerEventMock).toHaveBeenCalledWith({
      distinctId: USER_ID,
      event: "subscription_cancelled",
      properties: {
        at_period_end: true,
      },
    })
  })

  it("syncs deleted subscriptions back to the free tier", async () => {
    const {admin, subscriptionUpserts, profileUpdates} = createAdminMock()
    createAdminClientMock.mockReturnValue(admin)

    getStripeMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue({
          type: "customer.subscription.deleted",
          data: {
            object: createSubscription({
              status: "canceled",
            }),
          },
        }),
      },
      subscriptions: {
        retrieve: vi.fn(),
      },
    })

    const response = await POST(createWebhookRequest())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({received: true})
    expect(subscriptionUpserts[0]).toMatchObject({
      user_id: USER_ID,
      status: "canceled",
      price_id: "price_monthly",
    })
    expect(profileUpdates[0]).toEqual({
      stripe_customer_id: CUSTOMER_ID,
      subscription_status: "canceled",
      subscription_tier: "free",
    })
    expect(captureServerEventMock).toHaveBeenCalledWith({
      distinctId: USER_ID,
      event: "subscription_cancelled",
      properties: {
        at_period_end: false,
      },
    })
  })

  it("syncs payment failures and tracks the failed invoice attempt", async () => {
    const {admin, subscriptionUpserts, profileUpdates} = createAdminMock()
    createAdminClientMock.mockReturnValue(admin)

    const subscriptionsRetrieveMock = vi.fn().mockResolvedValue(
      createSubscription({
        status: "past_due",
      }),
    )

    getStripeMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue({
          type: "invoice.payment_failed",
          data: {
            object: {
              attempt_count: 2,
              parent: {
                type: "subscription_details",
                subscription_details: {
                  subscription: SUBSCRIPTION_ID,
                },
              },
            },
          },
        }),
      },
      subscriptions: {
        retrieve: subscriptionsRetrieveMock,
      },
    })

    const response = await POST(createWebhookRequest())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({received: true})
    expect(subscriptionsRetrieveMock).toHaveBeenCalledWith(SUBSCRIPTION_ID)
    expect(subscriptionUpserts[0]).toMatchObject({
      user_id: USER_ID,
      status: "past_due",
      price_id: "price_monthly",
    })
    expect(profileUpdates[0]).toEqual({
      stripe_customer_id: CUSTOMER_ID,
      subscription_status: "past_due",
      subscription_tier: "free",
    })
    expect(captureServerEventMock).toHaveBeenCalledWith({
      distinctId: USER_ID,
      event: "subscription_payment_failed",
      properties: {
        attempt_number: 2,
      },
    })
  })
})
