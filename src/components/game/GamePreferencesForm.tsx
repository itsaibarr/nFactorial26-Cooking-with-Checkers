"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { BoardTheme, CaptureInputMode, GameplayPreferences } from "@/lib/game/preferences"
import { getAppTranslator, type AppLocale } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const CAPTURE_MODE_OPTIONS: Array<{
  readonly value: CaptureInputMode
  readonly titleKey: string
  readonly descriptionKey: string
}> = [
  {
    value: "full_move",
    titleKey: "settings.captureFullMove",
    descriptionKey: "settings.captureFullMoveDescription",
  },
  {
    value: "step_by_step",
    titleKey: "settings.captureStepByStep",
    descriptionKey: "settings.captureStepByStepDescription",
  },
]

const BOARD_THEME_OPTIONS: Array<{
  readonly value: BoardTheme
  readonly title: string
  readonly preview: {
    readonly lightSquare: string
    readonly darkSquare: string
    readonly whitePiece: string
    readonly blackPiece: string
  }
}> = [
  {
    value: "classic",
    title: "Classic",
    preview: {
      lightSquare: "bg-amber-100/80",
      darkSquare: "bg-amber-800/90",
      whitePiece: "bg-stone-50 border-stone-300",
      blackPiece: "bg-stone-900 border-stone-900",
    },
  },
  {
    value: "walnut",
    title: "Walnut",
    preview: {
      lightSquare: "bg-stone-200",
      darkSquare: "bg-stone-700",
      whitePiece: "bg-amber-50 border-stone-400",
      blackPiece: "bg-stone-950 border-stone-800",
    },
  },
  {
    value: "slate",
    title: "Slate",
    preview: {
      lightSquare: "bg-slate-200",
      darkSquare: "bg-slate-700",
      whitePiece: "bg-slate-50 border-slate-300",
      blackPiece: "bg-slate-900 border-slate-800",
    },
  },
  {
    value: "forest",
    title: "Forest",
    preview: {
      lightSquare: "bg-lime-100",
      darkSquare: "bg-emerald-800",
      whitePiece: "bg-stone-50 border-emerald-200",
      blackPiece: "bg-emerald-950 border-emerald-900",
    },
  },
]

function arePreferencesEqual(left: GameplayPreferences, right: GameplayPreferences) {
  return (
    left.showLegalMoves === right.showLegalMoves &&
    left.showRecommendedMoves === right.showRecommendedMoves &&
    left.captureInputMode === right.captureInputMode &&
    left.boardTheme === right.boardTheme
  )
}

export function GamePreferencesForm({
  initialPreferences,
  locale,
}: {
  initialPreferences: GameplayPreferences
  locale: AppLocale
}) {
  const {t} = getAppTranslator(locale)
  const [preferences, setPreferences] = useState(initialPreferences)
  const [savedPreferences, setSavedPreferences] = useState(initialPreferences)
  const [saving, setSaving] = useState(false)

  const isDirty = useMemo(
    () => !arePreferencesEqual(preferences, savedPreferences),
    [preferences, savedPreferences],
  )

  async function handleSave() {
    if (saving || !isDirty) {
      return
    }

    setSaving(true)

    try {
      const response = await fetch("/api/profile/preferences", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(preferences),
      })
      const payload = (await response.json().catch(() => null)) as
        | (GameplayPreferences & {error?: string})
        | {error?: string}
        | null

      if (!response.ok) {
        throw new Error(payload && "error" in payload ? payload.error ?? "Save failed" : "Save failed")
      }

      setSavedPreferences(preferences)
      toast.success(t("settings.preferencesSaved"))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("settings.preferencesSaveError"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.gamePreferences")}</CardTitle>
        <CardDescription>
          {t("settings.gamePreferencesDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
            <div className="space-y-1">
              <Label htmlFor="show-legal-moves">{t("settings.showLegalMoves")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("settings.showLegalMovesDescription")}
              </p>
            </div>
            <Switch
              id="show-legal-moves"
              checked={preferences.showLegalMoves}
              onCheckedChange={(checked) =>
                setPreferences((current) => ({
                  ...current,
                  showLegalMoves: checked,
                }))
              }
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
            <div className="space-y-1">
              <Label htmlFor="show-recommended-moves">{t("settings.showRecommended")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("settings.showRecommendedDescription")}
              </p>
            </div>
            <Switch
              id="show-recommended-moves"
              checked={preferences.showRecommendedMoves}
              onCheckedChange={(checked) =>
                setPreferences((current) => ({
                  ...current,
                  showRecommendedMoves: checked,
                }))
              }
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>{t("settings.captureModeTitle")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("settings.captureModeDescription")}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {CAPTURE_MODE_OPTIONS.map((option) => {
              const active = preferences.captureInputMode === option.value

              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-colors",
                    active ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                  )}
                  onClick={() =>
                    setPreferences((current) => ({
                      ...current,
                      captureInputMode: option.value,
                    }))
                  }
                >
                  <div className="font-medium">{t(option.titleKey as Parameters<typeof t>[0])}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{t(option.descriptionKey as Parameters<typeof t>[0])}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>{t("settings.boardThemeTitle")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("settings.boardThemeDescription")}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {BOARD_THEME_OPTIONS.map((option) => {
              const active = preferences.boardTheme === option.value

              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-colors",
                    active ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                  )}
                  onClick={() =>
                    setPreferences((current) => ({
                      ...current,
                      boardTheme: option.value,
                    }))
                  }
                >
                  <div className="font-medium">{option.title}</div>
                  <div className="mt-3 grid grid-cols-[1fr_auto] gap-3">
                    <div className="overflow-hidden rounded-lg border">
                      <div className="grid grid-cols-2">
                        <div className={cn("aspect-square", option.preview.lightSquare)} />
                        <div className={cn("aspect-square", option.preview.darkSquare)} />
                        <div className={cn("aspect-square", option.preview.darkSquare)} />
                        <div className={cn("aspect-square", option.preview.lightSquare)} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn("size-6 rounded-full border shadow-sm", option.preview.whitePiece)}
                      />
                      <span
                        className={cn("size-6 rounded-full border shadow-sm", option.preview.blackPiece)}
                      />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {isDirty ? t("settings.unsavedChanges") : t("settings.allSaved")}
          </p>
          <Button type="button" disabled={!isDirty || saving} onClick={handleSave}>
            {saving ? t("settings.saving") : t("settings.savePreferences")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
