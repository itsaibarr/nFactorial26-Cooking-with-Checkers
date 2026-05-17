export type ActivityLevel = 0 | 1 | 2 | 3 | 4

export interface DashboardActivityHeatmapDay {
  date: string
  games: number
  puzzles: number
  total: number
  level: ActivityLevel
  inRange: boolean
}

export interface DashboardActivityHeatmapWeek {
  monthLabelDate: string | null
  days: DashboardActivityHeatmapDay[]
}

export interface DashboardActivityHeatmapData {
  totalActivities: number
  activeDays: number
  range: {
    startDate: string
    endDate: string
  }
  weeks: DashboardActivityHeatmapWeek[]
}

export function getDashboardActivityRange(endDate = new Date().toISOString().slice(0, 10)) {
  return {
    startDate: addDays(endDate, -364),
    endDate,
  }
}

export function buildDashboardActivityHeatmap({
  endDate = new Date().toISOString().slice(0, 10),
  startDate = getDashboardActivityRange(endDate).startDate,
  gameEndedAt,
  puzzleSolvedAt,
}: {
  endDate?: string
  startDate?: string
  gameEndedAt: string[]
  puzzleSolvedAt: string[]
}): DashboardActivityHeatmapData {
  const paddedStartDate = startOfWeekMonday(startDate)
  const paddedEndDate = endOfWeekMonday(endDate)
  const dailyTotals = new Map<string, {games: number; puzzles: number}>()

  for (const value of gameEndedAt) {
    const date = toUtcDateString(value)

    if (!date || date < startDate || date > endDate) {
      continue
    }

    const entry = dailyTotals.get(date) ?? {games: 0, puzzles: 0}
    dailyTotals.set(date, {...entry, games: entry.games + 1})
  }

  for (const value of puzzleSolvedAt) {
    const date = toUtcDateString(value)

    if (!date || date < startDate || date > endDate) {
      continue
    }

    const entry = dailyTotals.get(date) ?? {games: 0, puzzles: 0}
    dailyTotals.set(date, {...entry, puzzles: entry.puzzles + 1})
  }

  const days: DashboardActivityHeatmapDay[] = []

  for (
    let currentDate = paddedStartDate;
    currentDate <= paddedEndDate;
    currentDate = addDays(currentDate, 1)
  ) {
    const totals = dailyTotals.get(currentDate) ?? {games: 0, puzzles: 0}
    const total = totals.games + totals.puzzles

    days.push({
      date: currentDate,
      games: totals.games,
      puzzles: totals.puzzles,
      total,
      level: toActivityLevel(total),
      inRange: currentDate >= startDate && currentDate <= endDate,
    })
  }

  const weeks: DashboardActivityHeatmapWeek[] = []
  let lastLabeledMonth: number | null = null

  for (let index = 0; index < days.length; index += 7) {
    const weekDays = days.slice(index, index + 7)
    const firstDayInNewMonth = weekDays.find((day) => {
      if (!day.inRange) {
        return false
      }

      return getMonth(day.date) !== lastLabeledMonth
    })

    if (firstDayInNewMonth) {
      lastLabeledMonth = getMonth(firstDayInNewMonth.date)
    }

    weeks.push({
      monthLabelDate: firstDayInNewMonth?.date ?? null,
      days: weekDays,
    })
  }

  const inRangeDays = days.filter((day) => day.inRange)

  return {
    totalActivities: inRangeDays.reduce((sum, day) => sum + day.total, 0),
    activeDays: inRangeDays.filter((day) => day.total > 0).length,
    range: {
      startDate,
      endDate,
    },
    weeks,
  }
}

function toUtcDateString(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString().slice(0, 10)
}

function toActivityLevel(total: number): ActivityLevel {
  if (total <= 0) {
    return 0
  }

  if (total >= 4) {
    return 4
  }

  if (total === 3) {
    return 3
  }

  if (total === 2) {
    return 2
  }

  return 1
}

function getMonth(date: string) {
  return Number(date.slice(5, 7)) - 1
}

function startOfWeekMonday(date: string) {
  const value = toUtcMidnight(date)
  const offset = (value.getUTCDay() + 6) % 7

  value.setUTCDate(value.getUTCDate() - offset)

  return value.toISOString().slice(0, 10)
}

function endOfWeekMonday(date: string) {
  const value = toUtcMidnight(date)
  const offset = (value.getUTCDay() + 6) % 7

  value.setUTCDate(value.getUTCDate() + (6 - offset))

  return value.toISOString().slice(0, 10)
}

function addDays(date: string, amount: number) {
  const value = toUtcMidnight(date)

  value.setUTCDate(value.getUTCDate() + amount)

  return value.toISOString().slice(0, 10)
}

function toUtcMidnight(date: string) {
  const value = new Date(`${date}T00:00:00.000Z`)

  if (Number.isNaN(value.getTime())) {
    throw new Error(`Invalid UTC date: ${date}`)
  }

  return value
}
