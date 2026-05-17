import { cookies } from "next/headers"
import { resolveAppLocale, type AppLocale } from "@/lib/i18n"

export async function resolveLocaleFromCookie(): Promise<AppLocale> {
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value
  return resolveAppLocale(cookieLocale)
}
