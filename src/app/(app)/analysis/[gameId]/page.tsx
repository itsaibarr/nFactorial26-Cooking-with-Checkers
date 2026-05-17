import { notFound } from "next/navigation"
import { z } from "zod"
import { CoachAnalysisClient } from "@/components/coach/CoachAnalysisClient"
import { isCoachAnalysisFresh } from "@/lib/coach/cache"
import {
  coachAnalysisSchema,
  coachLanguageSchema,
} from "@/lib/coach/types"
import { createClient } from "@/lib/supabase/server"

const storedGameSchema = z.object({
  id: z.string().uuid(),
  result: z.enum(["win", "loss", "draw", "aborted"]).nullable(),
  sharpness_score: z.number().int().min(0).max(100).nullable(),
  ended_at: z.string().nullable(),
})

const storedProfileSchema = z.object({
  language: coachLanguageSchema,
})

const storedAnalysisSchema = z.object({
  payload: coachAnalysisSchema,
  created_at: z.string(),
  model: z.string().min(1),
})

export default async function AnalysisPage({
  params,
  searchParams,
}: {
  params: Promise<{gameId: string}>
  searchParams: Promise<{lang?: string}>
}) {
  const {gameId} = await params
  const {lang} = await searchParams
  const supabase = await createClient()
  const {
    data: {user},
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  const {data: rawGame} = await supabase
    .from("games")
    .select("id, result, sharpness_score, ended_at")
    .eq("id", gameId)
    .eq("user_id", user.id)
    .single()

  const parsedGame = storedGameSchema.safeParse(rawGame)
  if (
    !parsedGame.success ||
    !parsedGame.data.ended_at ||
    !parsedGame.data.result ||
    parsedGame.data.sharpness_score === null
  ) {
    notFound()
  }

  const {data: rawProfile} = await supabase
    .from("profiles")
    .select("language")
    .eq("id", user.id)
    .single()

  const parsedProfile = storedProfileSchema.safeParse(rawProfile)
  if (!parsedProfile.success) {
    notFound()
  }

  const requestedLanguage = coachLanguageSchema.safeParse(lang).success
    ? coachLanguageSchema.parse(lang)
    : parsedProfile.data.language

  const {data: rawAnalysis} = await supabase
    .from("game_analyses")
    .select("payload, created_at, model")
    .eq("game_id", parsedGame.data.id)
    .eq("language", requestedLanguage)
    .maybeSingle()

  const parsedAnalysis = storedAnalysisSchema.safeParse(rawAnalysis)
  const initialAnalysis =
    parsedAnalysis.success &&
    parsedAnalysis.data.model !== "engine-only-fallback" &&
    isCoachAnalysisFresh(parsedAnalysis.data.created_at)
      ? parsedAnalysis.data.payload
      : null

  return (
    <main className="mx-auto flex min-h-svh max-w-5xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {requestedLanguage === "ru" ? "Разбор партии" : "Game review"}
        </h1>
        <p className="text-muted-foreground">
          {requestedLanguage === "ru"
            ? "Страница использует сохранённый разбор, а при первом открытии запросит новый у AI Coach."
            : "This page reuses a cached review when available and requests a fresh one on first open."}
        </p>
      </header>

      <CoachAnalysisClient
        key={`${parsedGame.data.id}:${requestedLanguage}`}
        gameId={parsedGame.data.id}
        language={requestedLanguage}
        initialAnalysis={initialAnalysis}
      />
    </main>
  )
}
