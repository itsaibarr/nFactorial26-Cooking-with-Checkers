import { createTranslator } from "use-intl/core"
import en from "@/lib/i18n/en.json"
import ru from "@/lib/i18n/ru.json"

const messages = {
  en,
  ru,
} as const

export type AppLocale = keyof typeof messages

export function resolveAppLocale(locale: string | null | undefined): AppLocale {
  return locale === "en" ? "en" : "ru"
}

export function getAppTranslator(localeInput: string | null | undefined) {
  const locale = resolveAppLocale(localeInput)

  return {
    locale,
    t: createTranslator({
      locale,
      messages: messages[locale],
    }),
  }
}

export function getDateTimeLocale(locale: AppLocale) {
  return locale === "en" ? "en-US" : "ru-RU"
}
