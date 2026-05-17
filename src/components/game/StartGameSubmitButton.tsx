"use client"

import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { getAppTranslator, type AppLocale } from "@/lib/i18n"

export function StartGameSubmitButton({ locale }: { locale: AppLocale }) {
  const {pending} = useFormStatus()
  const {t} = getAppTranslator(locale)

  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? t("play.creatingGame") : t("play.startGame")}
    </Button>
  )
}
