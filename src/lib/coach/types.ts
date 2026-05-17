import type { DifficultyLevel, PieceColor } from "@/lib/engine/types"
import type { PlayerGameResult, RecordedMove } from "@/lib/game/session"
import { z } from "zod"

export const coachLanguageSchema = z.enum(["ru", "en"])
export type CoachLanguage = z.infer<typeof coachLanguageSchema>

export const coachOverallQualitySchema = z.enum([
  "excellent",
  "good",
  "developing",
  "tough_game",
])
export type CoachOverallQuality = z.infer<typeof coachOverallQualitySchema>

export const coachHighlightTypeSchema = z.enum([
  "best_move",
  "good_idea",
  "missed_tactic",
  "blunder",
])
export type CoachHighlightType = z.infer<typeof coachHighlightTypeSchema>

export const coachHighlightSchema = z.object({
  move_number: z.number().int().min(1),
  type: coachHighlightTypeSchema,
  what_you_did: z.string().trim().min(1).max(600),
  what_to_consider: z.string().trim().min(1).max(600),
})
export type CoachHighlight = z.infer<typeof coachHighlightSchema>

export const coachAnalysisSchema = z.object({
  overall_quality: coachOverallQualitySchema,
  sharpness_score_for_this_game: z.number().int().min(0).max(100),
  highlights: z.array(coachHighlightSchema).min(1).max(5),
  key_lesson: z.string().trim().min(1).max(600),
  encouragement: z.string().trim().min(1).max(600),
})
export type CoachAnalysis = z.infer<typeof coachAnalysisSchema>

export const criticalMomentSchema = z.object({
  move_number: z.number().int().min(1),
  notation: z.string().trim().min(1).max(64),
  type: coachHighlightTypeSchema,
  eval_before: z.number(),
  eval_after: z.number(),
  swing: z.number().nonnegative(),
  best_move: z.string().trim().min(1).max(64).nullable(),
})
export type CriticalMoment = z.infer<typeof criticalMomentSchema>

export interface CoachGameContext {
  readonly gameId: string
  readonly language: CoachLanguage
  readonly playerColor: PieceColor
  readonly playerLevel: "beginner" | "intermediate" | "confident"
  readonly opponentLevel: DifficultyLevel
  readonly result: PlayerGameResult
  readonly sharpnessScore: number
  readonly currentSharpness: number
  readonly streakDays: number
  readonly moves: readonly RecordedMove[]
  readonly criticalMoments: readonly CriticalMoment[]
}

export interface CoachAnalysisResult {
  readonly analysis: CoachAnalysis
  readonly model: string
  readonly tokensIn: number | null
  readonly tokensOut: number | null
  readonly costUsd: number | null
}
