import type { CoachGameContext } from "@/lib/coach/types"

export const COACH_SYSTEM_PROMPT = `You are Sharpki, a kind and patient Russian draughts (shashki) coach.
Your students are adults aged 45-75 who play shashki to keep their minds sharp.
Speak warmly, like a wise grandchild explaining gently to a beloved grandparent.
Use simple, encouraging language. Avoid jargon.
When the player makes a mistake, acknowledge what they were trying to do before suggesting a better move.
Treat the supplied move list and critical moments as ground truth. Never invent moves, lines, or evaluations that are not present in the input.
Always end with one specific encouragement that references something they did well.
Respond strictly as valid JSON matching this schema:
{
  "overall_quality": "excellent" | "good" | "developing" | "tough_game",
  "sharpness_score_for_this_game": number,
  "highlights": [
    {
      "move_number": number,
      "type": "best_move" | "good_idea" | "missed_tactic" | "blunder",
      "what_you_did": string,
      "what_to_consider": string
    }
  ],
  "key_lesson": string,
  "encouragement": string
}
Do not wrap the JSON in markdown.`

function formatMoveList(context: CoachGameContext) {
  if (context.moves.length === 0) {
    return "No recorded moves."
  }

  let playerMoveNumber = 0

  return context.moves
    .map((move) => {
      const isPlayerMove = move.side === context.playerColor
      if (isPlayerMove) {
        playerMoveNumber += 1
      }

      const moveLabel = isPlayerMove ? `player move ${playerMoveNumber}` : "opponent reply"
      return `- ${moveLabel}: ${move.notation}`
    })
    .join("\n")
}

export function buildCoachUserPrompt(context: CoachGameContext) {
  const allowedMoveNumbers = Array.from(
    new Set(
      context.moves
        .filter((move) => move.side === context.playerColor)
        .map((_, index) => index + 1),
    ),
  )

  return `Requested language: ${context.language}
Player level: ${context.playerLevel}
The student played as ${context.playerColor}. Opponent was the ${context.opponentLevel} AI bot.
Game result from the student's perspective: ${context.result}.
Sharpness score for this game: ${context.sharpnessScore}/100.
Student's current sharpness score: ${context.currentSharpness}/100.
Current streak: ${context.streakDays} days.
Student goal: ${context.goal ?? "not specified"}.
Accessibility mode: ${context.accessibilityMode ? "on" : "off"}.

Move list:
${formatMoveList(context)}

Critical moments identified by the engine (evals are from the student's perspective in centipawns; positive means student advantage):
${JSON.stringify(context.criticalMoments, null, 2)}

Sharpness breakdown:
${JSON.stringify(context.sharpnessBreakdown, null, 2)}

Rules for your response:
- Write every field in ${context.language}.
- Use the exact sharpness score ${context.sharpnessScore} for "sharpness_score_for_this_game".
- Every highlight.move_number must be one of these player move numbers: ${allowedMoveNumbers.join(", ")}.
- Refer to the actual move numbers from this game, not generic advice.
- Base every highlight on the supplied move list and critical moments.
- If accessibility mode is on, use short sentences and very plain wording.
- If a goal is provided, tailor the key lesson to that goal.`
}

export function buildCoachPrompts(context: CoachGameContext) {
  return {
    systemPrompt: COACH_SYSTEM_PROMPT,
    userPrompt: buildCoachUserPrompt(context),
  }
}
