"use client"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

export function DashboardUpgradeToast() {
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

    toast.success(
      "Оплата получена. Если статус не обновился сразу, обновите страницу через пару секунд.",
    )

    router.replace(params.size > 0 ? `${pathname}?${params.toString()}` : pathname)
  }, [pathname, router, searchParams])

  return null
}
