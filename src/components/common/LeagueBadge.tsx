"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type LeagueTier = "bronze" | "silver" | "gold" | "diamond"

const TIER_CONFIG: Record<
  LeagueTier,
  { icon: string; label: string; className: string }
> = {
  bronze: {
    icon: "🥉",
    label: "Bronze",
    className: "bg-amber-800 text-white hover:bg-amber-800",
  },
  silver: {
    icon: "🥈",
    label: "Silver",
    className: "bg-slate-500 text-white hover:bg-slate-500",
  },
  gold: {
    icon: "🥇",
    label: "Gold",
    className: "bg-yellow-500 text-white hover:bg-yellow-500",
  },
  diamond: {
    icon: "💎",
    label: "Diamond",
    className: "bg-cyan-500 text-white hover:bg-cyan-500",
  },
}

interface LeagueBadgeProps {
  tier: LeagueTier
  size?: "sm" | "md"
  labelOverride?: string
}

export function LeagueBadge({ tier, size = "sm", labelOverride }: LeagueBadgeProps) {
  const config = TIER_CONFIG[tier] ?? TIER_CONFIG.bronze
  return (
    <Badge
      className={cn(
        "gap-1",
        config.className,
        size === "md" && "px-3 py-1 text-sm",
      )}
    >
      <span>{config.icon}</span>
      <span>{labelOverride ?? config.label}</span>
    </Badge>
  )
}
