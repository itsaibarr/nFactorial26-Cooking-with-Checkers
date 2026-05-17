"use client"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { getAppTranslator, type AppLocale } from "@/lib/i18n"

export function DashboardUpgradeToast({ locale }: { locale: AppLocale }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get("upgraded") !== "true") {
      return
    }

    const params = new URLSearchParams(searchParams.toString())
    params.delete("upgraded")
    params.delete("plan")

    const { t } = getAppTranslator(locale)
    toast.success(t("payment.upgradeSuccess"))

    router.replace(params.size > 0 ? `${pathname}?${params.toString()}` : pathname)
  }, [locale, pathname, router, searchParams])

  return null
}
