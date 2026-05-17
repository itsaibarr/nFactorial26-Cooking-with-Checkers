import Link from "next/link"
import { notFound } from "next/navigation"
import { PuzzleSolveClient } from "@/components/puzzle/PuzzleSolveClient"
import { StreakBadge } from "@/components/common/StreakBadge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/server"
import type { CreateGameStateOptions, PieceColor } from "@/lib/engine/types"

interface PageProps {
  params: Promise<{puzzleId: string}>
}

function difficultyLabel(n: number): string {
  const labels: Record<number, string> = {
    1: "Начинающий",
    2: "Средний",
    3: "Сложный",
    4: "Продвинутый",
    5: "Мастер",
  }
  return labels[n] ?? String(n)
}

function themeLabel(theme: string | null): string {
  const labels: Record<string, string> = {
    basic_capture: "Взятие",
    double_capture: "Двойное взятие",
    triple_capture: "Тройное взятие",
    backward_capture: "Взятие назад",
    promotion: "Превращение",
    king_capture: "Взятие дамкой",
  }
  return theme ? (labels[theme] ?? theme) : "Тактика"
}

export default async function PuzzlePage({params}: PageProps) {
  const {puzzleId} = await params
  const supabase = await createClient()

  const {
    data: {user},
  } = await supabase.auth.getUser()
  if (!user) return null

  const [puzzleResult, profileResult, attemptResult] = await Promise.all([
    supabase
      .from("puzzles")
      .select("id, slug, position, side_to_move, solution_moves, theme, difficulty, explanation_ru, explanation_en")
      .eq("id", puzzleId)
      .single(),
    supabase
      .from("profiles")
      .select("streak_days")
      .eq("id", user.id)
      .single(),
    supabase
      .from("puzzle_attempts")
      .select("solved")
      .eq("user_id", user.id)
      .eq("puzzle_id", puzzleId)
      .maybeSingle(),
  ])

  if (puzzleResult.error || !puzzleResult.data) {
    notFound()
  }

  const puzzle = puzzleResult.data
  const profile = profileResult.data
  const alreadySolved = attemptResult.data?.solved === true

  const position = puzzle.position as CreateGameStateOptions
  const solutionMoves = puzzle.solution_moves as string[]

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 px-6 py-12">
      <header className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">← Назад</Link>
        </Button>
        <StreakBadge days={profile?.streak_days ?? 0} />
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Задача дня</CardTitle>
              <CardDescription className="mt-1">
                Найдите лучший ход для{" "}
                {puzzle.side_to_move === "white" ? "белых" : "чёрных"}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant="outline">{difficultyLabel(puzzle.difficulty)}</Badge>
              <Badge variant="secondary" className="text-xs">
                {themeLabel(puzzle.theme)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PuzzleSolveClient
            puzzleId={puzzle.id}
            position={position}
            sideToMove={puzzle.side_to_move as PieceColor}
            solutionMoves={solutionMoves}
            explanationRu={puzzle.explanation_ru}
            explanationEn={puzzle.explanation_en}
            alreadySolved={alreadySolved}
          />
        </CardContent>
      </Card>
    </main>
  )
}
