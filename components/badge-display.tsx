"use client"

import { Award, HelpingHand, Flame, Star, Trophy, Target, Zap, Sparkles, Crown, Rocket } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { type Locale } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export type BadgeType =
  | "timely_completion"
  | "helped_other"
  | "streak_3"
  | "streak_10"
  | "perfect_month"
  | "activity_10"
  | "activity_50"
  | "activity_100"
  | "activity_500"
  | "activity_1000"
  | "collaboration"
  | "early_bird"
  | "night_shift"
  | "consistency_30"
  | "consistency_90"
  | "attendance_100"
  | "time_1h"
  | "time_10h"
  | "time_50h"
  | "time_200h"
  | "remote_3_days"
  | "holiday_5_days"
  | "remote_full_week"

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
  time_1h: {
    icon: Zap,
    color: "text-sky-500",
    bgColor: "bg-sky-100 dark:bg-sky-900/20",
    title: { en: "1 Hour Spent", nl: "1 Uur Gespend", fr: "1 Heure Passée" },
    description: { en: "Spent at least 1 hour using the planner", nl: "Minstens 1 uur met de planner gewerkt", fr: "Au moins 1 heure passée sur le planificateur" },
  },
  time_10h: {
    icon: Crown,
    color: "text-amber-500",
    bgColor: "bg-amber-100 dark:bg-amber-900/20",
    title: { en: "10 Hours Spent", nl: "10 Uur Gespend", fr: "10 Heures Passées" },
    description: { en: "Accumulated 10 hours of usage", nl: "10 uur totaal gebruikt", fr: "10 heures d'utilisation accumulées" },
  },
  time_50h: {
    icon: Crown,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
    title: { en: "50 Hours Spent", nl: "50 Uur Gespend", fr: "50 Heures Passées" },
    description: { en: "Accumulated 50 hours of usage", nl: "50 uur totaal gebruikt", fr: "50 heures d'utilisation accumulées" },
  },
  time_200h: {
    icon: Crown,
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/20",
    title: { en: "200 Hours Spent", nl: "200 Uur Gespend", fr: "200 Heures Passées" },
    description: { en: "Power user: 200 hours of planner usage", nl: "Power user: 200 uur plannergebruik", fr: "Utilisateur puissant : 200 heures d'utilisation" },
  },
  collaboration: {
    icon: HelpingHand,
    color: "text-teal-600",
    bgColor: "bg-teal-100 dark:bg-teal-900/20",
    title: {
      en: "Collaboration",
      nl: "Samenwerking",
      fr: "Collaboration",
    },
    description: {
      en: "Actively collaborated with teammates to improve schedules",
      nl: "Actief samengewerkt met teamleden om planningen te verbeteren",
      fr: "A collaboré activement avec les coéquipiers pour améliorer les plannings",
    },
  },
  early_bird: {
    icon: Target,
    color: "text-sky-500",
    bgColor: "bg-sky-100 dark:bg-sky-900/20",
    title: {
      en: "Early Bird",
      nl: "Vroege Vogel",
      fr: "Lève-tôt",
    },
    description: {
      en: "Consistently filled schedules early for upcoming weeks",
      nl: "Consistent planningen vroeg invullen voor komende weken",
      fr: "Remplit régulièrement les plannings en avance pour les semaines à venir",
    },
  },
  night_shift: {
    icon: Zap,
    color: "text-violet-500",
    bgColor: "bg-violet-100 dark:bg-violet-900/20",
    title: {
      en: "Night Shift",
      nl: "Nachtwerker",
      fr: "Travail de Nuit",
    },
    description: {
      en: "Filled schedules outside typical hours",
      nl: "Planningen ingevuld buiten de gebruikelijke uren",
      fr: "A rempli des plannings en dehors des heures habituelles",
    },
  },
  consistency_30: {
    icon: Crown,
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/20",
    title: {
      en: "30-Day Consistency",
      nl: "30 Dagen Consistent",
      fr: "Cohérence de 30 Jours",
    },
    description: {
      en: "Filled schedules consistently for 30 days",
      nl: "Consistent planningen ingevuld gedurende 30 dagen",
      fr: "A rempli régulièrement les plannings pendant 30 jours",
    },
  },
  consistency_90: {
    icon: Crown,
    color: "text-amber-700",
    bgColor: "bg-amber-200 dark:bg-amber-900/30",
    title: {
      en: "90-Day Consistency",
      nl: "90 Dagen Consistent",
      fr: "Cohérence de 90 Jours",
    },
    description: {
      en: "Filled schedules consistently for 90 days",
      nl: "Consistent planningen ingevuld gedurende 90 dagen",
      fr: "A rempli régulièrement les plannings pendant 90 jours",
    },
  },
  attendance_100: {
    icon: Star,
    color: "text-green-700",
    bgColor: "bg-green-100 dark:bg-green-900/20",
    title: {
      en: "Perfect Attendance",
      nl: "Perfecte Aanwezigheid",
      fr: "Présence Parfaite",
    },
    description: {
      en: "Maintained 100% attendance for a milestone period",
      nl: "100% aanwezigheid gehandhaafd voor een mijlpaalperiode",
      fr: "Maintenu une présence de 100% pendant une période jalon",
    },
  },
  remote_3_days: {
    icon: Zap,
    color: "text-violet-500",
    bgColor: "bg-violet-100 dark:bg-violet-900/20",
    title: {
      en: "Remote Worker",
      nl: "Thuiswerker",
      fr: "Travailleur Remote",
    },
    description: {
      en: "Worked remotely at least 3 days this week",
      nl: "Minstens 3 dagen remote gewerkt deze week",
      fr: "A travaillé à distance au moins 3 jours cette semaine",
    },
  },
  holiday_5_days: {
    icon: Star,
    color: "text-yellow-500",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
    title: {
      en: "Holiday Tripper",
      nl: "Vakantieganger",
      fr: "Voyageur Vacances",
    },
    description: {
      en: "On holiday at least 5 days this week",
      nl: "Minstens 5 dagen op vakantie deze week",
      fr: "En vacances au moins 5 jours cette semaine",
    },
  },
  remote_full_week: {
    icon: Trophy,
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/20",
    title: {
      en: "Remote Full Week",
      nl: "Volledige Week Remote",
      fr: "Semaine Remote Complète",
    },
    description: {
      en: "Worked fully remote for the week (unlocked after a past full holiday week)",
      nl: "Volledige week remote gewerkt (ontgrendelt na een eerdere volledige vakantie week)",
      fr: "A travaillé entièrement à distance pour la semaine (débloqué après une semaine complète de vacances passée)",
    },
  },
}

export function BadgeDisplay({ badges, locale, className, size = "md", showCount = true, layout = "wrap" }: BadgeDisplayProps) {
  if (!badges || badges.length === 0) {
    return null
  }

  // Group badges by type
  const badgeCounts = badges.reduce((acc, badge) => {
    acc[badge.badge_type] = (acc[badge.badge_type] || 0) + 1
    return acc
  }, {} as Record<BadgeType, number>)

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
                    "relative flex items-center justify-center rounded-full cursor-pointer transition-transform hover:scale-110",
                    config.bgColor,
                    // glow + ring + subtle shadow
                    glowMap[config.color] ? `${glowMap[config.color]} ring-2 ring-opacity-40 shadow-sm hover:shadow-lg` : "ring-2 ring-yellow-200 ring-opacity-30 shadow-sm hover:shadow-lg",
                    sizeClasses[size]
                  )}
                >
                  <Icon className={cn(config.color, iconSizeClasses[size], "drop-shadow-md")} />
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
