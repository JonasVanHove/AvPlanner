"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { type Locale } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { createConfetti } from "@/lib/confetti"
import { badgeConfig, type BadgeType } from "@/lib/badge-config"

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
