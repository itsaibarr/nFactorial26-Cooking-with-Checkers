"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function PortalManageButton({
  className,
}: {
  className?: string
}) {
  const [loading, setLoading] = useState(false)

  async function handleOpenPortal() {
    if (loading) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      })
      const payload = (await response.json().catch(() => null)) as
        | {url?: string; error?: string}
        | null

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error ?? "Portal failed")
      }

      window.location.assign(payload.url)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Не удалось открыть кабинет подписки.",
      )
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      disabled={loading}
      onClick={handleOpenPortal}
      aria-label="Open Stripe billing portal"
    >
      {loading ? "Открываем портал…" : "Управлять подпиской"}
    </Button>
  )
}
