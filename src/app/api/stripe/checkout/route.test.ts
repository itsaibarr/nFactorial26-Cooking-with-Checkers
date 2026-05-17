import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  createClientMock,
  getStripeMock,
  captureServerEventMock,
  captureServerExceptionMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getStripeMock: vi.fn(),
  captureServerEventMock: vi.fn().mockResolvedValue(undefined),
  captureServerExceptionMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}))

vi.mock("@/lib/stripe/client", () => ({
  getStripe: getStripeMock,
}))

vi.mock("@/lib/posthog/server", () => ({
  captureServerEvent: captureServerEventMock,
  captureServerException: captureServerExceptionMock,
}))

vi.mock("@/lib/site", () => ({
  getAppUrl: () => "http://localhost:3000",
}))

import { POST } from "@/app/api/stripe/checkout/route"

const USER_ID = "5f861b94-bef3-493e-a58f-c7b18033d4ae"
const CUSTOMER_ID = "cus_test_123"
const CHECKOUT_URL = "https://checkout.stripe.com/test-session"

function createMockSupabase({
  user = {id: USER_ID, email: "aigul@example.com"},
  profile = {
    display_name: "Aigul",
    stripe_customer_id: null,
    subscription_tier: "free",
  },
}: {
  user?: {id: string; email?: string | null} | null
  profile?: {
    display_name: string | null
    stripe_customer_id: string | null
    subscription_tier: "free" | "pro" | "family"
  } | null
} = {}) {
  const profileUpdates: Array<Record<string, unknown>> = []

  const profilesTable = {
    select: vi.fn(() => ({
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: profile,
        error: profile ? null : {message: "not found"},
      }),
    })),
    update: vi.fn((values: Record<string, unknown>) => {
      profileUpdates.push(values)

      return {
        eq: vi.fn().mockResolvedValue({error: null}),
      }
    }),
  }

  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {user},
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return profilesTable
        }

        throw new Error(`Unexpected table: ${table}`)
      }),
    },
    profileUpdates,
  }
}

describe("POST /api/stripe/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_PRICE_PRO_MONTHLY = "price_monthly"
    process.env.STRIPE_PRICE_PRO_YEARLY = "price_yearly"
  })

  it("creates a customer when needed and returns a checkout URL", async () => {
    const {supabase, profileUpdates} = createMockSupabase()
    createClientMock.mockResolvedValue(supabase)

    const customersCreateMock = vi.fn().mockResolvedValue({id: CUSTOMER_ID})
    const sessionsCreateMock = vi.fn().mockResolvedValue({url: CHECKOUT_URL})

    getStripeMock.mockReturnValue({
      customers: {
        create: customersCreateMock,
      },
      checkout: {
        sessions: {
          create: sessionsCreateMock,
        },
      },
    })

    const response = await POST(
      new Request("http://localhost/api/stripe/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          plan: "monthly",
        }),
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({url: CHECKOUT_URL})
    expect(customersCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "aigul@example.com",
        metadata: {user_id: USER_ID},
      }),
    )
    expect(profileUpdates[0]).toEqual({
      stripe_customer_id: CUSTOMER_ID,
    })
    expect(sessionsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        client_reference_id: USER_ID,
        customer: CUSTOMER_ID,
        mode: "subscription",
        line_items: [{price: "price_monthly", quantity: 1}],
        metadata: {user_id: USER_ID, plan: "monthly"},
        subscription_data: {
          metadata: {user_id: USER_ID, plan: "monthly"},
        },
      }),
    )
    expect(captureServerEventMock).toHaveBeenCalledWith({
      distinctId: USER_ID,
      event: "checkout_started",
      properties: {
        plan: "monthly",
        price_id: "price_monthly",
      },
    })
  })

  it("rejects unauthenticated requests", async () => {
    const {supabase} = createMockSupabase({user: null})
    createClientMock.mockResolvedValue(supabase)

    const response = await POST(
      new Request("http://localhost/api/stripe/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          plan: "monthly",
        }),
      }),
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({error: "Unauthorized"})
  })
})
