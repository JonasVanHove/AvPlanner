"use client"

import { Award, HelpingHand, Flame, Star, Trophy, Target, Zap, Sparkles, Crown, Rocket } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { type Locale } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export type BadgeType = "timely_completion" | "helped_other" | "streak_3" | "streak_10" | "perfect_month" | "activity_10" | "activity_50" | "activity_100" | "activity_500" | "activity_1000"

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
}

const badgeConfig: Record<
  BadgeType,
  {
    icon: any
    color: string
    bgColor: string
    title: { en: string; nl: string; fr: string }
    description: { en: string; nl: string; fr: string }
  }
> = {
  timely_completion: {
    icon: Award,
    color: "text-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900/20",
    title: {
      en: "Timely Planner",
      nl: "Tijdige Planner",
      fr: "Planificateur Ponctuel",
    },
    description: {
      en: "Completed next week's schedule on time",
      nl: "Volgende week tijdig ingevuld",
      fr: "Programme de la semaine prochaine complété à temps",
    },
  },
  helped_other: {
    icon: HelpingHand,
    color: "text-green-500",
    bgColor: "bg-green-100 dark:bg-green-900/20",
    title: {
      en: "Team Helper",
      nl: "Team Helper",
      fr: "Aide d'Équipe",
    },
    description: {
      en: "Helped complete other members' schedules",
      nl: "Hielp andere leden hun planning in te vullen",
      fr: "Aidé à compléter les horaires des autres membres",
    },
  },
  streak_3: {
    icon: Flame,
    color: "text-orange-500",
    bgColor: "bg-orange-100 dark:bg-orange-900/20",
    title: {
      en: "3-Week Streak",
      nl: "3-Weken Streak",
      fr: "Série de 3 Semaines",
    },
    description: {
      en: "Completed schedule on time for 3 weeks in a row",
      nl: "3 weken op rij tijdig ingevuld",
      fr: "Horaire complété à temps pendant 3 semaines d'affilée",
    },
  },
  streak_10: {
    icon: Trophy,
    color: "text-purple-500",
    bgColor: "bg-purple-100 dark:bg-purple-900/20",
    title: {
      en: "10-Week Champion",
      nl: "10-Weken Kampioen",
      fr: "Champion de 10 Semaines",
    },
    description: {
      en: "Completed schedule on time for 10 weeks in a row",
      nl: "10 weken op rij tijdig ingevuld",
      fr: "Horaire complété à temps pendant 10 semaines d'affilée",
    },
  },
  perfect_month: {
    icon: Star,
    color: "text-yellow-500",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
    title: {
      en: "Perfect Month",
      nl: "Perfecte Maand",
      fr: "Mois Parfait",
    },
    description: {
      en: "Completed all schedules on time for an entire month",
      nl: "Hele maand alle planningen tijdig ingevuld",
      fr: "Tous les horaires complétés à temps pendant un mois entier",
    },
  },
  activity_10: {
    icon: Target,
    color: "text-cyan-500",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/20",
    title: {
      en: "Getting Started",
      nl: "Aan de Slag",
      fr: "Démarrage",
    },
    description: {
      en: "Filled in 10 different days",
      nl: "10 verschillende dagen ingevuld",
      fr: "10 jours différents remplis",
    },
  },
  activity_50: {
    icon: Zap,
    color: "text-indigo-500",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/20",
    title: {
      en: "Active Planner",
      nl: "Actieve Planner",
      fr: "Planificateur Actif",
    },
    description: {
      en: "Filled in 50 different days",
      nl: "50 verschillende dagen ingevuld",
      fr: "50 jours différents remplis",
    },
  },
  activity_100: {
    icon: Sparkles,
    color: "text-pink-500",
    bgColor: "bg-pink-100 dark:bg-pink-900/20",
    title: {
      en: "Dedicated User",
      nl: "Toegewijde Gebruiker",
      fr: "Utilisateur Dévoué",
    },
    description: {
      en: "Filled in 100 different days",
      nl: "100 verschillende dagen ingevuld",
      fr: "100 jours différents remplis",
    },
  },
  activity_500: {
    icon: Crown,
    color: "text-amber-500",
    bgColor: "bg-amber-100 dark:bg-amber-900/20",
    title: {
      en: "Planning Master",
      nl: "Planning Meester",
      fr: "Maître de la Planification",
    },
    description: {
      en: "Filled in 500 different days",
      nl: "500 verschillende dagen ingevuld",
      fr: "500 jours différents remplis",
    },
  },
  activity_1000: {
    icon: Rocket,
    color: "text-red-500",
    bgColor: "bg-red-100 dark:bg-red-900/20",
    title: {
      en: "Legendary Planner",
      nl: "Legendarische Planner",
      fr: "Planificateur Légendaire",
    },
    description: {
      en: "Filled in 1000 different days",
      nl: "1000 verschillende dagen ingevuld",
      fr: "1000 jours différents remplis",
    },
  },
}

export function BadgeDisplay({ badges, locale, className, size = "md", showCount = true }: BadgeDisplayProps) {
  if (!badges || badges.length === 0) {
    return null
  }

  // Group badges by type
  const badgeCounts = badges.reduce((acc, badge) => {
    acc[badge.badge_type] = (acc[badge.badge_type] || 0) + 1
    return acc
  }, {} as Record<BadgeType, number>)

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

  return (
    <TooltipProvider>
      <div className={cn("flex flex-wrap gap-2", className)}>
        {Object.entries(badgeCounts).map(([type, count]) => {
          const config = badgeConfig[type as BadgeType]
          if (!config) return null

          const Icon = config.icon

          return (
            <Tooltip key={type}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "relative flex items-center justify-center rounded-full cursor-pointer transition-transform hover:scale-110",
                    config.bgColor,
                    sizeClasses[size]
                  )}
                >
                  <Icon className={cn(config.color, iconSizeClasses[size])} />
                  {showCount && count > 1 && (
                    <div className="absolute -top-1 -right-1 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                      {count}
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-semibold">{config.title[locale]}</div>
                  <div className="text-xs text-muted-foreground">{config.description[locale]}</div>
                  {showCount && count > 1 && (
                    <div className="text-xs mt-1 font-medium">
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
          <Card key={badge.badge_id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("flex items-center justify-center rounded-full h-12 w-12 flex-shrink-0", config.bgColor)}>
                  <Icon className={cn(config.color, "h-6 w-6")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{config.title[locale]}</div>
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
