/**
 * Streak advancement logic.
 *
 * Rules:
 *  - Same day  → no change (already counted)
 *  - Yesterday → increment streak_days by 1
 *  - Any gap   → reset streak_days to 1
 *
 * Pro freeze (burn streak_freezes_remaining on a single missed day)
 * is a Phase-6 enhancement; for now the reset is hard.
 */

export interface StreakAdvanceInput {
  currentStreakDays: number
  lastActivityDate: string | null // ISO date 'YYYY-MM-DD' (UTC)
  today: string // ISO date 'YYYY-MM-DD' (UTC)
}

export interface StreakAdvanceResult {
  newStreakDays: number
  newLastActivityDate: string
  /** true when the profile row should be updated */
  changed: boolean
}

export function advanceStreak({
  currentStreakDays,
  lastActivityDate,
  today,
}: StreakAdvanceInput): StreakAdvanceResult {
  // Already active today – idempotent.
  if (lastActivityDate === today) {
    return {
      newStreakDays: currentStreakDays,
      newLastActivityDate: today,
      changed: false,
    }
  }

  const yesterdayStr = getYesterdayDateString(today)

  if (lastActivityDate === yesterdayStr) {
    return {
      newStreakDays: currentStreakDays + 1,
      newLastActivityDate: today,
      changed: true,
    }
  }

  // Gap of 2+ days → reset.
  return {
    newStreakDays: 1,
    newLastActivityDate: today,
    changed: true,
  }
}

/** Returns 'YYYY-MM-DD' for today in UTC. */
export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Returns 'YYYY-MM-DD' for the day before `dateStr` (UTC). */
function getYesterdayDateString(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}
