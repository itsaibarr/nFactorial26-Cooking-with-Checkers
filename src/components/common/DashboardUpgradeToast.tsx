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
      "Payment received! If the status hasn't updated yet, refresh the page in a few seconds.",
    )

    router.replace(params.size > 0 ? `${pathname}?${params.toString()}` : pathname)
  }, [pathname, router, searchParams])

  return null
}
