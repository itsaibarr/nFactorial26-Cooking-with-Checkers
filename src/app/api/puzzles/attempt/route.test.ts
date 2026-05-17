import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  createClientMock,
  captureServerEventMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  captureServerEventMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}))

vi.mock("@/lib/posthog/server", () => ({
  captureServerEvent: captureServerEventMock,
}))

import { POST } from "@/app/api/puzzles/attempt/route"

const PUZZLE_ID = "17e86ecc-0b33-4ab6-8c58-3c2b49df6ff5"
const USER_ID = "6d4d5a06-a77e-40d6-8861-3dab9b4e7abc"

type RateLimitRow = {
  user_id: string
  action: string
  count: number
  window_start: string
}

function createRateLimitRpcMock(
  rateLimitRows: RateLimitRow[],
  insertedRateLimits: RateLimitRow[],
) {
  return vi.fn(
    async (
      _fn: string,
      args: {
        p_user_id: string
        p_action: string
        p_window_start: string
        p_limit: number
      },
    ) => {
      const existingRow = rateLimitRows.find(
        (row) =>
          row.user_id === args.p_user_id &&
          row.action === args.p_action &&
          row.window_start === args.p_window_start,
      )

      if (args.p_limit <= 0) {
        return {
          data: [
            {
              allowed: false,
              new_count: typeof existingRow?.count === "number" ? existingRow.count : 0,
            },
          ],
          error: null,
        }
      }

      if (!existingRow) {
        const insertedRow = {
          user_id: args.p_user_id,
          action: args.p_action,
          count: 1,
          window_start: args.p_window_start,
        }
        rateLimitRows.push(insertedRow)
        insertedRateLimits.push(insertedRow)

        return {
          data: [{allowed: true, new_count: 1}],
          error: null,
        }
      }

      if (typeof existingRow.count !== "number" || existingRow.count >= args.p_limit) {
        return {
          data: [
            {
              allowed: false,
              new_count: typeof existingRow.count === "number" ? existingRow.count : 0,
            },
          ],
          error: null,
        }
      }

      existingRow.count += 1

      return {
        data: [{allowed: true, new_count: existingRow.count}],
        error: null,
      }
    },
  )
}

function createMockSupabase({
  profileLanguage = "ru",
  subscriptionTier = "free",
  rateLimits = [],
}: {
  profileLanguage?: "ru" | "en"
  subscriptionTier?: "free" | "pro" | "family"
  rateLimits?: RateLimitRow[]
} = {}) {
  const attemptUpserts: Array<Record<string, unknown>> = []
  const profileUpdates: Array<Record<string, unknown>> = []
  const rateLimitRows = [...rateLimits]
  const insertedRateLimits: RateLimitRow[] = []

  const profilesTable = {
    select: vi.fn(() => ({
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          streak_days: 1,
          last_activity_date: "2026-05-16",
          language: profileLanguage,
          subscription_tier: subscriptionTier,
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

  const puzzleAttemptsTable = {
    upsert: vi.fn((values: Record<string, unknown>) => {
      attemptUpserts.push(values)
      return Promise.resolve({error: null})
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

      if (table === "puzzle_attempts") {
        return puzzleAttemptsTable
      }

      throw new Error(`Unexpected table: ${table}`)
    }),
    rpc: createRateLimitRpcMock(rateLimitRows, insertedRateLimits),
  }

  return {supabase, attemptUpserts, profileUpdates, insertedRateLimits}
}

describe("POST /api/puzzles/attempt", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("records a solved puzzle, reserves a slot, and advances the streak", async () => {
    const {supabase, attemptUpserts, profileUpdates, insertedRateLimits} = createMockSupabase()
    createClientMock.mockResolvedValue(supabase)

    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-17T09:00:00.000Z"))

    const response = await POST(
      new Request("http://localhost/api/puzzles/attempt", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          puzzleId: PUZZLE_ID,
          solved: true,
          timeTakenSeconds: 42,
          attemptsUsed: 2,
        }),
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      streakDays: 2,
    })
    expect(insertedRateLimits).toHaveLength(1)
    expect(attemptUpserts[0]).toMatchObject({
      user_id: USER_ID,
      puzzle_id: PUZZLE_ID,
      solved: true,
      attempts_used: 2,
      time_taken_seconds: 42,
    })
    expect(profileUpdates[0]).toEqual({
      streak_days: 2,
      last_activity_date: "2026-05-17",
    })
    expect(captureServerEventMock).toHaveBeenCalledWith({
      distinctId: USER_ID,
      event: "puzzle_solved",
      properties: {
        puzzle_id: PUZZLE_ID,
        time_taken_seconds: 42,
        attempts_used: 2,
        streak_days: 2,
      },
    })

    vi.useRealTimers()
  })

  it("returns 429 when the free puzzle limit is already exhausted", async () => {
    const {supabase, attemptUpserts, profileUpdates, insertedRateLimits} = createMockSupabase({
      profileLanguage: "en",
      rateLimits: [
        {
          user_id: USER_ID,
          action: "puzzle",
          count: 1,
          window_start: new Date(
            Date.UTC(2026, 4, 17, 0, 0, 0, 0),
          ).toISOString(),
        },
      ],
    })
    createClientMock.mockResolvedValue(supabase)

    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-17T09:00:00.000Z"))

    const response = await POST(
      new Request("http://localhost/api/puzzles/attempt", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          puzzleId: PUZZLE_ID,
          solved: true,
          timeTakenSeconds: 42,
          attemptsUsed: 2,
        }),
      }),
    )

    expect(response.status).toBe(429)
    await expect(response.json()).resolves.toEqual({
      error: "You have already used today's free puzzle limit.",
      triggerReason: "puzzle_limit",
      limit: 1,
      showPaywall: true,
    })
    expect(attemptUpserts).toHaveLength(0)
    expect(profileUpdates).toHaveLength(0)
    expect(insertedRateLimits).toHaveLength(0)
    expect(captureServerEventMock).not.toHaveBeenCalled()

    vi.useRealTimers()
  })
})
