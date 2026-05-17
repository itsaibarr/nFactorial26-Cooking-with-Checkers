export const FREE_DAILY_TASK_LIMIT = 3

export function getDayOfYear(date: Date): number {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 0)
  const today = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  const oneDay = 1000 * 60 * 60 * 24

  return Math.floor((today - startOfYear) / oneDay)
}

export function getOrderedPuzzleIdsForDay(
  puzzleIds: readonly string[],
  now = new Date(),
): readonly string[] {
  if (puzzleIds.length === 0) {
    return []
  }

  const dayIndex = Math.max(getDayOfYear(now) - 1, 0)
  const startIndex = (dayIndex * FREE_DAILY_TASK_LIMIT) % puzzleIds.length

  return [...puzzleIds.slice(startIndex), ...puzzleIds.slice(0, startIndex)]
}

export function getDailyTaskIds(
  puzzleIds: readonly string[],
  now = new Date(),
  limit = FREE_DAILY_TASK_LIMIT,
): readonly string[] {
  return getOrderedPuzzleIdsForDay(puzzleIds, now).slice(0, Math.min(limit, puzzleIds.length))
}

export function getNextUnsolvedPuzzleId(
  puzzleIds: readonly string[],
  solvedPuzzleIds: ReadonlySet<string>,
) {
  return puzzleIds.find((puzzleId) => !solvedPuzzleIds.has(puzzleId)) ?? null
}
