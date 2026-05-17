import { beforeEach, describe, expect, it, vi } from "vitest"
import { coachAnalysisSchema, type CoachGameContext } from "@/lib/coach/types"

const {
  createClientMock,
  getCoachAnalysisMock,
  captureServerEventMock,
  captureServerExceptionMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getCoachAnalysisMock: vi.fn(),
  captureServerEventMock: vi.fn().mockResolvedValue(undefined),
  captureServerExceptionMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}))

vi.mock("@/lib/coach/llm", () => ({
  getCoachAnalysis: getCoachAnalysisMock,
}))

vi.mock("@/lib/posthog/server", () => ({
  captureServerEvent: captureServerEventMock,
  captureServerException: captureServerExceptionMock,
}))

import { POST } from "@/app/api/coach/analyze/route"

const GAME_ID = "4653b5d0-f865-4b75-a2c0-6f1fd70f7f7d"
const USER_ID = "ce75887a-3195-4cf8-ae8f-c2e5c206381c"

function matchesFilters(
  row: Record<string, unknown>,
  filters: Record<string, unknown>,
) {
  return Object.entries(filters).every(([key, value]) => row[key] === value)
}

function createUpdateChain<Row extends Record<string, unknown>>(
  rows: Row[],
  values: Partial<Row>,
) {
  const filters: Record<string, unknown> = {}

  return {
    eq(key: string, value: unknown) {
      filters[key] = value
      return this
    },
    then(resolve: (value: {error: null}) => unknown) {
      const row = rows.find((candidate) => matchesFilters(candidate, filters))
      if (row) {
        Object.assign(row, values)
      }

      resolve({error: null})
    },
  }
}

function createSelectChain<Row extends Record<string, unknown>>(rows: readonly Row[]) {
  const filters: Record<string, unknown> = {}

  return {
    eq(key: string, value: unknown) {
      filters[key] = value
      return this
    },
    async single() {
      const row = rows.find((candidate) => matchesFilters(candidate, filters)) ?? null
      return {
        data: row,
        error: row ? null : {message: "not found"},
      }
    },
    async maybeSingle() {
      return {
        data: rows.find((candidate) => matchesFilters(candidate, filters)) ?? null,
        error: null,
      }
    },
  }
}

function createMockSupabase({
  analyses = [],
  rateLimits = [],
}: {
  analyses?: Array<Record<string, unknown>>
  rateLimits?: Array<Record<string, unknown>>
} = {}) {
  const games = [
    {
      id: GAME_ID,
      user_id: USER_ID,
      player_color: "white",
      opponent_level: "easy",
      moves: [
        {notation: "c3-b4", durationMs: 1200, side: "white"},
        {notation: "f6-g5", durationMs: null, side: "black"},
        {notation: "b4-a5", durationMs: 900, side: "white"},
        {notation: "g5-f4", durationMs: null, side: "black"},
        {notation: "e3:g5", durationMs: 1500, side: "white"},
      ],
      result: "win",
      sharpness_score: 81,
      ended_at: "2026-05-17T10:05:00.000Z",
    },
  ]

  const profiles = [
    {
      id: USER_ID,
      language: "ru",
      level: "beginner",
      current_sharpness: 67,
      streak_days: 4,
      subscription_tier: "free",
    },
  ]

  const rateLimitRows = [...rateLimits]
  const analysisRows = [...analyses]
  const insertedRateLimits: Array<Record<string, unknown>> = []
  const upsertedAnalyses: Array<Record<string, unknown>> = []

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
        return {
          select: vi.fn(() => createSelectChain(games)),
        }
      }

      if (table === "profiles") {
        return {
          select: vi.fn(() => createSelectChain(profiles)),
        }
      }

      if (table === "game_analyses") {
        return {
          select: vi.fn(() => createSelectChain(analysisRows)),
          upsert: vi.fn((values: Record<string, unknown>) => {
            upsertedAnalyses.push(values)
            const existing = analysisRows.find(
              (row) =>
                row.game_id === values.game_id && row.language === values.language,
            )

            if (existing) {
              Object.assign(existing, values)
            } else {
              analysisRows.push(values)
            }

            return Promise.resolve({error: null})
          }),
        }
      }

      if (table === "rate_limits") {
        return {
          select: vi.fn(() => createSelectChain(rateLimitRows)),
          insert: vi.fn((values: Record<string, unknown>) => {
            insertedRateLimits.push(values)
            rateLimitRows.push(values)
            return Promise.resolve({error: null})
          }),
          update: vi.fn((values: Record<string, unknown>) =>
            createUpdateChain(rateLimitRows, values),
          ),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    }),
  }

  return {
    supabase,
    analysisRows,
    rateLimitRows,
    insertedRateLimits,
    upsertedAnalyses,
  }
}

