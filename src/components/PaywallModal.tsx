"use client"

import { useEffect, useRef } from "react"
import { PricingAnalytics } from "@/components/common/PricingAnalytics"
import { PricingCheckoutButton } from "@/components/common/PricingCheckoutButton"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { posthog } from "@/lib/posthog/client"
import type { CoachLanguage } from "@/lib/coach/types"
import { FREE_DAILY_TASK_LIMIT } from "@/lib/puzzles/daily"
import type { PaywallTriggerReason } from "@/lib/rate-limit"

function getReasonCopy(
  language: CoachLanguage,
  triggerReason: PaywallTriggerReason,
) {
  if (language === "ru") {
    const descriptions: Record<PaywallTriggerReason, string> = {
      analysis_limit: "Бесплатный разбор на сегодня уже использован.",
      game_limit: "Бесплатные партии на сегодня закончились.",
      puzzle_limit: `Сегодняшние ${FREE_DAILY_TASK_LIMIT} бесплатные задачи уже решены.`,
      manual: "Откройте Sharpki Pro, чтобы убрать лимиты и не прерывать тренировку.",
    }

    return {
      title: "Откройте Sharpki Pro",
      description: descriptions[triggerReason],
      benefits: [
        "Безлимитные AI-разборы и задачи",
        "До 10 разборов в час",
        "Отмена в любой момент, без лишних шагов",
      ],
      monthlyCta: "Оформить Pro Monthly",
      yearlyCta: "Взять Pro Yearly",
    }
  }

  const descriptions: Record<PaywallTriggerReason, string> = {
    analysis_limit: "You've used today's free AI review.",
    game_limit: "You've used today's free games.",
    puzzle_limit: `You've finished today's ${FREE_DAILY_TASK_LIMIT} free puzzles.`,
    manual: "Go Pro to train without interruptions.",
  }

  return {
    title: "Upgrade to Sharpki Pro",
    description: descriptions[triggerReason],
    benefits: [
      "Unlimited AI reviews and puzzles",
      "Up to 10 AI reviews per hour",
      "Cancel any time, no questions asked",
    ],
    monthlyCta: "Start Pro Monthly",
    yearlyCta: "Start Pro Yearly",
  }
}

export function PaywallModal({
  open,
  onOpenChange,
  language,
  triggerReason,
  currentTier = "free",
  monthlyCheckoutEnabled = true,
  yearlyCheckoutEnabled = true,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  language: CoachLanguage
  triggerReason: PaywallTriggerReason
  currentTier?: "free" | "pro" | "family"
  monthlyCheckoutEnabled?: boolean
  yearlyCheckoutEnabled?: boolean
}) {
  const copy = getReasonCopy(language, triggerReason)
  const previousOpen = useRef(false)

  useEffect(() => {
    if (!posthog.__loaded) {
      previousOpen.current = open
      return
    }

    if (open && !previousOpen.current) {
      posthog.capture("paywall_shown", {
        trigger_reason: triggerReason,
        current_tier: currentTier,
      })
    }

    if (!open && previousOpen.current) {
      posthog.capture("paywall_dismissed", {
        trigger_reason: triggerReason,
      })
    }

    previousOpen.current = open
  }, [currentTier, open, triggerReason])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {open ? <PricingAnalytics source="modal" /> : null}

        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge>{language === "ru" ? "Pro" : "Pro"}</Badge>
            <Badge variant="outline">
              {language === "ru" ? "Без лимитов" : "No limits"}
            </Badge>
          </div>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm text-muted-foreground">
          {copy.benefits.map((benefit) => (
            <p key={benefit}>• {benefit}</p>
          ))}
        </div>

        <DialogFooter className="grid gap-2 sm:grid-cols-2">
          <PricingCheckoutButton
            plan="monthly"
            className="w-full"
            disabled={!monthlyCheckoutEnabled}
          >
            {copy.monthlyCta}
          </PricingCheckoutButton>
          <PricingCheckoutButton
            plan="yearly"
            className="w-full"
            variant="outline"
            disabled={!yearlyCheckoutEnabled}
          >
            {copy.yearlyCta}
          </PricingCheckoutButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
