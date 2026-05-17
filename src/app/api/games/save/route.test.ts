import { beforeEach, describe, expect, it, vi } from "vitest"
import { updateSharpnessEma } from "@/lib/sharpness/compute"

const {
  createClientMock,
  captureServerEventMock,
  captureServerExceptionMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  captureServerEventMock: vi.fn().mockResolvedValue(undefined),
  captureServerExceptionMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}))

vi.mock("@/lib/posthog/server", () => ({
  captureServerEvent: captureServerEventMock,
  captureServerException: captureServerExceptionMock,
}))

import { POST } from "@/app/api/games/save/route"

const GAME_ID = "6c85489d-a0ec-4af7-b7e1-0f7c0f078f2f"
const USER_ID = "a6f33cfb-9b75-4c77-b902-1b38fcfceca1"

function createMockSupabase({
  playerColor = "white",
  profileSharpness = 50,
}: {
  playerColor?: "white" | "black"
  profileSharpness?: number
} = {}) {
  const gameUpdates: Array<Record<string, unknown>> = []
  const profileUpdates: Array<Record<string, unknown>> = []

  const gamesSelectChain = {
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: {
        id: GAME_ID,
        player_color: playerColor,
        opponent_level: "easy",
        started_at: "2026-05-17T10:00:00.000Z",
        result: null,
        end_reason: null,
        ended_at: null,
        sharpness_score: null,
        sharpness_breakdown: null,
      },
      error: null,
    }),
  }

  const profilesSelectChain = {
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: {
        current_sharpness: profileSharpness,
      },
      error: null,
    }),
  }

  const gamesUpdateChain = {
    eq: vi.fn().mockReturnThis(),
    error: null,
  }

  const profilesUpdateChain = {
    eq: vi.fn().mockReturnThis(),
    error: null,
  }

  const gamesTable = {
    select: vi.fn(() => gamesSelectChain),
    update: vi.fn((values: Record<string, unknown>) => {
      gameUpdates.push(values)
      return gamesUpdateChain
    }),
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
      if (table === "games") {
        return gamesTable
      }

      if (table === "profiles") {
        return profilesTable
      }

      throw new Error(`Unexpected table: ${table}`)
    }),
  }

  return {supabase, gameUpdates, profileUpdates}
}

describe("POST /api/games/save", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("persists a resignation as a loss and updates sharpness", async () => {
    const {supabase, gameUpdates, profileUpdates} = createMockSupabase()
    createClientMock.mockResolvedValue(supabase)

    const response = await POST(
      new Request("http://localhost/api/games/save", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          gameId: GAME_ID,
          moves: [
            {notation: "c3-b4", durationMs: 1_200},
            {notation: "f6-g5", durationMs: null},
            {notation: "b4-a5", durationMs: 900},
          ],
          termination: "resignation",
        }),
      }),
    )

    expect(response.status).toBe(200)

    const payload = (await response.json()) as {
      result: "win" | "loss" | "draw"
      endReason: string
      sharpnessScore: number
      currentSharpness: number
    }

    expect(payload.result).toBe("loss")
    expect(payload.endReason).toBe("resignation")
    expect(payload.currentSharpness).toBe(updateSharpnessEma(50, payload.sharpnessScore))
    expect(gameUpdates[0]).toMatchObject({
      result: "loss",
      end_reason: "resignation",
      sharpness_score: payload.sharpnessScore,
    })
    expect(profileUpdates[0]).toEqual({
      current_sharpness: payload.currentSharpness,
    })
    expect(captureServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: USER_ID,
        event: "game_completed",
        properties: expect.objectContaining({
          game_id: GAME_ID,
          result: "loss",
          end_reason: "resignation",
        }),
      }),
    )
  })

  it("rejects resignations before the player has made a move", async () => {
    const {supabase, gameUpdates, profileUpdates} = createMockSupabase()
    createClientMock.mockResolvedValue(supabase)

    const response = await POST(
      new Request("http://localhost/api/games/save", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          gameId: GAME_ID,
          moves: [],
          termination: "resignation",
        }),
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: "Play at least one move before resigning",
    })
    expect(gameUpdates).toHaveLength(0)
    expect(profileUpdates).toHaveLength(0)
  })

  it("rejects unfinished games when no terminal condition is provided", async () => {
    const {supabase, gameUpdates, profileUpdates} = createMockSupabase()
    createClientMock.mockResolvedValue(supabase)

    const response = await POST(
      new Request("http://localhost/api/games/save", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          gameId: GAME_ID,
          moves: [
            {notation: "c3-b4", durationMs: 1_200},
            {notation: "f6-g5", durationMs: null},
            {notation: "b4-a5", durationMs: 900},
          ],
        }),
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: "Game is not finished yet",
    })
    expect(gameUpdates).toHaveLength(0)
    expect(profileUpdates).toHaveLength(0)
  })
})