describe("POST /api/coach/analyze", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("generates and persists a fresh analysis", async () => {
    const {supabase, insertedRateLimits, upsertedAnalyses} = createMockSupabase()
    createClientMock.mockResolvedValue(supabase)

    getCoachAnalysisMock.mockImplementation(
      async (context: CoachGameContext) => ({
        analysis: {
          overall_quality: "good",
          sharpness_score_for_this_game: context.sharpnessScore,
          highlights: [
            {
              move_number: context.criticalMoments[0]?.move_number ?? 1,
              type: "good_idea",
              what_you_did: "Вы захватили инициативу.",
              what_to_consider: "Продолжайте искать такие активные решения.",
            },
          ],
          key_lesson: "Ищите активные продолжения после выхода в центр.",
          encouragement: "Вы хорошо начали партию и не испугались осложнений.",
        },
        model: "accounts/fireworks/models/qwen3p6-plus",
        tokensIn: 1500,
        tokensOut: 420,
        costUsd: 0.00239,
      }),
    )

    const response = await POST(
      new Request("http://localhost/api/coach/analyze", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          gameId: GAME_ID,
        }),
      }),
    )

    expect(response.status).toBe(200)

    const payload = coachAnalysisSchema.parse(await response.json())
    expect(payload.highlights[0]?.move_number).toBeGreaterThanOrEqual(1)
    expect(insertedRateLimits).toHaveLength(1)
    expect(upsertedAnalyses[0]).toMatchObject({
      game_id: GAME_ID,
      user_id: USER_ID,
      language: "ru",
      model: "accounts/fireworks/models/qwen3p6-plus",
      tokens_in: 1500,
      tokens_out: 420,
      cost_usd: 0.00239,
    })
    expect(captureServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: USER_ID,
        event: "ai_analysis_completed",
        properties: expect.objectContaining({
          game_id: GAME_ID,
          language: "ru",
          tokens_in: 1500,
          tokens_out: 420,
          cost_usd: 0.00239,
        }),
      }),
    )
  })

  it("returns a fresh cached analysis without calling Fireworks again", async () => {
    const cachedPayload = {
      overall_quality: "excellent",
      sharpness_score_for_this_game: 81,
      highlights: [
        {
          move_number: 2,
          type: "best_move",
          what_you_did: "Вы нашли сильное продолжение.",
          what_to_consider: "После таких ходов ищите способ сохранить темп.",
        },
      ],
      key_lesson: "Выигрыш пришёл после точного развития инициативы.",
      encouragement: "Вы хорошо заметили момент для атаки.",
    }

    const {supabase, upsertedAnalyses, insertedRateLimits} = createMockSupabase({
      analyses: [
        {
          game_id: GAME_ID,
          language: "ru",
          payload: cachedPayload,
          created_at: new Date().toISOString(),
        },
      ],
    })
    createClientMock.mockResolvedValue(supabase)

    const response = await POST(
      new Request("http://localhost/api/coach/analyze", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          gameId: GAME_ID,
        }),
      }),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(cachedPayload)
    expect(getCoachAnalysisMock).not.toHaveBeenCalled()
    expect(upsertedAnalyses).toHaveLength(0)
    expect(insertedRateLimits).toHaveLength(0)
    expect(captureServerEventMock).not.toHaveBeenCalled()
  })

  it("returns 429 when the free tier limit is already exhausted", async () => {
    const {supabase, insertedRateLimits, upsertedAnalyses} = createMockSupabase({
      rateLimits: [
        {
          user_id: USER_ID,
          action: "ai_analysis",
          count: 1,
          window_start: new Date(
            Date.UTC(2026, 4, 17, 0, 0, 0, 0),
          ).toISOString(),
        },
      ],
    })
    createClientMock.mockResolvedValue(supabase)

    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-17T10:20:00.000Z"))

    const response = await POST(
      new Request("http://localhost/api/coach/analyze", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          gameId: GAME_ID,
          language: "en",
        }),
      }),
    )

    expect(response.status).toBe(429)
    await expect(response.json()).resolves.toEqual({
      error: "You have already used the AI analysis limit for the current window.",
      triggerReason: "analysis_limit_reached",
      limit: 1,
    })
    expect(getCoachAnalysisMock).not.toHaveBeenCalled()
    expect(insertedRateLimits).toHaveLength(0)
    expect(upsertedAnalyses).toHaveLength(0)

    vi.useRealTimers()
  })
})
