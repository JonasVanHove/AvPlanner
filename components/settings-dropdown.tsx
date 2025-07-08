"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
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
import type { Locale } from "@/lib/i18n"

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

  const handleLanguageChange = (locale: Locale) => {
    try {
      const currentPath = window.location.pathname
      const pathSegments = currentPath.split("/")

      // Replace the locale in the URL
      if (pathSegments[1] === "en" || pathSegments[1] === "nl") {
        pathSegments[1] = locale
      } else {
        pathSegments.splice(1, 0, locale)
      }

      const newPath = pathSegments.join("/")
      window.location.href = newPath
    } catch (error) {
      console.error("Error changing language:", error)
      alert("Er is een fout opgetreden bij het wijzigen van de taal.")
    }
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const handleNotifications = async () => {
    try {
      if (!("Notification" in window)) {
        alert("Deze browser ondersteunt geen notificaties.")
        return
      }

      if (Notification.permission === "granted") {
        new Notification("Test notificatie", {
          body: "Notificaties zijn ingeschakeld voor AvPlanner!",
          icon: "/placeholder-logo.png",
        })
      } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission()
        if (permission === "granted") {
          new Notification("Notificaties ingeschakeld", {
            body: "Je ontvangt nu notificaties van AvPlanner!",
            icon: "/placeholder-logo.png",
          })
        } else {
          alert("Notificaties zijn uitgeschakeld.")
        }
      } else {
        alert("Notificaties zijn geblokkeerd. Schakel ze in via je browserinstellingen.")
      }
    } catch (error) {
      console.error("Error with notifications:", error)
      alert("Er is een fout opgetreden bij het instellen van notificaties.")
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
            <span>Exporteren</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-600" />

          <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
            {theme === "dark" ? (
              <>
                <Sun className="mr-2 h-4 w-4" />
                <span>Licht thema</span>
              </>
            ) : (
              <>
                <Moon className="mr-2 h-4 w-4" />
                <span>Donker thema</span>
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-600" />

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
            onClick={() => handleLanguageChange("en")}
            className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
              currentLocale === "en" ? "bg-blue-50 dark:bg-blue-900/20" : ""
            }`}
          >
            <Globe className="mr-2 h-4 w-4" />
            <span>English</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-600" />

          <DropdownMenuItem
            onClick={handleNotifications}
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Bell className="mr-2 h-4 w-4" />
            <span>Notificaties</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ExportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} members={members} />
    </>
  )
}
