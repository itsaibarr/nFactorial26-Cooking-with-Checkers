import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

/**
 * /puzzles → redirect to today's puzzle.
 *
 * "Today's puzzle" is determined deterministically by day-of-year % puzzle_count,
 * using the ordering of `created_at asc, id asc` to keep it stable once seeded.
 */
export default async function PuzzlesPage() {
  const supabase = await createClient()

  const {data: puzzles} = await supabase
    .from("puzzles")
    .select("id")
    .order("created_at", {ascending: true})
    .order("id", {ascending: true})

  if (!puzzles || puzzles.length === 0) {
    return (
      <main className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-4 px-6 py-12">
        <p className="text-muted-foreground">Задачи ещё не загружены. Зайдите позже.</p>
      </main>
    )
  }

  const dayOfYear = getDayOfYear(new Date())
  const todayIndex = dayOfYear % puzzles.length
  const todayPuzzle = puzzles[todayIndex]!

  redirect(`/puzzles/${todayPuzzle.id}`)
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  return Math.floor(diff / oneDay)
}
