"use client"

import { useEffect, useState } from "react"
import { Award, HelpingHand, Flame, Star, Trophy, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { type Locale } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { createConfetti } from "@/lib/confetti"

export type BadgeType = "timely_completion" | "helped_other" | "streak_3" | "streak_10" | "perfect_month"

interface BadgeNotification {
  type: BadgeType
  id: string
  week_year: string
  helped_count?: number
}

interface BadgeNotificationProps {
  badge: BadgeNotification
  locale: Locale
  onClose: () => void
}

const badgeConfig: Record<
  BadgeType,
  {
    icon: any
    color: string
    bgColor: string
    title: { en: string; nl: string; fr: string }
    message: { en: string; nl: string; fr: string }
    emoji: string
  }
> = {
  timely_completion: {
    icon: Award,
    color: "text-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900/20",
    emoji: "🎯",
    title: {
      en: "Timely Planner Badge Earned!",
      nl: "Tijdige Planner Badge Verdiend!",
      fr: "Badge Planificateur Ponctuel Gagné!",
    },
    message: {
      en: "You completed next week's schedule on time! Keep up the great work!",
      nl: "Je hebt de volgende week tijdig ingevuld! Blijf zo doorgaan!",
      fr: "Vous avez complété le programme de la semaine prochaine à temps! Continuez!",
    },
  },
  helped_other: {
    icon: HelpingHand,
    color: "text-green-500",
    bgColor: "bg-green-100 dark:bg-green-900/20",
    emoji: "🤝",
    title: {
      en: "Team Helper Badge Earned!",
      nl: "Team Helper Badge Verdiend!",
      fr: "Badge Aide d'Équipe Gagné!",
    },
    message: {
      en: "You helped complete other team members' schedules. Great teamwork!",
      nl: "Je hebt andere teamleden geholpen hun planning in te vullen. Top teamwork!",
      fr: "Vous avez aidé à compléter les horaires des autres membres. Super travail d'équipe!",
    },
  },
  streak_3: {
    icon: Flame,
    color: "text-orange-500",
    bgColor: "bg-orange-100 dark:bg-orange-900/20",
    emoji: "🔥",
    title: {
      en: "3-Week Streak Badge!",
      nl: "3-Weken Streak Badge!",
      fr: "Badge Série de 3 Semaines!",
    },
    message: {
      en: "Amazing! You've completed your schedule on time for 3 weeks straight!",
      nl: "Geweldig! Je hebt je planning 3 weken op rij tijdig ingevuld!",
      fr: "Incroyable! Vous avez complété votre horaire à temps pendant 3 semaines d'affilée!",
    },
  },
  streak_10: {
    icon: Trophy,
    color: "text-purple-500",
    bgColor: "bg-purple-100 dark:bg-purple-900/20",
    emoji: "🏆",
    title: {
      en: "10-Week Champion Badge!",
      nl: "10-Weken Kampioen Badge!",
      fr: "Badge Champion de 10 Semaines!",
    },
    message: {
      en: "Incredible! You're a true champion with 10 weeks of on-time completions!",
      nl: "Ongelooflijk! Je bent een echte kampioen met 10 weken tijdig invullen!",
      fr: "Incroyable! Vous êtes un vrai champion avec 10 semaines d'achèvements à temps!",
    },
  },
  perfect_month: {
    icon: Star,
    color: "text-yellow-500",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
    emoji: "⭐",
    title: {
      en: "Perfect Month Badge!",
      nl: "Perfecte Maand Badge!",
      fr: "Badge Mois Parfait!",
    },
    message: {
      en: "Outstanding! You completed everything on time for an entire month!",
      nl: "Uitstekend! Je hebt een hele maand alles tijdig ingevuld!",
      fr: "Exceptionnel! Vous avez tout complété à temps pendant un mois entier!",
    },
  },
}

export function BadgeNotificationComponent({ badge, locale, onClose }: BadgeNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Animate in
    setIsVisible(true)

    // Trigger confetti
    createConfetti()

    // Auto-close after 8 seconds
    const timeout = setTimeout(() => {
      handleClose()
    }, 8000)

    return () => {
      clearTimeout(timeout)
    }
  }, [badge])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300) // Wait for animation
  }

  const config = badgeConfig[badge.type]
  if (!config) return null

  const Icon = config.icon

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-[9998] transform transition-all duration-300 ease-out",
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
    >
      <Card className="w-96 shadow-2xl border-2 overflow-hidden">
        <CardContent className="p-0">
          <div className={cn("p-4", config.bgColor)}>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center rounded-full bg-white dark:bg-gray-800 h-12 w-12 flex-shrink-0">
                <Icon className={cn(config.color, "h-6 w-6")} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-lg">
                    {config.emoji} {config.title[locale]}
                  </h3>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-white/50" onClick={handleClose}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm mt-1 text-gray-700 dark:text-gray-200">
                  {config.message[locale]}
                  {badge.helped_count && badge.helped_count > 0 && (
                    <span className="font-semibold">
                      {" "}
                      ({badge.helped_count}{" "}
                      {badge.helped_count === 1
                        ? locale === "nl"
                          ? "persoon"
                          : locale === "fr"
                          ? "personne"
                          : "person"
                        : locale === "nl"
                        ? "personen"
                        : locale === "fr"
                        ? "personnes"
                        : "people"}
                      )
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 text-xs text-muted-foreground text-center">
            {badge.week_year}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
