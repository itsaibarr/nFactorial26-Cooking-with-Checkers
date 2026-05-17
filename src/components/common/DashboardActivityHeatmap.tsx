import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getAppTranslator, getDateTimeLocale, type AppLocale } from "@/lib/i18n"
import type {
  ActivityLevel,
  DashboardActivityHeatmapData,
  DashboardActivityHeatmapDay,
} from "@/lib/dashboard/activity-heatmap"
import { cn } from "@/lib/utils"

const LEGEND_LEVELS: ActivityLevel[] = [0, 1, 2, 3, 4]

export function DashboardActivityHeatmap({
  data,
  locale,
}: {
  data: DashboardActivityHeatmapData
  locale: AppLocale
}) {
  const {t} = getAppTranslator(locale)

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="space-y-1">
          <CardTitle>{t("dashboard.activityHeatmap.title")}</CardTitle>
          <CardDescription>{t("dashboard.activityHeatmap.description")}</CardDescription>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-2xl font-semibold tracking-tight">
              {t("dashboard.activityHeatmap.summary", {count: data.totalActivities})}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("dashboard.activityHeatmap.activeDays", {count: data.activeDays})}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="sr-only">
          {t("dashboard.activityHeatmap.srSummary", {
            activityCount: data.totalActivities,
            activeDays: data.activeDays,
          })}
        </p>
        <div className="overflow-x-auto pb-1">
          <div className="inline-flex min-w-max gap-3" aria-hidden="true">
            <div className="pt-6">
              <div className="flex flex-col gap-1">
                {getDayLabels(locale).map((label, index) => (
                  <div
                    key={`day-label-${index}`}
                    className="flex h-3 items-center text-[10px] leading-none text-muted-foreground"
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex gap-1">
                {data.weeks.map((week) => (
                  <div key={`month-${week.days[0]?.date ?? "empty"}`} className="relative h-4 w-3">
                    {week.monthLabelDate ? (
                      <span className="absolute left-0 top-0 whitespace-nowrap text-[10px] leading-none text-muted-foreground">
                        {formatMonthLabel(locale, week.monthLabelDate)}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="flex gap-1">
                {data.weeks.map((week) => (
                  <div key={`week-${week.days[0]?.date ?? "empty"}`} className="flex flex-col gap-1">
                    {week.days.map((day) => (
                      <div
                        key={day.date}
                        title={formatDayTooltip(day, locale, t)}
                        className={getCellClassName(day.level, day.inRange)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>{t("dashboard.activityHeatmap.legendDescription")}</p>
          <div className="flex items-center gap-2">
            <span>{t("dashboard.activityHeatmap.legendLess")}</span>
            <div className="flex gap-1">
              {LEGEND_LEVELS.map((level) => (
                <div
                  key={`legend-${level}`}
                  className={getCellClassName(level, true)}
                />
              ))}
            </div>
            <span>{t("dashboard.activityHeatmap.legendMore")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function getDayLabels(locale: AppLocale) {
  const formatter = new Intl.DateTimeFormat(getDateTimeLocale(locale), {
    weekday: "short",
    timeZone: "UTC",
  })

  return [
    formatter.format(new Date("2025-01-06T00:00:00.000Z")).replace(/\.$/, ""),
    "",
    formatter.format(new Date("2025-01-08T00:00:00.000Z")).replace(/\.$/, ""),
    "",
    formatter.format(new Date("2025-01-10T00:00:00.000Z")).replace(/\.$/, ""),
    "",
    "",
  ]
}

function formatMonthLabel(locale: AppLocale, date: string) {
  return new Intl.DateTimeFormat(getDateTimeLocale(locale), {
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(`${date}T00:00:00.000Z`))
    .replace(/\.$/, "")
}

function getCellClassName(level: ActivityLevel, inRange: boolean) {
  return cn(
    "size-3 rounded-[4px] border",
    !inRange && "border-transparent bg-transparent",
    inRange && level === 0 && "border-border/60 bg-muted/70 dark:border-border/50 dark:bg-muted/40",
    inRange && level === 1 && "border-amber-200 bg-amber-100 dark:border-amber-900/80 dark:bg-amber-950/60",
    inRange && level === 2 && "border-amber-300 bg-amber-200 dark:border-amber-800 dark:bg-amber-900/80",
    inRange && level === 3 && "border-amber-400 bg-amber-400 dark:border-amber-700 dark:bg-amber-700",
    inRange && level === 4 && "border-amber-600 bg-amber-600 dark:border-amber-500 dark:bg-amber-500",
  )
}

function formatDayTooltip(
  day: DashboardActivityHeatmapDay,
  locale: AppLocale,
  t: ReturnType<typeof getAppTranslator>["t"],
) {
  if (!day.inRange) {
    return ""
  }

  const date = new Intl.DateTimeFormat(getDateTimeLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day.date}T00:00:00.000Z`))

  if (day.total === 0) {
    return `${date}: ${t("dashboard.activityHeatmap.noActivity")}`
  }

  const parts: string[] = []

  if (day.games > 0) {
    parts.push(t("dashboard.activityHeatmap.gameCount", {count: day.games}))
  }

  if (day.puzzles > 0) {
    parts.push(t("dashboard.activityHeatmap.puzzleCount", {count: day.puzzles}))
  }

  return `${date}: ${t("dashboard.activityHeatmap.trainingCount", {count: day.total})} · ${parts.join(" · ")}`
}
