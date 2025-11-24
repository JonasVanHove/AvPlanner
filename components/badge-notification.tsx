"use client"

import { useEffect, useState } from "react"
import { Award, HelpingHand, Flame, Star, Trophy, X, Target, Crown, Zap } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { type Locale } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { createConfetti } from "@/lib/confetti"

export type BadgeType =
  | "timely_completion"
  | "helped_other"
  | "streak_3"
  | "streak_10"
  | "perfect_month"
  | "collaboration"
  | "early_bird"
  | "consistency_30"
  | "consistency_90"
  | "attendance_100"
  | "time_1h"
  | "time_10h"
  | "time_50h"
  | "time_200h"

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
  collaboration: {
    icon: HelpingHand,
    color: "text-teal-600",
    bgColor: "bg-teal-100 dark:bg-teal-900/20",
    emoji: "🤝",
    title: {
      en: "Collaboration Badge Earned!",
      nl: "Samenwerkingsbadge Verdiend!",
      fr: "Badge de Collaboration Gagné!",
    },
    message: {
      en: "Nice work collaborating with your team to improve schedules!",
      nl: "Goed gedaan met samenwerken om de planningen te verbeteren!",
      fr: "Beau travail en collaborant avec votre équipe pour améliorer les plannings!",
    },
  },
  early_bird: {
    icon: Target,
    color: "text-sky-500",
    bgColor: "bg-sky-100 dark:bg-sky-900/20",
    emoji: "🌅",
    title: {
      en: "Early Bird Badge!",
      nl: "Vroege Vogel Badge!",
      fr: "Badge Lève-tôt!",
    },
    message: {
      en: "You consistently filled schedules early — great planning!",
      nl: "Je vult consequent vroeg in — top planning!",
      fr: "Vous remplissez régulièrement les plannings en avance — super planification!",
    },
  },
  consistency_30: {
    icon: Crown,
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/20",
    emoji: "🏅",
    title: {
      en: "30-Day Consistency Badge!",
      nl: "30 Dagen Consistent Badge!",
      fr: "Badge Cohérence 30 Jours!",
    },
    message: {
      en: "Great consistency — 30 days of reliable scheduling!",
      nl: "Geweldige consistentie — 30 dagen betrouwbaar plannen!",
      fr: "Grande cohérence — 30 jours de planification fiable!",
    },
  },
  consistency_90: {
    icon: Crown,
    color: "text-amber-700",
    bgColor: "bg-amber-200 dark:bg-amber-900/30",
    emoji: "🏅",
    title: {
      en: "90-Day Consistency Badge!",
      nl: "90 Dagen Consistent Badge!",
      fr: "Badge Cohérence 90 Jours!",
    },
    message: {
      en: "Incredible — 90 days of consistent scheduling!",
      nl: "Ongelooflijk — 90 dagen consequent plannen!",
      fr: "Incroyable — 90 jours de planification cohérente!",
    },
  },
  attendance_100: {
    icon: Star,
    color: "text-green-700",
    bgColor: "bg-green-100 dark:bg-green-900/20",
    emoji: "🌟",
    title: {
      en: "Perfect Attendance Badge!",
      nl: "Perfecte Aanwezigheid Badge!",
      fr: "Badge Présence Parfaite!",
    },
    message: {
      en: "Excellent attendance — keep it up!",
      nl: "Uitstekende aanwezigheid — ga zo door!",
      fr: "Excellente présence — continuez comme ça!",
    },
  },
  time_1h: {
    icon: Zap,
    color: "text-sky-500",
    bgColor: "bg-sky-100 dark:bg-sky-900/20",
    emoji: "⏱️",
    title: {
      en: "1 Hour Usage Badge!",
      nl: "1 Uur Gebruiksbadge!",
      fr: "Badge 1 Heure!",
    },
    message: {
      en: "Nice — you've spent at least an hour in the planner!",
      nl: "Goed zo — je hebt minstens een uur met de planner gewerkt!",
      fr: "Bien joué — vous avez passé au moins une heure sur le planificateur!",
    },
  },
  time_10h: {
    icon: Crown,
    color: "text-amber-500",
    bgColor: "bg-amber-100 dark:bg-amber-900/20",
    emoji: "🏅",
    title: {
      en: "10 Hour Usage Badge!",
      nl: "10 Uur Gebruiksbadge!",
      fr: "Badge 10 Heures!",
    },
    message: {
      en: "You've invested 10 hours — impressive dedication!",
      nl: "Je hebt 10 uur geïnvesteerd — indrukwekkende inzet!",
      fr: "Vous avez investi 10 heures — impressionnant!",
    },
  },
  time_50h: {
    icon: Crown,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
    emoji: "🏆",
    title: {
      en: "50 Hour Usage Badge!",
      nl: "50 Uur Gebruiksbadge!",
      fr: "Badge 50 Heures!",
    },
    message: {
      en: "Power user — 50 hours in the planner!",
      nl: "Power user — 50 uur in de planner!",
      fr: "Utilisateur expert — 50 heures!",
    },
  },
  time_200h: {
    icon: Crown,
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/20",
    emoji: "🌟",
    title: {
      en: "200 Hour Legend Badge!",
      nl: "200 Uur Legende Badge!",
      fr: "Badge Légende 200 Heures!",
    },
    message: {
      en: "Legendary — 200 hours of planner use!",
      nl: "Legendarisch — 200 uur plannergebruik!",
      fr: "Légendaire — 200 heures d'utilisation!",
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
