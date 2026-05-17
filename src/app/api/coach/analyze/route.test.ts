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

type RateLimitRow = {
  user_id: string
  action: string
  count: number
  window_start: string
}

function matchesFilters(
  row: Record<string, unknown>,
  filters: Record<string, unknown>,
) {
  return Object.entries(filters).every(([key, value]) => row[key] === value)
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
          data: [{allowed: false, new_count: typeof existingRow?.count === "number" ? existingRow.count : 0}],
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
  analyses = [],
  rateLimits = [],
  subscriptionTier = "free",
}: {
  analyses?: Array<Record<string, unknown>>
  rateLimits?: RateLimitRow[]
  subscriptionTier?: "free" | "pro" | "family"
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
      sharpness_breakdown: {
        accuracy: 80,
        speed: 76,
        blunderRate: 88,
        topThreeMatches: 2,
        playerMoves: 3,
        blunders: 1,
        averageMoveTimeMs: 1200,
      },
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
      subscription_tier: subscriptionTier,
      goal: "memory",
      accessibility_mode: true,
    },
  ]

  const rateLimitRows = [...rateLimits]
  const analysisRows = [...analyses]
  const insertedRateLimits: RateLimitRow[] = []
  const upsertedAnalyses: Array<Record<string, unknown>> = []
  const rpc = createRateLimitRpcMock(rateLimitRows, insertedRateLimits)

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
          select: vi.fn(() => {
            const filters: Record<string, unknown> = {}

            return {
              eq(key: string, value: unknown) {
                filters[key] = value
                return this
              },
              async maybeSingle() {
                const row = rateLimitRows.find((candidate) => matchesFilters(candidate, filters)) ?? null

                return {
                  data: row ? {count: row.count} : null,
                  error: null,
                }
              },
            }
          }),
          update: vi.fn((values: {count?: number}) => {
            const filters: Record<string, unknown> = {}

            return {
              eq(key: string, value: unknown) {
                filters[key] = value

                if (Object.keys(filters).length < 3) {
                  return this
                }

                const row = rateLimitRows.find((candidate) => matchesFilters(candidate, filters))
                if (row && typeof values.count === "number") {
                  row.count = values.count
                }

                return Promise.resolve({error: null})
              },
            }
          }),
          delete: vi.fn(() => {
            const filters: Record<string, unknown> = {}

            return {
              eq(key: string, value: unknown) {
                filters[key] = value

                if (Object.keys(filters).length < 3) {
                  return this
                }

                const rowIndex = rateLimitRows.findIndex((candidate) =>
                  matchesFilters(candidate, filters),
                )
                if (rowIndex >= 0) {
                  rateLimitRows.splice(rowIndex, 1)
                }

                return Promise.resolve({error: null})
              },
            }
          }),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    }),
    rpc,
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
        degraded: false,
        failureReason: null,
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
          model: "accounts/fireworks/models/qwen3p6-plus",
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
    await expect(response.json()).resolves.toEqual({
      ...cachedPayload,
      degraded: false,
    })
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
      error: "You have already used today's free AI analysis.",
      triggerReason: "analysis_limit",
      limit: 1,
      showPaywall: true,
    })
    expect(getCoachAnalysisMock).not.toHaveBeenCalled()
    expect(insertedRateLimits).toHaveLength(0)
    expect(upsertedAnalyses).toHaveLength(0)

    vi.useRealTimers()
  })

  it("persists a degraded fallback and releases the reserved free-tier slot", async () => {
    const {supabase, rateLimitRows, upsertedAnalyses} = createMockSupabase()
    createClientMock.mockResolvedValue(supabase)

    getCoachAnalysisMock.mockResolvedValue({
      analysis: {
        overall_quality: "tough_game",
        sharpness_score_for_this_game: 81,
        highlights: [
          {
            move_number: 1,
            type: "missed_tactic",
            what_you_did: "Вы начали активно, но позиция быстро осложнилась.",
            what_to_consider: "Стоило ещё раз проверить самый опасный ответ соперника.",
          },
        ],
        key_lesson: "Когда позиция становится острой, сначала ищите самый forcing-ответ соперника.",
        encouragement: "Вы довели партию до конца, а это уже даёт полезный материал для роста.",
      },
      model: "engine-only-fallback",
      tokensIn: null,
      tokensOut: null,
      costUsd: null,
      degraded: true,
      failureReason: "timeout",
    })

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
    await expect(response.json()).resolves.toMatchObject({
      degraded: true,
      failureReason: "timeout",
    })
    expect(rateLimitRows).toHaveLength(0)
    expect(upsertedAnalyses[0]).toMatchObject({
      game_id: GAME_ID,
      model: "engine-only-fallback",
    })
    expect(captureServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: USER_ID,
        event: "ai_analysis_degraded",
        properties: expect.objectContaining({
          game_id: GAME_ID,
          language: "ru",
          failure_reason: "timeout",
        }),
      }),
    )
  })

  it("does not reuse a cached fallback row as a fresh analysis", async () => {
    const {supabase, upsertedAnalyses, insertedRateLimits} = createMockSupabase({
      analyses: [
        {
          game_id: GAME_ID,
          language: "ru",
          payload: {
            overall_quality: "tough_game",
            sharpness_score_for_this_game: 81,
            highlights: [
              {
                move_number: 1,
                type: "missed_tactic",
                what_you_did: "Сработал только быстрый fallback.",
                what_to_consider: "Нужно попробовать полноценный запрос ещё раз.",
              },
            ],
            key_lesson: "Fallback should not be treated as the final answer.",
            encouragement: "Даже быстрый разбор полезнее пустого экрана.",
          },
          created_at: new Date().toISOString(),
          model: "engine-only-fallback",
        },
      ],
    })
    createClientMock.mockResolvedValue(supabase)

    getCoachAnalysisMock.mockResolvedValue({
      analysis: {
        overall_quality: "good",
        sharpness_score_for_this_game: 81,
        highlights: [
          {
            move_number: 2,
            type: "good_idea",
            what_you_did: "Вы нашли полезное продолжение.",
            what_to_consider: "Теперь закрепляйте эту идею точным расчётом.",
          },
        ],
        key_lesson: "Повторный запрос должен перезаписать fallback.",
        encouragement: "Во второй раз разбор дошёл до полноценного ответа.",
      },
      model: "accounts/fireworks/models/qwen3p6-plus",
      tokensIn: 1400,
      tokensOut: 380,
      costUsd: 0.00211,
      degraded: false,
      failureReason: null,
    })

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
    expect(getCoachAnalysisMock).toHaveBeenCalledTimes(1)
    expect(insertedRateLimits).toHaveLength(1)
    expect(upsertedAnalyses[0]).toMatchObject({
      game_id: GAME_ID,
      model: "accounts/fireworks/models/qwen3p6-plus",
    })
  })

  it("allows the 10th paid analysis in the hour and blocks the 11th without a paywall", async () => {
    const {supabase, insertedRateLimits, upsertedAnalyses, rateLimitRows} = createMockSupabase({
      subscriptionTier: "pro",
      rateLimits: [
        {
          user_id: USER_ID,
          action: "ai_analysis",
          count: 9,
          window_start: new Date(
            Date.UTC(2026, 4, 17, 10, 0, 0, 0),
          ).toISOString(),
        },
      ],
    })
    createClientMock.mockResolvedValue(supabase)

    getCoachAnalysisMock.mockResolvedValue({
      analysis: {
        overall_quality: "good",
        sharpness_score_for_this_game: 81,
        highlights: [
          {
            move_number: 3,
            type: "good_idea",
            what_you_did: "You kept the initiative.",
            what_to_consider: "Keep looking for forcing captures.",
          },
        ],
        key_lesson: "Keep converting activity into direct threats.",
        encouragement: "You found practical attacking chances.",
      },
      model: "accounts/fireworks/models/qwen3p6-plus",
      tokensIn: 1200,
      tokensOut: 300,
      costUsd: 0.00201,
      degraded: false,
      failureReason: null,
    })

    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-17T10:20:00.000Z"))

    const tenthResponse = await POST(
      new Request("http://localhost/api/coach/analyze", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          gameId: GAME_ID,
          language: "ru",
        }),
      }),
    )

    expect(tenthResponse.status).toBe(200)
    expect(upsertedAnalyses).toHaveLength(1)
    expect(rateLimitRows[0]?.count).toBe(10)
    expect(insertedRateLimits).toHaveLength(0)

    const eleventhResponse = await POST(
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

    expect(eleventhResponse.status).toBe(429)
    await expect(eleventhResponse.json()).resolves.toEqual({
      error: "You have already used the AI analysis limit for the current hour.",
      triggerReason: "analysis_limit",
      limit: 10,
      showPaywall: false,
    })
    expect(upsertedAnalyses).toHaveLength(1)

    vi.useRealTimers()
  })
})
