"use client"

import { useEffect, useState } from "react"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Calendar, CheckCircle2, Target } from "lucide-react"
import { type Locale } from "@/lib/i18n"
import { cn } from "@/lib/utils"

interface BadgeProgressProps {
  memberId: string
  teamId: string
  locale: Locale
  className?: string
  weekendsAsWeekdays?: boolean
}

interface ProgressData {
  nextWeekProgress: number
  daysCompleted: number
  daysRequired: number
  isEligible: boolean
}

export function BadgeProgress({ memberId, teamId, locale, className, weekendsAsWeekdays = false }: BadgeProgressProps) {
  const [progress, setProgress] = useState<ProgressData>({
    nextWeekProgress: 0,
    daysCompleted: 0,
    daysRequired: weekendsAsWeekdays ? 7 : 5,
    isEligible: false,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkProgress()
  }, [memberId, teamId, weekendsAsWeekdays])

  const checkProgress = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/badges/check?memberId=${memberId}&teamId=${teamId}`)
      const data = await response.json()

      if (data.success && data.eligible) {
        // Calculate next week progress from current availability data
        // This is a simplified version - you might want to fetch actual availability data
        setProgress({
          nextWeekProgress: data.eligible.timelyCompletion ? 100 : 0,
          daysCompleted: data.eligible.timelyCompletion ? (weekendsAsWeekdays ? 7 : 5) : 0,
          daysRequired: weekendsAsWeekdays ? 7 : 5,
          isEligible: data.eligible.timelyCompletion,
        })
      }
    } catch (error) {
      console.error("Error checking badge progress:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const texts = {
    title: {
      en: "Next Week Progress",
      nl: "Voortgang Volgende Week",
      fr: "Progrès de la Semaine Prochaine",
    },
    completed: {
      en: "Completed",
      nl: "Voltooid",
      fr: "Terminé",
    },
    eligible: {
      en: "Ready for badge!",
      nl: "Klaar voor badge!",
      fr: "Prêt pour le badge!",
    },
    daysLeft: {
      en: "days to complete",
      nl: "dagen te gaan",
      fr: "jours à compléter",
    },
  }

  if (isLoading) {
    return null
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className={cn("cursor-pointer hover:shadow-md transition-shadow", className)}>
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full h-10 w-10 flex-shrink-0",
                    progress.isEligible
                      ? "bg-green-100 dark:bg-green-900/20"
                      : "bg-blue-100 dark:bg-blue-900/20"
                  )}
                >
                  {progress.isEligible ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Target className="h-5 w-5 text-blue-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {texts.title[locale]}
                    </span>
                    <span className="text-xs font-semibold">
                      {progress.daysCompleted}/{progress.daysRequired}
                    </span>
                  </div>
                  <Progress value={progress.nextWeekProgress} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            {progress.isEligible ? (
              <>
                <div className="font-semibold text-green-500">✨ {texts.eligible[locale]}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {progress.daysCompleted} / {progress.daysRequired} {texts.completed[locale].toLowerCase()}
                </div>
              </>
            ) : (
              <>
                <div className="font-semibold">{texts.title[locale]}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {progress.daysRequired - progress.daysCompleted} {texts.daysLeft[locale]}
                </div>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Simplified badge icon indicator for use in headers/toolbars
interface BadgeIndicatorProps {
  badgeCount: number
  locale: Locale
  onClick?: () => void
  className?: string
}

export function BadgeIndicator({ badgeCount, locale, onClick, className }: BadgeIndicatorProps) {
  if (badgeCount === 0) return null

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20 h-8 w-8 hover:bg-yellow-200 dark:hover:bg-yellow-900/30 transition-colors",
        className
      )}
    >
      <Target className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
        {badgeCount > 9 ? "9+" : badgeCount}
      </div>
    </button>
  )
}
