"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Settings, Download, Moon, Sun, Globe, Bell } from "lucide-react"
import { ExportDialog } from "./export-dialog"
import { useTheme } from "next-themes"
import { useTranslation, type Locale } from "@/lib/i18n"

interface Member {
  id: string
  first_name: string
  last_name: string
  email?: string
  profile_image?: string
}

interface SettingsDropdownProps {
  currentLocale: Locale
  members: Member[]
}

export function SettingsDropdown({ currentLocale, members }: SettingsDropdownProps) {
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation(currentLocale)

  const handleLanguageChange = (locale: Locale) => {
    try {
      const currentPath = window.location.pathname
      const pathSegments = currentPath.split("/")

      // Replace the locale in the URL
      if (pathSegments[1] === "en" || pathSegments[1] === "nl" || pathSegments[1] === "fr") {
        pathSegments[1] = locale
      } else {
        pathSegments.splice(1, 0, locale)
      }

      const newPath = pathSegments.join("/")
      window.location.href = newPath
    } catch (error) {
      console.error("Error changing language:", error)
      alert(t("common.error") || "Er is een fout opgetreden bij het wijzigen van de taal.")
    }
  }

  const handleNotifications = async () => {
    try {
      if (!("Notification" in window)) {
        alert(currentLocale === "en" ? "This browser doesn't support notifications." : 
              currentLocale === "nl" ? "Deze browser ondersteunt geen notificaties." :
              "Ce navigateur ne prend pas en charge les notifications.")
        return
      }

      if (Notification.permission === "granted") {
        new Notification("Availability Planner", {
          body: currentLocale === "en" ? "Notifications are enabled for AvPlanner!" :
                currentLocale === "nl" ? "Notificaties zijn ingeschakeld voor AvPlanner!" :
                "Les notifications sont activées pour AvPlanner!",
          icon: "/placeholder-logo.png",
        })
      } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission()
        if (permission === "granted") {
          new Notification(currentLocale === "en" ? "Notifications enabled" :
                          currentLocale === "nl" ? "Notificaties ingeschakeld" :
                          "Notifications activées", {
            body: currentLocale === "en" ? "You will now receive notifications from AvPlanner!" :
                  currentLocale === "nl" ? "Je ontvangt nu notificaties van AvPlanner!" :
                  "Vous recevrez maintenant des notifications d'AvPlanner!",
            icon: "/placeholder-logo.png",
          })
        } else {
          alert(currentLocale === "en" ? "Notifications are disabled." :
                currentLocale === "nl" ? "Notificaties zijn uitgeschakeld." :
                "Les notifications sont désactivées.")
        }
      } else {
        alert(currentLocale === "en" ? "Notifications are blocked. Enable them via your browser settings." :
              currentLocale === "nl" ? "Notificaties zijn geblokkeerd. Schakel ze in via je browserinstellingen." :
              "Les notifications sont bloquées. Activez-les via les paramètres de votre navigateur.")
      }
    } catch (error) {
      console.error("Error with notifications:", error)
      alert(currentLocale === "en" ? "An error occurred while setting up notifications." :
            currentLocale === "nl" ? "Er is een fout opgetreden bij het instellen van notificaties." :
            "Une erreur s'est produite lors de la configuration des notifications.")
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 bg-transparent"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        >
          <DropdownMenuItem
            onClick={() => setExportDialogOpen(true)}
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Download className="mr-2 h-4 w-4" />
            <span>{t("settings.export")}</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-600" />

          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
            <div className="flex items-center">
              {theme === "dark" ? (
                <Moon className="mr-2 h-4 w-4" />
              ) : (
                <Sun className="mr-2 h-4 w-4" />
              )}
              <Label htmlFor="dark-mode-toggle" className="text-sm font-medium cursor-pointer">
                {t("settings.darkMode")}
              </Label>
            </div>
            <Switch
              id="dark-mode-toggle"
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </div>

          <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-600" />

          {/* Language Options */}
          <DropdownMenuItem
            onClick={() => handleLanguageChange("en")}
            className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
              currentLocale === "en" ? "bg-blue-50 dark:bg-blue-900/20" : ""
            }`}
          >
            <Globe className="mr-2 h-4 w-4" />
            <span>English</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleLanguageChange("nl")}
            className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
              currentLocale === "nl" ? "bg-blue-50 dark:bg-blue-900/20" : ""
            }`}
          >
            <Globe className="mr-2 h-4 w-4" />
            <span>Nederlands</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleLanguageChange("fr")}
            className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
              currentLocale === "fr" ? "bg-blue-50 dark:bg-blue-900/20" : ""
            }`}
          >
            <Globe className="mr-2 h-4 w-4" />
            <span>Français</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-600" />

          <DropdownMenuItem
            onClick={handleNotifications}
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Bell className="mr-2 h-4 w-4" />
            <span>{t("settings.notifications")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ExportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} members={members} locale={currentLocale} />
    </>
  )
}
