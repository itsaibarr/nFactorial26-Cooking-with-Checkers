import { describe, expect, it } from "vitest"
import { buildCoachPrompts, COACH_SYSTEM_PROMPT } from "@/lib/coach/prompt"
import type { CoachGameContext } from "@/lib/coach/types"

const baseContext: CoachGameContext = {
  gameId: "9b68f6ec-8f6e-45f6-8547-6c16e7e6fc1f",
  language: "ru",
  playerColor: "white",
  playerLevel: "beginner",
  opponentLevel: "easy",
  result: "win",
  sharpnessScore: 78,
  currentSharpness: 64,
  streakDays: 3,
  goal: "memory",
  accessibilityMode: true,
  sharpnessBreakdown: {
    accuracy: 78,
    speed: 64,
    blunderRate: 82,
    topThreeMatches: 1,
    playerMoves: 1,
    blunders: 0,
    averageMoveTimeMs: 1200,
  },
  moves: [
    {notation: "c3-b4", durationMs: 1200, side: "white"},
    {notation: "f6-g5", durationMs: null, side: "black"},
  ],
  criticalMoments: [
    {
      move_number: 1,
      notation: "c3-b4",
      type: "good_idea",
      eval_before: 0,
      eval_after: 80,
      swing: 80,
      best_move: "c3-b4",
    },
  ],
}

describe("buildCoachPrompts", () => {
  it("keeps the system prompt byte-stable", () => {
    const first = buildCoachPrompts(baseContext)
    const second = buildCoachPrompts({...baseContext, language: "en"})

    expect(first.systemPrompt).toBe(COACH_SYSTEM_PROMPT)
    expect(second.systemPrompt).toBe(COACH_SYSTEM_PROMPT)
    expect(first.systemPrompt).toBe(second.systemPrompt)
  })

  it("moves dynamic language and game data into the user prompt", () => {
    const {userPrompt} = buildCoachPrompts({
      ...baseContext,
      language: "en",
      sharpnessScore: 84,
    })

    expect(userPrompt).toContain("Requested language: en")
    expect(userPrompt).toContain("Sharpness score for this game: 84/100.")
    expect(userPrompt).toContain("Student goal: memory.")
    expect(userPrompt).toContain("Accessibility mode: on.")
    expect(userPrompt).toContain('"blunderRate": 82')
    expect(userPrompt).toContain('"move_number": 1')
  })
})
