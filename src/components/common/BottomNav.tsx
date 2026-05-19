"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Play, Puzzle, Trophy, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

type NavItem = {
  href: string
  icon: React.ElementType
  labelEn: string
  labelRu: string
  /** Extra path prefixes that should also activate this tab */
  activePrefixes?: string[]
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", icon: Home, labelEn: "Home", labelRu: "Кабинет" },
  {
    href: "/play",
    icon: Play,
    labelEn: "Play",
    labelRu: "Играть",
    activePrefixes: ["/play/", "/analysis/"],
  },
  {
    href: "/puzzles",
    icon: Puzzle,
    labelEn: "Tasks",
    labelRu: "Задачи",
    activePrefixes: ["/puzzles/"],
  },
  { href: "/leagues", icon: Trophy, labelEn: "Leagues", labelRu: "Лиги" },
  { href: "/settings", icon: Settings, labelEn: "Settings", labelRu: "Настройки" },
]

export function BottomNav({ locale }: { locale: "ru" | "en" }) {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden"
      aria-label={locale === "ru" ? "Навигация" : "Navigation"}
    >
      <div className="flex h-16 items-stretch">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.activePrefixes ?? [`${item.href}/`]).some((prefix) =>
              pathname.startsWith(prefix),
            )
          const Icon = item.icon
          const label = locale === "ru" ? item.labelRu : item.labelEn

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className="size-5"
                strokeWidth={isActive ? 2.25 : 1.75}
                aria-hidden="true"
              />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
