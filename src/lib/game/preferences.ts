import { z } from "zod"

export const captureInputModeSchema = z.enum(["full_move", "step_by_step"])
export const boardThemeSchema = z.enum(["classic", "walnut", "slate", "forest"])

export const gameplayPreferencesSchema = z.object({
  showLegalMoves: z.boolean(),
  showRecommendedMoves: z.boolean(),
  captureInputMode: captureInputModeSchema,
  boardTheme: boardThemeSchema,
})

export const storedGameplayPreferencesSchema = z.object({
  show_legal_moves: z.boolean(),
  show_recommended_moves: z.boolean(),
  capture_input_mode: captureInputModeSchema,
  board_theme: boardThemeSchema,
})

export type CaptureInputMode = z.infer<typeof captureInputModeSchema>
export type BoardTheme = z.infer<typeof boardThemeSchema>
export type GameplayPreferences = z.infer<typeof gameplayPreferencesSchema>
export type StoredGameplayPreferences = z.infer<typeof storedGameplayPreferencesSchema>

export const DEFAULT_GAMEPLAY_PREFERENCES = Object.freeze({
  showLegalMoves: true,
  showRecommendedMoves: false,
  captureInputMode: "full_move",
  boardTheme: "classic",
} satisfies GameplayPreferences)

export function mapStoredGameplayPreferences(
  preferences: StoredGameplayPreferences | null | undefined,
): GameplayPreferences {
  if (!preferences) {
    return DEFAULT_GAMEPLAY_PREFERENCES
  }

  return {
    showLegalMoves: preferences.show_legal_moves,
    showRecommendedMoves: preferences.show_recommended_moves,
    captureInputMode: preferences.capture_input_mode,
    boardTheme: preferences.board_theme,
  }
}
