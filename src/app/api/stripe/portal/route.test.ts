import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  createClientMock,
  getStripeMock,
  captureServerExceptionMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getStripeMock: vi.fn(),
  captureServerExceptionMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}))

vi.mock("@/lib/stripe/client", () => ({
  getStripe: getStripeMock,
}))

vi.mock("@/lib/posthog/server", () => ({
  captureServerException: captureServerExceptionMock,
}))

vi.mock("@/lib/site", () => ({
  getAppUrl: () => "http://localhost:3000",
}))

import { POST } from "@/app/api/stripe/portal/route"

describe("POST /api/stripe/portal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns a billing portal URL for an authenticated subscriber", async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "8d7d3950-f351-45e0-a04c-c59b0e4faefa",
            },
          },
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              stripe_customer_id: "cus_123",
            },
            error: null,
          }),
        })),
      })),
    })

    const portalCreateMock = vi.fn().mockResolvedValue({
      url: "https://billing.stripe.com/session/test",
    })

    getStripeMock.mockReturnValue({
      billingPortal: {
        sessions: {
          create: portalCreateMock,
        },
      },
    })

    const response = await POST()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      url: "https://billing.stripe.com/session/test",
    })
    expect(portalCreateMock).toHaveBeenCalledWith({
      customer: "cus_123",
      return_url: "http://localhost:3000/settings?portal=returned",
    })
  })
})
