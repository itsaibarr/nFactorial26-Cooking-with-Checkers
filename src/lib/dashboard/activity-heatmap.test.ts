import { describe, expect, it } from "vitest"
import {
  buildDashboardActivityHeatmap,
  getDashboardActivityRange,
} from "@/lib/dashboard/activity-heatmap"

function findDay(
  heatmap: ReturnType<typeof buildDashboardActivityHeatmap>,
  date: string,
) {
  return heatmap.weeks
    .flatMap((week) => week.days)
    .find((day) => day.date === date)
}

describe("buildDashboardActivityHeatmap", () => {
  it("aggregates completed games and solved puzzles by UTC day", () => {
    const heatmap = buildDashboardActivityHeatmap({
      endDate: "2026-05-17",
      gameEndedAt: [
        "2026-05-17T10:00:00.000Z",
        "2026-05-17T11:30:00.000Z",
        "2026-05-15T09:00:00.000Z",
      ],
      puzzleSolvedAt: [
        "2026-05-17T07:45:00.000Z",
        "2026-05-15T12:00:00.000Z",
      ],
    })

    expect(heatmap.totalActivities).toBe(5)
    expect(heatmap.activeDays).toBe(2)
    expect(findDay(heatmap, "2026-05-17")).toMatchObject({
      games: 2,
      puzzles: 1,
      total: 3,
      level: 3,
      inRange: true,
    })
    expect(findDay(heatmap, "2026-05-15")).toMatchObject({
      games: 1,
      puzzles: 1,
      total: 2,
      level: 2,
      inRange: true,
    })
  })

  it("uses 27 monday-start weeks for the trailing 6-month window", () => {
    const heatmap = buildDashboardActivityHeatmap({
      endDate: "2026-05-17",
      gameEndedAt: [],
      puzzleSolvedAt: [],
    })

    const days = heatmap.weeks.flatMap((week) => week.days)

    expect(heatmap.range.startDate).toBe("2025-11-16")
    expect(heatmap.range.endDate).toBe("2026-05-17")
    expect(heatmap.weeks).toHaveLength(27)
    expect(heatmap.weeks.every((week) => week.days.length === 7)).toBe(true)
    expect(days).toHaveLength(189)
    expect(days.filter((day) => day.inRange)).toHaveLength(183)
    expect(days[0]).toMatchObject({
      date: "2025-11-10",
      inRange: false,
    })
  })

  it("caps the strongest visual level at four or more activities in a day", () => {
    const heatmap = buildDashboardActivityHeatmap({
      endDate: "2026-05-17",
      gameEndedAt: [
        "2026-05-10T08:00:00.000Z",
        "2026-05-10T09:00:00.000Z",
        "2026-05-10T10:00:00.000Z",
      ],
      puzzleSolvedAt: [
        "2026-05-10T11:00:00.000Z",
        "2026-05-10T12:00:00.000Z",
      ],
    })

    expect(findDay(heatmap, "2026-05-10")).toMatchObject({
      total: 5,
      level: 4,
    })
  })

  it("adds month labels where the visible month changes", () => {
    const heatmap = buildDashboardActivityHeatmap({
      endDate: "2026-05-17",
      gameEndedAt: [],
      puzzleSolvedAt: [],
    })

    const januaryWeek = heatmap.weeks.find((week) =>
      week.days.some((day) => day.date === "2026-01-01"),
    )
    const labels = heatmap.weeks.flatMap((week) =>
      week.monthLabelDate ? [week.monthLabelDate] : [],
    )

    expect(januaryWeek?.monthLabelDate).toBe("2026-01-01")
    expect(labels).toContain("2025-11-16")
    expect(labels).toContain("2026-01-01")
  })

  it("returns the trailing 6-month query range", () => {
    expect(getDashboardActivityRange("2026-05-17")).toEqual({
      startDate: "2025-11-16",
      endDate: "2026-05-17",
    })
  })

  it("ignores activities outside the range and skips invalid timestamps", () => {
    const heatmap = buildDashboardActivityHeatmap({
      endDate: "2026-05-17",
      startDate: "2026-05-01",
      gameEndedAt: [
        "invalid-date",
        "2026-04-30T23:59:59.000Z",
        "2026-05-03T08:00:00.000Z",
      ],
      puzzleSolvedAt: [
        "2026-05-18T00:00:00.000Z",
        "2026-05-03T10:30:00.000Z",
      ],
    })

    expect(heatmap.totalActivities).toBe(2)
    expect(heatmap.activeDays).toBe(1)
    expect(findDay(heatmap, "2026-05-03")).toMatchObject({
      games: 1,
      puzzles: 1,
      total: 2,
    })
  })
})
