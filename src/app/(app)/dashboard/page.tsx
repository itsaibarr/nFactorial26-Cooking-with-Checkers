import Link from "next/link"
import { DashboardAnalytics } from "@/components/common/DashboardAnalytics"
import { SharpnessGauge } from "@/components/common/SharpnessGauge"
import { SignOutButton } from "@/components/common/SignOutButton"
import { StreakBadge } from "@/components/common/StreakBadge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: {user},
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, current_sharpness, streak_days")
    .eq("id", user.id)
    .single()

  const {data: recentGames} = await supabase
    .from("games")
    .select("id, result, opponent_level, sharpness_score, created_at")
    .eq("user_id", user.id)
    .not("result", "is", null)
    .order("created_at", {ascending: false})
    .limit(3)

  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col gap-6 px-6 py-12">
      <DashboardAnalytics />

      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Sharpki</h1>
        <div className="flex items-center gap-2">
          <StreakBadge days={profile?.streak_days ?? 0} />
          <SignOutButton />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{profile?.display_name ?? user.email}</CardTitle>
          <CardDescription>Ваш личный кабинет и быстрый вход в игру.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-4">
            <SharpnessGauge value={profile?.current_sharpness ?? 50} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
            <Button asChild size="lg">
              <Link href="/play">Играть с ботом</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/puzzles">Задача дня</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Последние партии</CardTitle>
            <CardDescription className="mt-1">
              Завершённые игры сохраняются через серверную проверку ходов.
            </CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/history">Все партии →</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentGames?.length ? (
            recentGames.map((game) => (
              <Link key={game.id} href={`/analysis/${game.id}`} className="block">
                <div className="flex items-center justify-between rounded-xl border p-3 text-sm transition-colors hover:bg-muted/50">
                  <div>
                    <p className="font-medium">
                      {game.result === "win"
                        ? "Победа"
                        : game.result === "loss"
                          ? "Поражение"
                          : game.result === "aborted"
                            ? "Прервана"
                            : "Ничья"}
                    </p>
                    <p className="text-muted-foreground">
                      Бот: {game.opponent_level} ·{" "}
                      {new Date(game.created_at).toLocaleString("ru-RU")}
                    </p>
                  </div>
                  <p className="font-medium">
                    {game.sharpness_score === null ? "—" : `${game.sharpness_score}/100`}
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Пока нет завершённых партий. Начните первую игру с ботом.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
