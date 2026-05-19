import Link from "next/link"
import { redirect } from "next/navigation"
import { z } from "zod"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { StartGameSubmitButton } from "@/components/game/StartGameSubmitButton"
import { createClient } from "@/lib/supabase/server"
import { getAppTranslator } from "@/lib/i18n"
import { resolveLocaleFromCookie } from "@/lib/i18n/server"

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

export default async function PlayLobbyPage({
  searchParams,
}: {
  searchParams: Promise<{error?: string}>
}) {
  const {error} = await searchParams
  const locale = await resolveLocaleFromCookie()
  const {t} = getAppTranslator(locale)

  const errorCopy =
    error === "invalid" ? t("play.errorInvalid") :
    error === "create" ? t("play.errorCreate") :
    null

  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-12">
      <header className="space-y-2">
        <Link href="/dashboard" className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline">
          {t("play.back")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("play.title")}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          {t("play.description")}
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
            <CardTitle>{t("play.colorTitle")}</CardTitle>
            <CardDescription>
              {t("play.colorDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ColorOption
              title={t("play.white")}
              description={t("play.whiteDescription")}
              value="white"
              defaultChecked
            />
            <ColorOption
              title={t("play.black")}
              description={t("play.blackDescription")}
              value="black"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("play.levelTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <LevelOption
              title={t("play.easy")}
              description={t("play.easyDescription")}
              value="easy"
              defaultChecked
            />
            <LevelOption
              title={t("play.medium")}
              description={t("play.mediumDescription")}
              value="medium"
            />
            <LevelOption
              title={t("play.hard")}
              description={t("play.hardDescription")}
              value="hard"
            />
          </CardContent>
        </Card>

        <div className="md:col-span-2">
          <StartGameSubmitButton locale={locale} />
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
