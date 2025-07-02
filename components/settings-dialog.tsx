"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Settings } from "lucide-react"
import { useTranslation, type Locale } from "@/lib/i18n"
import { useRouter, usePathname } from "next/navigation"
import { ExportDialog } from "./export-dialog"

interface Member {
  id: string
  first_name: string
  last_name: string
  email?: string
}

interface SettingsDialogProps {
  currentLocale: Locale
  members?: Member[]
}

export function SettingsDialog({ currentLocale, members = [] }: SettingsDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const { t } = useTranslation(currentLocale)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Check for saved dark mode preference
    const savedDarkMode = localStorage.getItem("darkMode") === "true"
    setDarkMode(savedDarkMode)

    // Apply dark mode class
    if (savedDarkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }

    // Check for saved notifications preference
    const savedNotifications = localStorage.getItem("notifications") !== "false"
    setNotifications(savedNotifications)
  }, [])

  const handleLanguageChange = (newLocale: Locale) => {
    const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}/, "") || "/"
    const newPath = newLocale === "en" ? pathWithoutLocale : `/${newLocale}${pathWithoutLocale}`
    router.push(newPath)
  }

  const handleDarkModeToggle = (enabled: boolean) => {
    setDarkMode(enabled)
    localStorage.setItem("darkMode", enabled.toString())

    if (enabled) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }

  const handleNotificationsToggle = (enabled: boolean) => {
    setNotifications(enabled)
    localStorage.setItem("notifications", enabled.toString())
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("settings.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Language Setting */}
          <div className="space-y-2">
            <Label>{t("settings.language")}</Label>
            <Select value={currentLocale} onValueChange={handleLanguageChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">🇺🇸 English</SelectItem>
                <SelectItem value="nl">🇳🇱 Nederlands</SelectItem>
                <SelectItem value="fr">🇫🇷 Français</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dark Mode Setting */}
          <div className="flex items-center justify-between">
            <Label htmlFor="dark-mode">{t("settings.darkMode")}</Label>
            <Switch id="dark-mode" checked={darkMode} onCheckedChange={handleDarkModeToggle} />
          </div>

          {/* Notifications Setting */}
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications">{t("settings.notifications")}</Label>
            <Switch id="notifications" checked={notifications} onCheckedChange={handleNotificationsToggle} />
          </div>

          <Separator />

          {/* Export Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("settings.export")}</Label>
            <ExportDialog members={members} locale={currentLocale} />
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setIsOpen(false)}>{t("common.close")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
