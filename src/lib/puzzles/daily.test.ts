import { describe, expect, it } from "vitest"
import {
  FREE_DAILY_TASK_LIMIT,
  getDailyTaskIds,
  getNextUnsolvedPuzzleId,
  getOrderedPuzzleIdsForDay,
} from "@/lib/puzzles/daily"

describe("daily puzzle helpers", () => {
  it("rotates the puzzle order by day and exposes three daily tasks", () => {
    const puzzleIds = ["p1", "p2", "p3", "p4", "p5"]
    const now = new Date("2026-01-02T09:00:00.000Z")

    expect(getOrderedPuzzleIdsForDay(puzzleIds, now)).toEqual(["p4", "p5", "p1", "p2", "p3"])
    expect(getDailyTaskIds(puzzleIds, now)).toEqual(["p4", "p5", "p1"])
    expect(getDailyTaskIds(puzzleIds, now)).toHaveLength(FREE_DAILY_TASK_LIMIT)
  })

  it("returns the first unsolved task from today's set", () => {
    const dailyTaskIds = ["p3", "p4", "p5"]
    const solvedPuzzleIds = new Set(["p3", "p5"])

    expect(getNextUnsolvedPuzzleId(dailyTaskIds, solvedPuzzleIds)).toBe("p4")
    expect(getNextUnsolvedPuzzleId(dailyTaskIds, new Set(dailyTaskIds))).toBeNull()
  })

  it("returns a different set of daily tasks on different days", () => {
    const puzzleIds = ["p1", "p2", "p3", "p4", "p5"]
    const day1 = new Date("2026-01-02T09:00:00.000Z")
    const day2 = new Date("2026-01-03T09:00:00.000Z")

    const tasks1 = getDailyTaskIds(puzzleIds, day1)
    const tasks2 = getDailyTaskIds(puzzleIds, day2)

    expect(tasks1).not.toEqual(tasks2)
    expect(tasks1).toHaveLength(FREE_DAILY_TASK_LIMIT)
    expect(tasks2).toHaveLength(FREE_DAILY_TASK_LIMIT)
  })

  it("can show a puzzle again on a new day even if it was solved previously", () => {
    // p4 was today's first task and was solved. On the next day p4 appears
    // in a different position, and since we only track today's solves,
    // it should be offered again.
    const puzzleIds = ["p1", "p2", "p3", "p4", "p5"]
    const day2 = new Date("2026-01-03T09:00:00.000Z")

    // day2 tasks: starting at index (dayOfYear(day2) - 1) * 3 % 5 = 2*3%5 = 1 → p2,p3,p4
    const tasks = getDailyTaskIds(puzzleIds, day2)
    const solvedTodayIds = new Set<string>() // nothing solved today yet

    // p4 appeared in the all-time solved set from a previous day — we do NOT pass that here
    expect(getNextUnsolvedPuzzleId(tasks, solvedTodayIds)).toBe(tasks[0])
  })

  it("does not redirect outside today's 3-task set even when more puzzles are unsolved", () => {
    const puzzleIds = ["p1", "p2", "p3", "p4", "p5"]
    const now = new Date("2026-01-02T09:00:00.000Z")

    // Today's set is ["p4", "p5", "p1"]
    const dailyTaskIds = getDailyTaskIds(puzzleIds, now)
    expect(dailyTaskIds).toEqual(["p4", "p5", "p1"])

    // All of today's tasks are solved
    const solvedTodayIds = new Set(dailyTaskIds)
    expect(getNextUnsolvedPuzzleId(dailyTaskIds, solvedTodayIds)).toBeNull()

    // p2 and p3 are unsolved overall, but they are NOT in today's set — null is correct
  })
})
