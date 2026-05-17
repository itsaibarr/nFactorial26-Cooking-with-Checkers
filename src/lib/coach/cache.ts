export const COACH_ANALYSIS_CACHE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export function isCoachAnalysisFresh(createdAt: string, now = Date.now()) {
  const createdAtMs = Date.parse(createdAt)
  if (Number.isNaN(createdAtMs)) {
    return false
  }

  return now - createdAtMs < COACH_ANALYSIS_CACHE_WINDOW_MS
}
