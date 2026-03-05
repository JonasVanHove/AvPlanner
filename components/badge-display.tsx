"use client"

import React, { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { type Locale } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { badgeConfig, type BadgeType } from "@/lib/badge-config"

interface Badge {
  badge_id: string
  badge_type: BadgeType
  week_year: string
  earned_at: string
  team_name: string
  metadata?: any
}

interface BadgeDisplayProps {
  badges: Badge[]
  locale: Locale
  className?: string
  size?: "sm" | "md" | "lg"
  showCount?: boolean
  layout?: "wrap" | "row" // row = single-line horizontal group
}

function BadgeDisplayComponent({ badges, locale, className, size = "md", showCount = true, layout = "wrap" }: BadgeDisplayProps) {
  // Memoize badge counts calculation
  const badgeCounts = useMemo(() => {
    if (!badges || badges.length === 0) return {}
    return badges.reduce((acc, badge) => {
      acc[badge.badge_type] = (acc[badge.badge_type] || 0) + 1
      return acc
    }, {} as Record<BadgeType, number>)
  }, [badges])

  if (!badges || badges.length === 0) {
    return null
  }

  // Ensure a stable, predictable ordering:
  // - sort by category (prefix before first `_`, alphabetically)
  // - then by ascending competence (numeric suffix if present, e.g. activity_10 -> 10)
  const getCategory = (t: string) => t.split("_")[0]
  const getCompetenceValue = (t: string) => {
    const m = t.match(/\d+/)
    return m ? parseInt(m[0], 10) : 0
  }

  const sortedTypes = (Object.keys(badgeCounts) as BadgeType[]).sort((a, b) => {
    const ca = getCategory(a)
    const cb = getCategory(b)
    if (ca < cb) return -1
    if (ca > cb) return 1
    const va = getCompetenceValue(a)
    const vb = getCompetenceValue(b)
    if (va !== vb) return va - vb
    return a.localeCompare(b)
  })

  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  }

  const iconSizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-6 w-6",
  }

  const countBadgeClasses = {
    sm: "-bottom-2.5 h-4 min-w-5 px-1 text-[9px]",
    md: "-bottom-3 h-4.5 min-w-6 px-1.5 text-[10px]",
    lg: "-bottom-3.5 h-5 min-w-7 px-2 text-[11px]",
  }

  const getBadgeSurfaceClass = (type: BadgeType) => {
    if (type.startsWith("activity_")) return "bg-gradient-to-br from-cyan-100 to-indigo-200 dark:from-cyan-900/35 dark:to-indigo-900/35"
    if (type.startsWith("streak_") || type === "perfect_month" || type === "perfect_quarter") return "bg-gradient-to-br from-orange-100 to-amber-200 dark:from-orange-900/35 dark:to-amber-900/35"
    if (type.startsWith("consistency_") || type.startsWith("attendance_")) return "bg-gradient-to-br from-emerald-100 to-green-200 dark:from-emerald-900/35 dark:to-green-900/35"
    if (type.startsWith("time_")) return "bg-gradient-to-br from-sky-100 to-blue-200 dark:from-sky-900/35 dark:to-blue-900/35"
    if (type.startsWith("remote_") || type.startsWith("holiday_")) return "bg-gradient-to-br from-violet-100 to-fuchsia-200 dark:from-violet-900/35 dark:to-fuchsia-900/35"
    if (type === "helped_other" || type === "collaboration") return "bg-gradient-to-br from-green-100 to-teal-200 dark:from-green-900/35 dark:to-teal-900/35"
    if (type === "early_bird" || type === "night_shift") return "bg-gradient-to-br from-yellow-100 to-amber-200 dark:from-yellow-900/35 dark:to-amber-900/35"
    return "bg-gradient-to-br from-blue-100 to-purple-200 dark:from-blue-900/35 dark:to-purple-900/35"
  }

  // Map badge icon color classes to an appropriate ring/glow class
  const glowMap: Record<string, string> = {
    "text-blue-500": "ring-blue-300",
    "text-green-500": "ring-green-300",
    "text-orange-500": "ring-orange-300",
    "text-purple-500": "ring-purple-300",
    "text-yellow-500": "ring-yellow-300",
    "text-cyan-500": "ring-cyan-300",
    "text-indigo-500": "ring-indigo-300",
    "text-pink-500": "ring-pink-300",
    "text-amber-500": "ring-amber-300",
    "text-red-500": "ring-red-300",
    "text-sky-500": "ring-sky-300",
    "text-teal-600": "ring-teal-300",
    "text-violet-500": "ring-violet-300",
    "text-yellow-600": "ring-yellow-300",
    "text-amber-600": "ring-amber-300",
    "text-amber-700": "ring-amber-300",
    "text-red-600": "ring-red-300",
    "text-green-700": "ring-green-300",
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          // if layout=row, keep items on one line with horizontal scroll if needed
          layout === "row" ? "flex gap-2 flex-nowrap overflow-x-auto py-1" : "flex flex-wrap gap-2",
          className
        )}
      >
        {sortedTypes.map((type) => {
          const count = badgeCounts[type]
          const config = badgeConfig[type as BadgeType]
          if (!config) return null

          const Icon = config.icon

          return (
            <Tooltip key={type}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "group relative flex items-center justify-center rounded-full cursor-pointer transition-all duration-200 hover:scale-110 border border-white/70 dark:border-white/15",
                    getBadgeSurfaceClass(type),
                    // glow + ring + subtle shadow
                    glowMap[config.color] ? `${glowMap[config.color]} ring-2 ring-opacity-40 shadow-sm hover:shadow-lg` : "ring-2 ring-yellow-200 ring-opacity-30 shadow-sm hover:shadow-lg",
                    sizeClasses[size]
                  )}
                >
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                  <Icon className={cn(config.color, iconSizeClasses[size], "drop-shadow-md")} />
                  {showCount && count > 1 && (
                    <div className={cn(
                      "absolute left-1/2 -translate-x-1/2 bg-gray-900/95 dark:bg-gray-100 text-white dark:text-gray-900 font-bold rounded-full flex items-center justify-center shadow-sm border border-white/20 dark:border-black/10 z-10",
                      countBadgeClasses[size]
                    )}>
                      ×{count}
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent className="border-border/60 bg-background/95 backdrop-blur-sm">
                <div className="text-center space-y-0.5">
                  <div className="font-semibold tracking-tight">{config.title[locale]}</div>
                  <div className="text-xs text-muted-foreground">{config.description[locale]}</div>
                  {showCount && count > 1 && (
                    <div className="text-xs mt-1 font-semibold text-primary">
                      {locale === "nl" ? `${count}x verdiend` : locale === "fr" ? `Gagné ${count}x` : `Earned ${count}x`}
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}

export const BadgeDisplay = React.memo(BadgeDisplayComponent)

// Separate component for detailed badge list
interface BadgeListProps {
  badges: Badge[]
  locale: Locale
  className?: string
}

export function BadgeList({ badges, locale, className }: BadgeListProps) {
  if (!badges || badges.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        {locale === "nl" ? "Nog geen badges verdiend" : locale === "fr" ? "Aucun badge gagné" : "No badges earned yet"}
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      {badges.map((badge) => {
        const config = badgeConfig[badge.badge_type]
        if (!config) return null

        const Icon = config.icon
        const earnedDate = new Date(badge.earned_at)

        return (
          <Card key={badge.badge_id} className="overflow-hidden border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("flex items-center justify-center rounded-full h-12 w-12 flex-shrink-0 border border-white/70 dark:border-white/10 shadow-sm", config.bgColor)}>
                  <Icon className={cn(config.color, "h-6 w-6")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold tracking-tight text-foreground">{config.title[locale]}</div>
                  <div className="text-sm text-muted-foreground">{config.description[locale]}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {earnedDate.toLocaleDateString(locale)} · {badge.team_name}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
