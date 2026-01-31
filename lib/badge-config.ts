import { 
  Award, 
  HelpingHand, 
  Flame, 
  Star, 
  Trophy, 
  Target, 
  Zap, 
  Sparkles, 
  Crown, 
  Rocket,
  Calendar
} from "lucide-react"

export type BadgeType =
  | "timely_completion"
  | "helped_other"
  | "streak_3"
  | "streak_10"
  | "perfect_month"
  | "perfect_quarter"
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

export type Locale = "en" | "nl" | "fr"

export interface BadgeConfigItem {
  icon: any
  color: string
  bgColor: string
  emoji?: string
  title: Record<Locale, string>
  description: Record<Locale, string>
  message?: Record<Locale, string>
}

export const badgeConfig: Record<BadgeType, BadgeConfigItem> = {
  timely_completion: {
    icon: Award,
    color: "text-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900/20",
    emoji: "🎯",
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
      en: "Team Helper",
      nl: "Team Helper",
      fr: "Aide d'Équipe",
    },
    description: {
      en: "Helped complete other members' schedules",
      nl: "Hielp andere leden hun planning in te vullen",
      fr: "Aidé à compléter les horaires des autres membres",
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
      en: "3-Week Streak",
      nl: "3-Weken Streak",
      fr: "Série de 3 Semaines",
    },
    description: {
      en: "Completed schedule on time for 3 weeks in a row",
      nl: "3 weken op rij tijdig ingevuld",
      fr: "Horaire complété à temps pendant 3 semaines d'affilée",
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
      en: "10-Week Champion",
      nl: "10-Weken Kampioen",
      fr: "Champion de 10 Semaines",
    },
    description: {
      en: "Completed schedule on time for 10 weeks in a row",
      nl: "10 weken op rij tijdig ingevuld",
      fr: "Horaire complété à temps pendant 10 semaines d'affilée",
    },
    message: {
      en: "You are a champion! 10 weeks of consistent planning!",
      nl: "Je bent een kampioen! 10 weken consistent planning!",
      fr: "Vous êtes un champion! 10 semaines de planification constante!",
    },
  },
  perfect_month: {
    icon: Star,
    color: "text-yellow-500",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
    emoji: "⭐",
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
    message: {
      en: "Incredible! You had a perfect month with flawless planning!",
      nl: "Ongelooflijk! Je hebt een perfecte maand gehad met foutloos planning!",
      fr: "Incroyable! Vous avez eu un mois parfait avec une planification impeccable!",
    },
  },
  perfect_quarter: {
    icon: Calendar,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/20",
    emoji: "📅",
    title: {
      en: "Perfect Quarter",
      nl: "Perfect Kwartaal",
      fr: "Trimestre Parfait",
    },
    description: {
      en: "Completed all schedules on time for an entire quarter (13 weeks)",
      nl: "Heel kwartaal alle planningen tijdig ingevuld (13 weken)",
      fr: "Tous les horaires complétés à temps pendant un trimestre entier (13 semaines)",
    },
    message: {
      en: "Outstanding! You had a perfect quarter with 13 weeks of flawless planning!",
      nl: "Uitzonderlijk! Je hebt een perfect kwartaal gehad met 13 weken foutloos planning!",
      fr: "Extraordinaire! Vous avez eu un trimestre parfait avec 13 semaines de planification impeccable!",
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
      en: "Worked remotely for an entire week",
      nl: "Hele week remote gewerkt",
      fr: "A travaillé à distance pendant une semaine complète",
    },
  },
}

/**
 * Get badge notification message - for use in notification component
 */
export function getBadgeNotificationMessage(badgeType: BadgeType, locale: Locale): string {
  const config = badgeConfig[badgeType]
  if (!config || !config.message) return ""
  return config.message[locale]
}

/**
 * Get badge notification title - for use in notification component
 */
export function getBadgeNotificationTitle(badgeType: BadgeType, locale: Locale): string {
  const config = badgeConfig[badgeType]
  if (!config) return ""
  const title = config.title[locale]
  return title + (locale === "en" ? " Badge Earned!" : locale === "nl" ? " Badge Verdiend!" : " Badge Gagné!")
}
