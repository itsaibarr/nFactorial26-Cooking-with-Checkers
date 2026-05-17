import { NextResponse } from "next/server"
import { captureServerException } from "@/lib/posthog/server"
import { gameplayPreferencesSchema } from "@/lib/game/preferences"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: {user},
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({error: "Unauthorized"}, {status: 401})
  }

  const body = await request.json().catch(() => null)
  const parsed = gameplayPreferencesSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({error: "Invalid payload"}, {status: 400})
  }

  try {
    const {error} = await supabase
      .from("profiles")
      .update({
        show_legal_moves: parsed.data.showLegalMoves,
        show_recommended_moves: parsed.data.showRecommendedMoves,
        capture_input_mode: parsed.data.captureInputMode,
        board_theme: parsed.data.boardTheme,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (error) {
      throw error
    }

    return NextResponse.json(parsed.data)
  } catch (error) {
    await captureServerException(error, user.id, {
      stage: "profile_preferences_update",
    }).catch(() => undefined)

    return NextResponse.json({error: "Failed to update preferences"}, {status: 500})
  }
}
