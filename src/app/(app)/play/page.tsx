import { redirect } from "next/navigation"
import { z } from "zod"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

const startGameSchema = z.object({
  playerColor: z.enum(["white", "black"]),
  opponentLevel: z.enum(["easy", "medium", "hard"]),
})

async function startGameAction(formData: FormData) {
  "use server"

  const parsed = startGameSchema.safeParse({
    playerColor: formData.get("playerColor"),
    opponentLevel: formData.get("opponentLevel"),
  })

  if (!parsed.success) {
    redirect("/play?error=invalid")
  }

  const supabase = await createClient()
  const {
    data: {user},
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  const {data: game, error} = await supabase
    .from("games")
    .insert({
      user_id: user.id,
      player_color: parsed.data.playerColor,
      opponent_level: parsed.data.opponentLevel,
    })
    .select("id")
    .single()

  if (error || !game) {
    redirect("/play?error=create")
  }

  redirect(`/play/${game.id}`)
}

function getErrorCopy(error: string | undefined) {
  if (error === "invalid") {
    return "Выберите цвет и уровень бота заново."
  }

  if (error === "create") {
    return "Не удалось создать партию. Попробуйте ещё раз."
  }

  return null
}

export default async function PlayLobbyPage({
  searchParams,
}: {
  searchParams: Promise<{error?: string}>
}) {
  const {error} = await searchParams
  const errorCopy = getErrorCopy(error)

  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Новая партия</h1>
        <p className="max-w-2xl text-muted-foreground">
          Движок русских шашек уже подключён к приложению. Выберите цвет и силу
          бота, затем начните реальную партию.
        </p>
      </header>

      {errorCopy ? (
        <Card size="sm" className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">{errorCopy}</CardContent>
        </Card>
      ) : null}

      <form action={startGameAction} className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ваш цвет</CardTitle>
            <CardDescription>
              Белые ходят первыми. Чёрными вы сразу проверите ответ бота из
              стартовой позиции.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ColorOption
              title="Белые"
              description="Вы начинаете партию."
              value="white"
              defaultChecked
            />
            <ColorOption
              title="Чёрные"
              description="Бот сделает первый ход."
              value="black"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Сила бота</CardTitle>
            <CardDescription>
              Easy играет быстро и проще. Medium и Hard считают ход во
              встроенном Web Worker.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <LevelOption
              title="Лёгкий"
              description="Случайный легальный ход для быстрого старта."
              value="easy"
              defaultChecked
            />
            <LevelOption
              title="Средний"
              description="Negamax depth 4 во worker."
              value="medium"
            />
            <LevelOption
              title="Сильный"
              description="Negamax depth 6 во worker."
              value="hard"
            />
          </CardContent>
        </Card>

        <div className="md:col-span-2">
          <Button type="submit" size="lg">
            Начать партию
          </Button>
        </div>
      </form>
    </main>
  )
}

function ColorOption({
  title,
  description,
  value,
  defaultChecked = false,
}: {
  title: string
  description: string
  value: "white" | "black"
  defaultChecked?: boolean
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/40">
      <input
        type="radio"
        name="playerColor"
        value={value}
        defaultChecked={defaultChecked}
        className="mt-1"
      />
      <span className="space-y-1">
        <span className="block font-medium">{title}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
    </label>
  )
}

function LevelOption({
  title,
  description,
  value,
  defaultChecked = false,
}: {
  title: string
  description: string
  value: "easy" | "medium" | "hard"
  defaultChecked?: boolean
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/40">
      <input
        type="radio"
        name="opponentLevel"
        value={value}
        defaultChecked={defaultChecked}
        className="mt-1"
      />
      <span className="space-y-1">
        <span className="block font-medium">{title}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
    </label>
  )
}
