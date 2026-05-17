import { Badge } from "@/components/ui/badge"

export function StreakBadge({days}: {days: number}) {
  if (days === 0) {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <span>🔥</span>
        <span>Нет серии</span>
      </Badge>
    )
  }

  return (
    <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500">
      <span>🔥</span>
      <span>
        {days} {getDayLabel(days)}
      </span>
    </Badge>
  )
}

function getDayLabel(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return "дней"
  if (mod10 === 1) return "день"
  if (mod10 >= 2 && mod10 <= 4) return "дня"
  return "дней"
}
