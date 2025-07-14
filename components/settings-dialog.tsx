"use client"

import { cn } from "@/lib/utils"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Globe, Moon, Bell, Download, Send, FileSpreadsheet, FileText, Braces } from "lucide-react"
import { useTranslation, type Locale } from "@/lib/i18n"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
import * as XLSX from "xlsx"

interface Member {
  id: string
  first_name: string
  last_name: string
  email?: string
}

interface SettingsDialogProps {
  currentLocale: Locale
  members?: Member[]
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ currentLocale, members = [], isOpen, onOpenChange }: SettingsDialogProps) {
  const [darkMode, setDarkMode] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [simplifiedMode, setSimplifiedMode] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState("")
  const [isExporting, setIsExporting] = useState(false)
  const [isSendingNotification, setIsSendingNotification] = useState(false)
  const [exportFormat, setExportFormat] = useState<"excel" | "csv" | "json">("excel")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
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

    // Check for saved simplified mode preference
    const savedSimplifiedMode = localStorage.getItem("simplifiedMode") === "true"
    setSimplifiedMode(savedSimplifiedMode)

    // Set default date range (current month)
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    setStartDate(firstDay.toISOString().split("T")[0])
    setEndDate(lastDay.toISOString().split("T")[0])
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

  const handleSimplifiedModeToggle = (enabled: boolean) => {
    setSimplifiedMode(enabled)
    localStorage.setItem("simplifiedMode", enabled.toString())
    
    // Dispatch a custom event to notify other components
    window.dispatchEvent(new CustomEvent('simplifiedModeChanged', { detail: enabled }))
  }

  const sendNotification = async () => {
    if (!notificationMessage.trim()) return

    setIsSendingNotification(true)
    try {
      // Simulate sending notification (replace with actual implementation)
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Show browser notification if permission granted
      if (Notification.permission === "granted") {
        new Notification("Availability Planner", {
          body: notificationMessage,
          icon: "/favicon.ico",
        })
      } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission()
        if (permission === "granted") {
          new Notification("Availability Planner", {
            body: notificationMessage,
            icon: "/favicon.ico",
          })
        }
      }

      setNotificationMessage("")
      alert("Notification sent successfully!")
    } catch (error) {
      console.error("Error sending notification:", error)
      alert("Failed to send notification")
    } finally {
      setIsSendingNotification(false)
    }
  }

  const exportData = async () => {
    if (!startDate || !endDate || members.length === 0) return

    setIsExporting(true)
    try {
      const { data: availability, error } = await supabase
        .from("availability")
        .select("*")
        .in(
          "member_id",
          members.map((m) => m.id),
        )
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true })

      if (error) throw error

      // Combine member data with availability
      const exportData =
        availability?.map((avail) => {
          const member = members.find((m) => m.id === avail.member_id)
          return {
            Date: avail.date,
            "Member Name": `${member?.first_name} ${member?.last_name}`,
            Email: member?.email || "",
            Status: avail.status,
          }
        }) || []

      if (exportFormat === "excel") {
        downloadExcel(exportData)
      } else if (exportFormat === "csv") {
        downloadCSV(exportData)
      } else {
        downloadJSON(exportData)
      }
    } catch (error) {
      console.error("Error exporting data:", error)
      alert("Failed to export data")
    } finally {
      setIsExporting(false)
    }
  }

  const downloadExcel = (data: any[]) => {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Availability")
    XLSX.writeFile(wb, `availability_${startDate}_${endDate}.xlsx`)
  }

  const downloadCSV = (data: any[]) => {
    const headers = ["Date", "Member Name", "Email", "Status"]
    const csvContent = [
      headers.join(","),
      ...data.map((row) => [row.Date, `"${row["Member Name"]}"`, row.Email, row.Status].join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `availability_${startDate}_${endDate}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadJSON = (data: any[]) => {
    const jsonContent = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `availability_${startDate}_${endDate}.json`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full mx-4 max-h-[90vh] bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 dark:from-gray-800 dark:via-blue-900/20 dark:to-purple-900/20 border border-gray-200/50 dark:border-gray-700/50">
        <DialogHeader className="pb-4 flex-shrink-0">
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-gray-800 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
            Settings
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* Language Settings */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <Label className="text-sm font-medium">Language</Label>
              </div>
              <Select value={currentLocale} onValueChange={handleLanguageChange}>
                <SelectTrigger className="bg-white/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-600/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                  <SelectItem value="nl">🇳🇱 Nederlands</SelectItem>
                  <SelectItem value="fr">🇫🇷 Français</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Appearance Settings */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <Label className="text-sm font-medium">Dark Mode</Label>
              </div>
              <Switch
                checked={darkMode}
                onCheckedChange={handleDarkModeToggle}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-500 data-[state=checked]:to-indigo-500"
              />
            </div>

            <Separator />

            {/* Notifications Settings */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-green-600 dark:text-green-400" />
                <Label className="text-sm font-medium">Notifications</Label>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={handleNotificationsToggle}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500 data-[state=checked]:to-blue-500"
              />
            </div>

            {/* Send Notification */}
            {notifications && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Send Manual Notification</Label>
                <Textarea
                  placeholder="Enter your notification message..."
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  className="bg-white/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-600/50 resize-none"
                  rows={2}
                />
                <Button
                  onClick={sendNotification}
                  disabled={!notificationMessage.trim() || isSendingNotification}
                  size="sm"
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isSendingNotification ? "Sending..." : "Send Notification"}
                </Button>
              </div>
            )}

            <Separator />

            {/* View Mode Settings */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-gradient-to-r from-green-500 to-red-500"></div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">{t('settings.simplifiedMode')}</Label>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{t('settings.simplifiedModeDescription')}</p>
                </div>
              </div>
              <Switch
                checked={simplifiedMode}
                onCheckedChange={handleSimplifiedModeToggle}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500 data-[state=checked]:to-red-500"
              />
            </div>

            <Separator />

            {/* Export Settings */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <Label className="text-sm font-medium">Export Data</Label>
              </div>

              <div className="grid grid-cols-3 gap-1">
                <Button
                  variant={exportFormat === "excel" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExportFormat("excel")}
                  className={cn(
                    "text-xs px-2 py-1",
                    exportFormat === "excel" ? "bg-gradient-to-r from-green-600 to-green-700 text-white" : "",
                  )}
                >
                  <FileSpreadsheet className="h-3 w-3 mr-1" />
                  Excel
                </Button>
                <Button
                  variant={exportFormat === "csv" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExportFormat("csv")}
                  className={cn(
                    "text-xs px-2 py-1",
                    exportFormat === "csv" ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white" : "",
                  )}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  CSV
                </Button>
                <Button
                  variant={exportFormat === "json" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExportFormat("json")}
                  className={cn(
                    "text-xs px-2 py-1",
                    exportFormat === "json" ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white" : "",
                  )}
                >
                  <Braces className="h-3 w-3 mr-1" />
                  JSON
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-white/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-600/50 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-white/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-600/50 text-xs"
                  />
                </div>
              </div>

              <Button
                onClick={exportData}
                disabled={isExporting || !startDate || !endDate}
                size="sm"
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? "Exporting..." : `Export as ${exportFormat.toUpperCase()}`}
              </Button>
            </div>

            <Separator />

            {/* Team Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{members.length}</div>
                <div className="text-xs text-blue-600 dark:text-blue-400">Members</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-purple-700 dark:text-purple-300">Active</div>
                <div className="text-xs text-purple-600 dark:text-purple-400">Status</div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-4 flex-shrink-0 border-t border-gray-200/50 dark:border-gray-700/50">
          <Button
            onClick={() => onOpenChange(false)}
            size="sm"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-6 py-2 rounded-xl"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
