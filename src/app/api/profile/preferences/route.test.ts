import { beforeEach, describe, expect, it, vi } from "vitest"

const {createClientMock} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}))
const {captureServerExceptionMock} = vi.hoisted(() => ({
  captureServerExceptionMock: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}))
vi.mock("@/lib/posthog/server", () => ({
  captureServerException: captureServerExceptionMock,
}))

import { POST } from "@/app/api/profile/preferences/route"

const USER_ID = "4f5bd3df-c898-483c-a4b4-6f18dad5a3a7"

function createMockSupabase() {
  const profileUpdates: Array<Record<string, unknown>> = []

  const profilesSelectChain = {
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: {
        show_legal_moves: true,
        show_recommended_moves: false,
        capture_input_mode: "full_move",
        board_theme: "classic",
      },
      error: null,
    }),
  }

  const profilesUpdateChain = {
    eq: vi.fn().mockResolvedValue({error: null}),
  }

  const profilesTable = {
    select: vi.fn(() => profilesSelectChain),
    update: vi.fn((values: Record<string, unknown>) => {
      profileUpdates.push(values)
      return profilesUpdateChain
    }),
  }

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: USER_ID,
          },
        },
      }),
    },
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return profilesTable
      }

      throw new Error(`Unexpected table: ${table}`)
    }),
  }

  return {supabase, profileUpdates}
}

describe("POST /api/profile/preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when the user is not signed in", async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: null,
          },
        }),
      },
    })

    const response = await POST(
      new Request("http://localhost/api/profile/preferences", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          showLegalMoves: false,
          showRecommendedMoves: true,
          captureInputMode: "step_by_step",
          boardTheme: "walnut",
        }),
      }),
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({error: "Unauthorized"})
  })

  it("returns 400 for an invalid payload", async () => {
    const {supabase} = createMockSupabase()
    createClientMock.mockResolvedValue(supabase)

    const response = await POST(
      new Request("http://localhost/api/profile/preferences", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          showLegalMoves: "nope",
          showRecommendedMoves: false,
          captureInputMode: "step_by_step",
          boardTheme: "walnut",
        }),
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({error: "Invalid payload"})
  })

  it("updates the authenticated user's gameplay preferences", async () => {
    const {supabase, profileUpdates} = createMockSupabase()
    createClientMock.mockResolvedValue(supabase)

    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-17T20:40:00.000Z"))

    const response = await POST(
      new Request("http://localhost/api/profile/preferences", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          showLegalMoves: false,
          showRecommendedMoves: true,
          captureInputMode: "step_by_step",
          boardTheme: "walnut",
        }),
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      showLegalMoves: false,
      showRecommendedMoves: true,
      captureInputMode: "step_by_step",
      boardTheme: "walnut",
    })
    expect(profileUpdates[0]).toMatchObject({
      show_legal_moves: false,
      show_recommended_moves: true,
      capture_input_mode: "step_by_step",
      board_theme: "walnut",
      updated_at: "2026-05-17T20:40:00.000Z",
    })

    vi.useRealTimers()
  })
})
