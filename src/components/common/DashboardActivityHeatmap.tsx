"use client"

import { useCallback, useRef, useState } from "react"
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
// Estimated tooltip width (px) — used for edge detection only.
const TOOLTIP_ESTIMATED_WIDTH = 120

export function DashboardActivityHeatmap({
  data,
  locale,
}: {
  data: DashboardActivityHeatmapData
  locale: AppLocale
}) {
  const {t} = getAppTranslator(locale)
  const [tooltip, setTooltip] = useState<{
    day: DashboardActivityHeatmapDay
    x: number
    y: number
    /** "above" | "below" — vertical placement relative to the cell */
    vDir: "above" | "below"
    /** "center" | "left" | "right" — which edge of the tooltip is pinned */
    hAnchor: "center" | "left" | "right"
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleCellEnter = useCallback(
    (day: DashboardActivityHeatmapDay, cell: HTMLDivElement) => {
      if (!day.inRange || !containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const cellRect = cell.getBoundingClientRect()

      const cellCenterX = cellRect.left + cellRect.width / 2 - containerRect.left
      const containerWidth = containerRect.width

      // Decide horizontal anchor: if cell center is close to the right edge, pin
      // the tooltip's right side to the cell center; near left edge, pin left.
      let hAnchor: "center" | "left" | "right" = "center"
      if (cellCenterX + TOOLTIP_ESTIMATED_WIDTH / 2 > containerWidth) {
        hAnchor = "right"
      } else if (cellCenterX - TOOLTIP_ESTIMATED_WIDTH / 2 < 0) {
        hAnchor = "left"
      }

      // Place above the cell by default; the cell row height is small so above
      // is almost always within the container.
      const y = cellRect.top - containerRect.top - 6
      const vDir: "above" | "below" = y < 40 ? "below" : "above"
      const adjustedY =
        vDir === "below"
          ? cellRect.bottom - containerRect.top + 6
          : y

      setTooltip({day, x: cellCenterX, y: adjustedY, vDir, hAnchor})
    },
    [],
  )

  const handleCellLeave = useCallback(() => {
    setTooltip(null)
  }, [])

  // Build the CSS transform string from the anchor values.
  function tooltipTransform(vDir: "above" | "below", hAnchor: "center" | "left" | "right") {
    const ty = vDir === "above" ? "-100%" : "0%"
    const tx = hAnchor === "center" ? "-50%" : hAnchor === "right" ? "-100%" : "0%"
    return `translate(${tx}, ${ty})`
  }

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
        <div className="overflow-x-auto">
        <div ref={containerRef} className="relative min-w-[560px]">
          <div
            className="grid w-full"
            style={{
              gridTemplateColumns: `max-content repeat(${data.weeks.length}, minmax(0, 1fr))`,
              gridTemplateRows: `14px repeat(7, 13px)`,
              columnGap: "2px",
              rowGap: "2px",
            }}
            aria-hidden="true"
          >
            {/* corner */}
            <div />

            {/* month labels */}
            {data.weeks.map((week) => (
              <div key={`month-${week.days[0]?.date ?? "empty"}`} className="relative overflow-visible">
                {week.monthLabelDate ? (
                  <span className="absolute left-0 top-0 whitespace-nowrap text-[9px] leading-none text-muted-foreground">
                    {formatMonthLabel(locale, week.monthLabelDate)}
                  </span>
                ) : null}
              </div>
            ))}

            {/* 7 day rows: label + cells */}
            {getDayLabels(locale).flatMap((label, dayIndex) => [
              <div
                key={`dl-${dayIndex}`}
                className="flex items-center justify-end pr-1.5 text-[9px] leading-none text-muted-foreground"
              >
                {label}
              </div>,
              ...data.weeks.map((week) => {
                const day = week.days[dayIndex]
                if (!day) return <div key={`empty-${dayIndex}-${week.days[0]?.date ?? dayIndex}`} />
                return (
                  <div
                    key={day.date}
                    onMouseEnter={(e) => handleCellEnter(day, e.currentTarget)}
                    onMouseLeave={handleCellLeave}
                    className={cn(
                      "rounded-[2px] border transition-colors",
                      !day.inRange && "border-transparent bg-transparent",
                      day.inRange && day.level === 0 && "border-border/60 bg-muted/70 dark:border-border/50 dark:bg-muted/40",
                      day.inRange && day.level === 1 && "border-amber-200 bg-amber-100 dark:border-amber-900/80 dark:bg-amber-950/60",
                      day.inRange && day.level === 2 && "border-amber-300 bg-amber-200 dark:border-amber-800 dark:bg-amber-900/80",
                      day.inRange && day.level === 3 && "border-amber-400 bg-amber-400 dark:border-amber-700 dark:bg-amber-700",
                      day.inRange && day.level === 4 && "border-amber-600 bg-amber-600 dark:border-amber-500 dark:bg-amber-500",
                      day.inRange && day.level > 0 && "hover:ring-1 hover:ring-amber-400/60 hover:ring-offset-1",
                    )}
                  />
                )
              }),
            ])}
          </div>
          {tooltip ? (
            <div
              className="pointer-events-none absolute z-10 whitespace-nowrap rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
              style={{
                left: tooltip.x,
                top: tooltip.y,
                transform: tooltipTransform(tooltip.vDir, tooltip.hAnchor),
              }}
            >
              <p className="font-medium">{formatDayDate(tooltip.day, locale)}</p>
              <p className="text-muted-foreground">{formatDayCounts(tooltip.day, t)}</p>
            </div>
          ) : null}
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
                  className={cn(
                    "size-3 rounded-[3px] border",
                    level === 0 && "border-border/60 bg-muted/70 dark:border-border/50 dark:bg-muted/40",
                    level === 1 && "border-amber-200 bg-amber-100 dark:border-amber-900/80 dark:bg-amber-950/60",
                    level === 2 && "border-amber-300 bg-amber-200 dark:border-amber-800 dark:bg-amber-900/80",
                    level === 3 && "border-amber-400 bg-amber-400 dark:border-amber-700 dark:bg-amber-700",
                    level === 4 && "border-amber-600 bg-amber-600 dark:border-amber-500 dark:bg-amber-500",
                  )}
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

function formatDayDate(day: DashboardActivityHeatmapDay, locale: AppLocale) {
  return new Intl.DateTimeFormat(getDateTimeLocale(locale), {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${day.date}T00:00:00.000Z`))
}

function formatDayCounts(
  day: DashboardActivityHeatmapDay,
  t: ReturnType<typeof getAppTranslator>["t"],
) {
  if (day.total === 0) {
    return t("dashboard.activityHeatmap.noActivity")
  }

  const parts: string[] = []

  if (day.games > 0) {
    parts.push(t("dashboard.activityHeatmap.gameCount", {count: day.games}))
  }

  if (day.puzzles > 0) {
    parts.push(t("dashboard.activityHeatmap.puzzleCount", {count: day.puzzles}))
  }

  return `${t("dashboard.activityHeatmap.trainingCount", {count: day.total})} · ${parts.join(" · ")}`
}
