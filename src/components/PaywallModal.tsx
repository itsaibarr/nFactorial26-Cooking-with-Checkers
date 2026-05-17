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
import type { PaywallTriggerReason } from "@/lib/rate-limit"

function getReasonCopy(
  language: CoachLanguage,
  triggerReason: PaywallTriggerReason,
) {
  if (language === "ru") {
    const descriptions: Record<PaywallTriggerReason, string> = {
      analysis_limit: "Вы уже использовали сегодняшний бесплатный AI-разбор.",
      game_limit: "Бесплатный дневной лимит партий на сегодня исчерпан.",
      puzzle_limit: "Бесплатный дневной лимит задач на сегодня исчерпан.",
      manual: "Откройте Sharpki Pro, чтобы убрать лимиты и вернуться к игре без пауз.",
    }

    return {
      title: "Откройте Sharpki Pro",
      description: descriptions[triggerReason],
      benefits: [
        "Безлимитные AI-разборы и задачи",
        "До 10 разборов в час для платного тарифа",
        "Отмена в любой момент через Stripe",
      ],
      monthlyCta: "Оформить Pro Monthly",
      yearlyCta: "Взять Pro Yearly",
    }
  }

  const descriptions: Record<PaywallTriggerReason, string> = {
    analysis_limit: "You have already used today's free AI analysis.",
    game_limit: "You have already used today's free game limit.",
    puzzle_limit: "You have already used today's free puzzle limit.",
    manual: "Unlock Sharpki Pro to remove limits and get back to training.",
  }

  return {
    title: "Unlock Sharpki Pro",
    description: descriptions[triggerReason],
    benefits: [
      "Unlimited AI coaching and puzzles",
      "Up to 10 analyses per hour on the paid tier",
      "Cancel any time through Stripe",
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
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  language: CoachLanguage
  triggerReason: PaywallTriggerReason
  currentTier?: "free" | "pro" | "family"
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
          <PricingCheckoutButton plan="monthly" className="w-full">
            {copy.monthlyCta}
          </PricingCheckoutButton>
          <PricingCheckoutButton plan="yearly" className="w-full" variant="outline">
            {copy.yearlyCta}
          </PricingCheckoutButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
