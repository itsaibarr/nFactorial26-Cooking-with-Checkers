import Link from "next/link"
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

function resultLabel(result: string | null): {label: string; variant: "default" | "secondary" | "destructive" | "outline"} {
  switch (result) {
    case "win":
      return {label: "Победа", variant: "default"}
    case "loss":
      return {label: "Поражение", variant: "destructive"}
    case "draw":
      return {label: "Ничья", variant: "secondary"}
    case "aborted":
      return {label: "Прервана", variant: "outline"}
    default:
      return {label: "В процессе", variant: "outline"}
  }
}

function opponentLabel(level: string): string {
  const labels: Record<string, string> = {
    easy: "Лёгкий бот",
    medium: "Средний бот",
    hard: "Сложный бот",
  }
  return labels[level] ?? level
}

function colorLabel(color: string): string {
  return color === "white" ? "Белые" : "Чёрные"
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m} мин ${s} с` : `${s} с`
}

export default async function HistoryPage() {
  const supabase = await createClient()
  const {
    data: {user},
  } = await supabase.auth.getUser()
  if (!user) return null

  const {data: games} = await supabase
    .from("games")
    .select(
      "id, result, opponent_level, player_color, sharpness_score, duration_seconds, started_at, ended_at",
    )
    .eq("user_id", user.id)
    .not("result", "is", null)
    .order("ended_at", {ascending: false})
    .limit(50)

  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col gap-6 px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">История партий</h1>
          <p className="text-sm text-muted-foreground">Последние 50 завершённых партий</p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">← Назад</Link>
        </Button>
      </header>

      {!games || games.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Пока нет завершённых партий.</p>
            <Button asChild className="mt-4">
              <Link href="/play">Начать первую игру</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Партии</CardTitle>
            <CardDescription>
              Показано {games.length} партий. Нажмите на партию, чтобы просмотреть анализ.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {games.map((game) => {
              const {label, variant} = resultLabel(game.result)
              const date = game.ended_at
                ? new Date(game.ended_at).toLocaleString("ru-RU", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"

              return (
                <Link key={game.id} href={`/analysis/${game.id}`} className="block">
                  <div className="flex items-center justify-between rounded-xl border p-3 text-sm transition-colors hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Badge variant={variant} className="w-24 justify-center">
                        {label}
                      </Badge>
                      <div>
                        <p className="font-medium">{opponentLabel(game.opponent_level)}</p>
                        <p className="text-xs text-muted-foreground">
                          {colorLabel(game.player_color)} · {date}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div className="hidden sm:block">
                        <p className="text-xs text-muted-foreground">Время</p>
                        <p className="font-medium">{formatDuration(game.duration_seconds)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Острота</p>
                        <p className="font-medium">
                          {game.sharpness_score === null ? "—" : `${game.sharpness_score}/100`}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </CardContent>
        </Card>
      )}
    </main>
  )
}
