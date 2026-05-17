import { Progress } from "@/components/ui/progress"

export function SharpnessGauge({
  value,
  label = "Sharpness Score",
}: {
  value: number
  label?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}/100</p>
        </div>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  )
}
