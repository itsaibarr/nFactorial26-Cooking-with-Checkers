import { describe, expect, it } from "vitest"
import {
  buildEngineFallbackAnalysis,
  sanitizeCoachAnalysis,
} from "@/lib/coach/llm"
import type { CoachAnalysis, CoachGameContext } from "@/lib/coach/types"

const baseContext: CoachGameContext = {
  gameId: "2efc4b49-f0a2-4b77-b3a5-446db6af6935",
  language: "ru",
  playerColor: "white",
  playerLevel: "beginner",
  opponentLevel: "medium",
  result: "loss",
  sharpnessScore: 54,
  currentSharpness: 61,
  streakDays: 2,
  goal: "memory",
  accessibilityMode: false,
  sharpnessBreakdown: {
    accuracy: 52,
    speed: 71,
    blunderRate: 44,
    topThreeMatches: 1,
    playerMoves: 3,
    blunders: 2,
    averageMoveTimeMs: 1800,
  },
  moves: [
    {notation: "c3-b4", durationMs: 1100, side: "white"},
    {notation: "f6-g5", durationMs: null, side: "black"},
    {notation: "b4-a5", durationMs: 1400, side: "white"},
    {notation: "g5-f4", durationMs: null, side: "black"},
    {notation: "e3:g5", durationMs: 1900, side: "white"},
  ],
  criticalMoments: [
    {
      move_number: 2,
      notation: "b4-a5",
      type: "missed_tactic",
      eval_before: 40,
      eval_after: -180,
      swing: 220,
      best_move: "d2-e3",
    },
    {
      move_number: 3,
      notation: "e3:g5",
      type: "blunder",
      eval_before: -180,
      eval_after: -420,
      swing: 240,
      best_move: "c1-d2",
    },
  ],
}

describe("sanitizeCoachAnalysis", () => {
  it("falls back when the model ignores engine-selected critical moments", () => {
    const rawAnalysis: CoachAnalysis = {
      overall_quality: "developing",
      sharpness_score_for_this_game: 88,
      highlights: [
        {
          move_number: 1,
          type: "good_idea",
          what_you_did: "Вы уверенно начали партию.",
          what_to_consider: "Старайтесь продолжать в том же духе.",
        },
      ],
      key_lesson: "Смотрите на доску чуть шире.",
      encouragement: "Вы старались искать активную игру.",
    }

    const sanitized = sanitizeCoachAnalysis(rawAnalysis, baseContext)

    expect(sanitized.degraded).toBe(true)
    expect(sanitized.analysis).toEqual(buildEngineFallbackAnalysis(baseContext))
  })
})
