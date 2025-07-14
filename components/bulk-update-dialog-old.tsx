"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CalendarIcon, Users, Clock, CheckCircle, Calendar as CalendarDays, Zap, Bolt, Target, Filter, Play, BarChart3 } from "lucide-react"
import { format, addDays, startOfWeek, endOfWeek, addWeeks, isWeekend, startOfMonth, endOfMonth } from "date-fns"
import { nl } from "date-fns/locale"
import { supabase } from "@/lib/supabase"
import { useTranslation, type Locale } from "@/lib/i18n"
import { MemberAvatar } from "./member-avatar"
import { cn } from "@/lib/utils"

interface Member {
  id: string
  first_name: string
  last_name: string
  email?: string
  profile_image?: string
}

interface BulkUpdateDialogProps {
  members: Member[]
  locale: Locale
  onUpdate: () => void
}

// Export individual button components
export function AnalyticsButton({ members, locale }: { members: Member[], locale: Locale }) {
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [analyticsLevel, setAnalyticsLevel] = useState<"day" | "week" | "month">("week")
  const [simplifiedMode, setSimplifiedMode] = useState(false)
  const { t } = useTranslation(locale)

  // Check for simplified mode preference
  useEffect(() => {
    const checkSimplifiedMode = () => {
      const savedSimplifiedMode = localStorage.getItem("simplifiedMode") === "true"
      setSimplifiedMode(savedSimplifiedMode)
    }

    // Check on mount
    checkSimplifiedMode()

    // Listen for simplified mode changes
    const handleSimplifiedModeChange = (event: CustomEvent) => {
      setSimplifiedMode(event.detail)
    }

    window.addEventListener('simplifiedModeChanged', handleSimplifiedModeChange as EventListener)

    return () => {
      window.removeEventListener('simplifiedModeChanged', handleSimplifiedModeChange as EventListener)
    }
  }, [])

  // Analytics functions (duplicated for this component)
  const fetchAnalyticsData = async () => {
    try {
      const { data, error } = await supabase
        .from("availability")
        .select(`
          date,
          status,
          member_id,
          members!inner(first_name, last_name)
        `)
        .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .lte('date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

      if (error) throw error

      const processedData = processAnalyticsData(data || [])
      setAnalyticsData(processedData)
    } catch (error) {
      console.error("Analytics fetch error:", error)
    }
  }

  const processAnalyticsData = (data: any[]) => {
    // Create a map to track unique member-date combinations
    const uniqueEntries = new Map<string, any>()
    
    // Process data to ensure only one entry per member per date
    data.forEach(entry => {
      const key = `${entry.member_id}-${entry.date}`
      // Keep the most recent entry for each member-date combination
      if (!uniqueEntries.has(key) || new Date(entry.created_at || 0) > new Date(uniqueEntries.get(key).created_at || 0)) {
        uniqueEntries.set(key, entry)
      }
    })

    // Convert back to array for processing
    const deduplicatedData = Array.from(uniqueEntries.values())

    const statusCounts: Record<string, Record<string, number>> = {}

    deduplicatedData.forEach(entry => {
      const date = entry.date
      const status = entry.status

      if (!statusCounts[date]) {
        statusCounts[date] = {
          available: 0,
          remote: 0,
          unavailable: 0,
          need_to_check: 0,
          absent: 0,
          holiday: 0
        }
      }

      statusCounts[date][status] = (statusCounts[date][status] || 0) + 1
    })

    type DayData = {
      date: string
      available: number
      remote: number
      unavailable: number
      need_to_check: number
      absent: number
      holiday: number
      total: number
    }

    const dayData: DayData[] = Object.entries(statusCounts).map(([date, counts]) => ({
      date,
      available: counts.available || 0,
      remote: counts.remote || 0,
      unavailable: counts.unavailable || 0,
      need_to_check: counts.need_to_check || 0,
      absent: counts.absent || 0,
      holiday: counts.holiday || 0,
      total: Object.values(counts).reduce((sum: number, count: number) => sum + count, 0)
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    type WeekData = {
      week: string
      available: number
      remote: number
      unavailable: number
      need_to_check: number
      absent: number
      holiday: number
      total: number
    }

    const weekData: Record<string, WeekData> = {}
    dayData.forEach(day => {
      const date = new Date(day.date)
      const weekStart = startOfWeek(date, { weekStartsOn: 1 })
      const weekKey = format(weekStart, 'yyyy-MM-dd')
      
      if (!weekData[weekKey]) {
        weekData[weekKey] = {
          week: format(weekStart, 'MMM dd', { locale: nl }),
          available: 0,
          remote: 0,
          unavailable: 0,
          need_to_check: 0,
          absent: 0,
          holiday: 0,
          total: 0
        }
      }
      
      weekData[weekKey].available += day.available
      weekData[weekKey].remote += day.remote
      weekData[weekKey].unavailable += day.unavailable
      weekData[weekKey].need_to_check += day.need_to_check
      weekData[weekKey].absent += day.absent
      weekData[weekKey].holiday += day.holiday
      weekData[weekKey].total += day.total
    })

    type MonthData = {
      month: string
      available: number
      remote: number
      unavailable: number
      need_to_check: number
      absent: number
      holiday: number
      total: number
    }

    const monthData: Record<string, MonthData> = {}
    dayData.forEach(day => {
      const date = new Date(day.date)
      const monthKey = format(date, 'yyyy-MM')
      
      if (!monthData[monthKey]) {
        monthData[monthKey] = {
          month: format(date, 'MMMM yyyy', { locale: nl }),
          available: 0,
          remote: 0,
          unavailable: 0,
          need_to_check: 0,
          absent: 0,
          holiday: 0,
          total: 0
        }
      }
      
      monthData[monthKey].available += day.available
      monthData[monthKey].remote += day.remote
      monthData[monthKey].unavailable += day.unavailable
      monthData[monthKey].need_to_check += day.need_to_check
      monthData[monthKey].absent += day.absent
      monthData[monthKey].holiday += day.holiday
      monthData[monthKey].total += day.total
    })

    return {
      day: dayData,
      week: Object.values(weekData),
      month: Object.values(monthData)
    }
  }

  const handleShowAnalytics = async () => {
    setShowAnalytics(true)
    if (!analyticsData) {
      await fetchAnalyticsData()
    }
  }

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleShowAnalytics}
        className="rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-800/30 dark:hover:to-emerald-800/30 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
      >
        <BarChart3 className="h-4 w-4 mr-2" />
        {t("analytics.title")}
      </Button>

    {/* Analytics Dialog */}
    <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
      <DialogContent className="max-w-[95vw] sm:max-w-[85vw] lg:max-w-[1000px] bg-white dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-green-600" />
            {t("analytics.title")}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 dark:text-gray-300">
            {t("analytics.description")}
          </DialogDescription>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-2 mt-2">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              💡 {t("analytics.dataExplanation")}
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Analytics Level Selector */}
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium text-gray-900 dark:text-white">View:</Label>
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-md p-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAnalyticsLevel("day")}
                className={cn(
                  "text-xs font-medium transition-all duration-200 px-2 py-1 h-7",
                  analyticsLevel === "day" 
                    ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" 
                    : "text-gray-600 dark:text-gray-400"
                )}
              >
                Daily
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAnalyticsLevel("week")}
                className={cn(
                  "text-xs font-medium transition-all duration-200 px-2 py-1 h-7",
                  analyticsLevel === "week" 
                    ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" 
                    : "text-gray-600 dark:text-gray-400"
                )}
              >
                Weekly
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAnalyticsLevel("month")}
                className={cn(
                  "text-xs font-medium transition-all duration-200 px-2 py-1 h-7",
                  analyticsLevel === "month" 
                    ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" 
                    : "text-gray-600 dark:text-gray-400"
                )}
              >
                Monthly
              </Button>
            </div>
          </div>

          {/* Analytics Content */}
          {analyticsData ? (
            <div className="space-y-3">
              {/* Summary Cards */}
              <div className={cn(
                "grid gap-2",
                simplifiedMode 
                  ? "grid-cols-2" 
                  : "grid-cols-2 sm:grid-cols-3 md:grid-cols-6"
              )}>
                {simplifiedMode ? (
                  <>
                    {/* Simplified mode: Only Available (green) and Unavailable (red) */}
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 border border-green-200 dark:border-green-700">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full bg-green-600 flex-shrink-0"></div>
                        <Label className="text-xs font-medium text-green-800 dark:text-green-200 truncate">
                          {t("analytics.available")}
                        </Label>
                      </div>
                      <div className="text-base font-bold text-green-900 dark:text-green-100">
                        {analyticsData[analyticsLevel]?.reduce((sum: number, item: any) => sum + item.available + item.remote, 0) || 0}
                      </div>
                      <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                        {t("analytics.uniqueMembers")}
                      </div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 border border-red-200 dark:border-red-700">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full bg-red-600 flex-shrink-0"></div>
                        <Label className="text-xs font-medium text-red-800 dark:text-red-200 truncate">
                          {t("analytics.notAvailable")}
                        </Label>
                      </div>
                      <div className="text-base font-bold text-red-900 dark:text-red-100">
                        {analyticsData[analyticsLevel]?.reduce((sum: number, item: any) => sum + item.unavailable + item.holiday + item.absent + item.need_to_check, 0) || 0}
                      </div>
                      <div className="text-xs text-red-700 dark:text-red-300 mt-1">
                        {t("analytics.uniqueMembers")}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Full mode: All status types */}
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 border border-green-200 dark:border-green-700">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full bg-green-600 flex-shrink-0"></div>
                        <Label className="text-xs font-medium text-green-800 dark:text-green-200 truncate">Available</Label>
                      </div>
                      <div className="text-sm font-bold text-green-900 dark:text-green-100">
                        {analyticsData[analyticsLevel]?.reduce((sum: number, item: any) => sum + item.available, 0) || 0}
                      </div>
                      <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                        {t("analytics.peopleCount")}
                      </div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 border border-purple-200 dark:border-purple-700">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full bg-purple-600 flex-shrink-0"></div>
                        <Label className="text-xs font-medium text-purple-800 dark:text-purple-200 truncate">Remote</Label>
                      </div>
                      <div className="text-sm font-bold text-purple-900 dark:text-purple-100">
                        {analyticsData[analyticsLevel]?.reduce((sum: number, item: any) => sum + item.remote, 0) || 0}
                      </div>
                      <div className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                        {t("analytics.peopleCount")}
                      </div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 border border-red-200 dark:border-red-700">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full bg-red-600 flex-shrink-0"></div>
                        <Label className="text-xs font-medium text-red-800 dark:text-red-200 truncate">Unavailable</Label>
                      </div>
                      <div className="text-sm font-bold text-red-900 dark:text-red-100">
                        {analyticsData[analyticsLevel]?.reduce((sum: number, item: any) => sum + item.unavailable, 0) || 0}
                      </div>
                      <div className="text-xs text-red-700 dark:text-red-300 mt-1">
                        {t("analytics.peopleCount")}
                      </div>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2 border border-yellow-200 dark:border-yellow-700">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full bg-yellow-600 flex-shrink-0"></div>
                        <Label className="text-xs font-medium text-yellow-800 dark:text-yellow-200 truncate">Holiday</Label>
                      </div>
                      <div className="text-sm font-bold text-yellow-900 dark:text-yellow-100">
                        {analyticsData[analyticsLevel]?.reduce((sum: number, item: any) => sum + item.holiday, 0) || 0}
                      </div>
                      <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                        {t("analytics.peopleCount")}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0"></div>
                        <Label className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">Absent</Label>
                      </div>
                      <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {analyticsData[analyticsLevel]?.reduce((sum: number, item: any) => sum + item.absent, 0) || 0}
                      </div>
                      <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                        {t("analytics.peopleCount")}
                      </div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 border border-blue-200 dark:border-blue-700">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0"></div>
                        <Label className="text-xs font-medium text-blue-800 dark:text-blue-200 truncate">To Check</Label>
                      </div>
                      <div className="text-sm font-bold text-blue-900 dark:text-blue-100">
                        {analyticsData[analyticsLevel]?.reduce((sum: number, item: any) => sum + item.need_to_check, 0) || 0}
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        {t("analytics.peopleCount")}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Chart Representation */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                <Label className="text-sm font-bold text-gray-900 dark:text-white mb-2 block">
                  Availability Trend ({analyticsLevel === "day" ? "Daily" : analyticsLevel === "week" ? "Weekly" : "Monthly"})
                </Label>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {analyticsData[analyticsLevel]?.slice(-15).map((item: any, index: number) => {
                    const total = item.total || 1
                    
                    if (simplifiedMode) {
                      // Simplified mode: Green (available + remote) and Red (everything else)
                      const availableCount = item.available + item.remote
                      const notAvailableCount = item.unavailable + item.holiday + item.absent + item.need_to_check
                      const availablePercent = (availableCount / total) * 100
                      const notAvailablePercent = (notAvailableCount / total) * 100

                      return (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              {analyticsLevel === "day" ? format(new Date(item.date), "MMM dd", { locale: nl }) :
                               analyticsLevel === "week" ? item.week :
                               item.month}
                            </Label>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>
                                {availableCount} {availableCount === 1 ? t("analytics.person") : t("analytics.peopleCount")}
                              </span>
                              <span className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-600"></div>
                                {notAvailableCount} {notAvailableCount === 1 ? t("analytics.person") : t("analytics.peopleCount")}
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 flex overflow-hidden">
                            <div 
                              className="bg-green-600 h-full transition-all duration-300" 
                              style={{ width: `${availablePercent}%` }}
                              title={`${t("analytics.available")} (${t("analytics.includesRemote")}): ${availableCount} ${availableCount === 1 ? t("analytics.person") : t("analytics.peopleCount")} (${availablePercent.toFixed(1)}%)`}
                            ></div>
                            <div 
                              className="bg-red-600 h-full transition-all duration-300" 
                              style={{ width: `${notAvailablePercent}%` }}
                              title={`${t("analytics.notAvailable")}: ${notAvailableCount} ${notAvailableCount === 1 ? t("analytics.person") : t("analytics.peopleCount")} (${notAvailablePercent.toFixed(1)}%)`}
                            ></div>
                          </div>
                        </div>
                      )
                    } else {
                      // Full mode: All status types
                      const availablePercent = (item.available / total) * 100
                      const remotePercent = (item.remote / total) * 100
                      const unavailablePercent = (item.unavailable / total) * 100
                      const holidayPercent = (item.holiday / total) * 100
                      const absentPercent = (item.absent / total) * 100
                      const checkPercent = (item.need_to_check / total) * 100

                      return (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              {analyticsLevel === "day" ? format(new Date(item.date), "MMM dd", { locale: nl }) :
                               analyticsLevel === "week" ? item.week :
                               item.month}
                            </Label>
                            <span className="text-xs text-gray-500">{total} {total === 1 ? t("analytics.person") : t("analytics.peopleCount")}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 flex overflow-hidden">
                            <div className="bg-green-600 h-full" style={{ width: `${availablePercent}%` }}></div>
                            <div className="bg-purple-600 h-full" style={{ width: `${remotePercent}%` }}></div>
                            <div className="bg-yellow-600 h-full" style={{ width: `${holidayPercent}%` }}></div>
                            <div className="bg-red-600 h-full" style={{ width: `${unavailablePercent}%` }}></div>
                            <div className="bg-gray-600 h-full" style={{ width: `${absentPercent}%` }}></div>
                            <div className="bg-blue-600 h-full" style={{ width: `${checkPercent}%` }}></div>
                          </div>
                        </div>
                      )
                    }
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Loading analytics data...</p>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="border-t border-gray-200 dark:border-gray-700 pt-2">
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              💡 {t("analytics.autoRefresh")}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={fetchAnalyticsData}
                disabled={!analyticsData}
                className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 h-8 text-xs"
                title={t("analytics.refresh")}
              >
                🔄 {t("analytics.refresh")}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowAnalytics(false)} 
                className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 h-8 text-xs"
              >
                ✕ {t("analytics.close")}
              </Button>
            </div>
          </div>
        </DialogFooter>
    </>
  )
}

export function BulkUpdateDialog({ members, locale, onUpdate }: BulkUpdateDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [selectedStatus, setSelectedStatus] = useState<
    "available" | "unavailable" | "need_to_check" | "absent" | "holiday" | "remote"
  >("available")
  const [isUpdating, setIsUpdating] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [analyticsLevel, setAnalyticsLevel] = useState<"day" | "week" | "month">("week")
  const [simplifiedMode, setSimplifiedMode] = useState(false)
  const [todayAvailability, setTodayAvailability] = useState<Record<string, string>>({})
  const { t } = useTranslation(locale)

  // Check for simplified mode preference
  useEffect(() => {
    const checkSimplifiedMode = () => {
      const savedSimplifiedMode = localStorage.getItem("simplifiedMode") === "true"
      setSimplifiedMode(savedSimplifiedMode)
    }

    // Check on mount
    checkSimplifiedMode()

    // Listen for simplified mode changes
    const handleSimplifiedModeChange = (event: CustomEvent) => {
      setSimplifiedMode(event.detail)
    }

    window.addEventListener('simplifiedModeChanged', handleSimplifiedModeChange as EventListener)

    return () => {
      window.removeEventListener('simplifiedModeChanged', handleSimplifiedModeChange as EventListener)
    }
  }, [])

  // Fetch today's availability for status indicators
  const fetchTodayAvailability = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from("availability")
        .select("member_id, status")
        .eq("date", today)

      if (error) throw error

      const todayStatuses: Record<string, string> = {}
      data?.forEach(item => {
        todayStatuses[item.member_id] = item.status
      })
      setTodayAvailability(todayStatuses)
    } catch (error) {
      console.error("Error fetching today's availability:", error)
    }
  }

  // Fetch today's availability when dialog opens
  useEffect(() => {
    if (open) {
      fetchTodayAvailability()
    }
  }, [open])

  const statusOptions = [
    { value: "available", label: t("status.available"), icon: "🟢" },
    { value: "remote", label: t("status.remote"), icon: "🟣" },
    { value: "unavailable", label: t("status.unavailable"), icon: "🔴" },
    { value: "need_to_check", label: t("status.need_to_check"), icon: "🔵" },
    { value: "absent", label: t("status.absent"), icon: "⚫" },
    { value: "holiday", label: t("status.holiday"), icon: "🟡" },
  ]

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers((prev) => (prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]))
  }

  const handleSelectAllMembers = () => {
    if (selectedMembers.length === members.length) {
      setSelectedMembers([])
    } else {
      setSelectedMembers(members.map((m) => m.id))
    }
  }

  // Enhanced quick presets for better UX
  const handleQuickPreset = (preset: "thisWeek" | "nextWeek" | "next2Weeks" | "thisMonth" | "nextMonth" | "workdaysOnly") => {
    const today = new Date()
    let dates: Date[] = []

    switch (preset) {
      case "thisWeek":
        const startThisWeek = startOfWeek(today, { weekStartsOn: 1 })
        const endThisWeek = endOfWeek(today, { weekStartsOn: 1 })
        for (let d = new Date(startThisWeek); d <= endThisWeek; d.setDate(d.getDate() + 1)) {
          if (!isWeekend(d)) dates.push(new Date(d))
        }
        break
      case "nextWeek":
        const startNextWeek = startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 })
        const endNextWeek = endOfWeek(addWeeks(today, 1), { weekStartsOn: 1 })
        for (let d = new Date(startNextWeek); d <= endNextWeek; d.setDate(d.getDate() + 1)) {
          if (!isWeekend(d)) dates.push(new Date(d))
        }
        break
      case "next2Weeks":
        const startNext2Weeks = startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 })
        const endNext2Weeks = endOfWeek(addWeeks(today, 2), { weekStartsOn: 1 })
        for (let d = new Date(startNext2Weeks); d <= endNext2Weeks; d.setDate(d.getDate() + 1)) {
          if (!isWeekend(d)) dates.push(new Date(d))
        }
        break
      case "thisMonth":
        const startThisMonth = startOfMonth(today)
        const endThisMonth = endOfMonth(today)
        for (let d = new Date(startThisMonth); d <= endThisMonth; d.setDate(d.getDate() + 1)) {
          if (!isWeekend(d)) dates.push(new Date(d))
        }
        break
      case "nextMonth":
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
        const startNextMonth = startOfMonth(nextMonth)
        const endNextMonth = endOfMonth(nextMonth)
        for (let d = new Date(startNextMonth); d <= endNextMonth; d.setDate(d.getDate() + 1)) {
          if (!isWeekend(d)) dates.push(new Date(d))
        }
        break
      case "workdaysOnly":
        dates = selectedDates.filter(date => !isWeekend(date))
        break
    }
    setSelectedDates(dates)
  }

  // Quick status presets
  const handleStatusPreset = (status: "available" | "unavailable" | "need_to_check" | "absent" | "holiday" | "remote") => {
    setSelectedStatus(status)
  }

  // Analytics functions
  const fetchAnalyticsData = async () => {
    try {
      const { data, error } = await supabase
        .from("availability")
        .select(`
          date,
          status,
          member_id,
          members!inner(first_name, last_name)
        `)
        .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Last 90 days
        .lte('date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Next 30 days

      if (error) throw error

      const processedData = processAnalyticsData(data || [])
      setAnalyticsData(processedData)
    } catch (error) {
      console.error("Analytics fetch error:", error)
    }
  }

  const processAnalyticsData = (data: any[]) => {
    const statusCounts: Record<string, Record<string, number>> = {}
    const memberData: Record<string, any> = {}

    // Group by date and count statuses
    data.forEach(entry => {
      const date = entry.date
      const status = entry.status

      if (!statusCounts[date]) {
        statusCounts[date] = {
          available: 0,
          remote: 0,
          unavailable: 0,
          need_to_check: 0,
          absent: 0,
          holiday: 0
        }
      }

      statusCounts[date][status] = (statusCounts[date][status] || 0) + 1

      // Store member data
      if (!memberData[entry.member_id]) {
        memberData[entry.member_id] = {
          name: `${entry.members.first_name} ${entry.members.last_name}`,
          statuses: {}
        }
      }
      memberData[entry.member_id].statuses[date] = status
    })

    type DayData = {
      date: string
      available: number
      remote: number
      unavailable: number
      need_to_check: number
      absent: number
      holiday: number
      total: number
    }

    // Process for different time levels
    const dayData: DayData[] = Object.entries(statusCounts).map(([date, counts]) => ({
      date,
      available: counts.available || 0,
      remote: counts.remote || 0,
      unavailable: counts.unavailable || 0,
      need_to_check: counts.need_to_check || 0,
      absent: counts.absent || 0,
      holiday: counts.holiday || 0,
      total: Object.values(counts).reduce((sum: number, count: number) => sum + count, 0)
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    type WeekData = {
      week: string
      available: number
      remote: number
      unavailable: number
      need_to_check: number
      absent: number
      holiday: number
      total: number
    }

    // Week level aggregation
    const weekData: Record<string, WeekData> = {}
    dayData.forEach(day => {
      const date = new Date(day.date)
      const weekStart = startOfWeek(date, { weekStartsOn: 1 })
      const weekKey = format(weekStart, 'yyyy-MM-dd')
      
      if (!weekData[weekKey]) {
        weekData[weekKey] = {
          week: format(weekStart, 'MMM dd', { locale: nl }),
          available: 0,
          remote: 0,
          unavailable: 0,
          need_to_check: 0,
          absent: 0,
          holiday: 0,
          total: 0
        }
      }
      
      weekData[weekKey].available += day.available
      weekData[weekKey].remote += day.remote
      weekData[weekKey].unavailable += day.unavailable
      weekData[weekKey].need_to_check += day.need_to_check
      weekData[weekKey].absent += day.absent
      weekData[weekKey].holiday += day.holiday
      weekData[weekKey].total += day.total
    })

    type MonthData = {
      month: string
      available: number
      remote: number
      unavailable: number
      need_to_check: number
      absent: number
      holiday: number
      total: number
    }

    // Month level aggregation
    const monthData: Record<string, MonthData> = {}
    dayData.forEach(day => {
      const date = new Date(day.date)
      const monthKey = format(date, 'yyyy-MM')
      
      if (!monthData[monthKey]) {
        monthData[monthKey] = {
          month: format(date, 'MMMM yyyy', { locale: nl }),
          available: 0,
          remote: 0,
          unavailable: 0,
          need_to_check: 0,
          absent: 0,
          holiday: 0,
          total: 0
        }
      }
      
      monthData[monthKey].available += day.available
      monthData[monthKey].remote += day.remote
      monthData[monthKey].unavailable += day.unavailable
      monthData[monthKey].need_to_check += day.need_to_check
      monthData[monthKey].absent += day.absent
      monthData[monthKey].holiday += day.holiday
      monthData[monthKey].total += day.total
    })

    return {
      day: dayData,
      week: Object.values(weekData),
      month: Object.values(monthData),
      members: memberData
    }
  }

  const handleShowAnalytics = async () => {
    setShowAnalytics(true)
    if (!analyticsData) {
      await fetchAnalyticsData()
    }
  }

  const handleBulkUpdate = async () => {
    if (selectedMembers.length === 0 || selectedDates.length === 0) {
      alert(t("bulk.selectMembersAndDates"))
      return
    }

    setIsUpdating(true)
    try {
      const updates = []
      for (const memberId of selectedMembers) {
        for (const date of selectedDates) {
          updates.push({
            member_id: memberId,
            date: date.toISOString().split("T")[0],
            status: selectedStatus,
          })
        }
      }

      const { error } = await supabase.from("availability").upsert(updates, { onConflict: "member_id,date" })

      if (error) throw error

      onUpdate()
      setOpen(false)
      setSelectedMembers([])
      setSelectedDates([])
    } catch (error) {
      console.error("Bulk update error:", error)
      alert(t("common.error"))
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <>
      {/* Bulk Update Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-800/30 dark:hover:to-indigo-800/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Bolt className="h-4 w-4 mr-2" />
            {t("bulk.title")}
          </Button>
        </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] bg-white dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            {t("bulk.title")}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">
            {t("bulk.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Member Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="h-4 w-4" />
                Select Team Members
              </Label>
              <div className="flex items-center gap-2">
                <Badge variant={selectedMembers.length > 0 ? "default" : "secondary"} className="text-xs">
                  {selectedMembers.length}/{members.length} selected
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSelectAllMembers} 
                  className="text-xs h-7"
                >
                  {selectedMembers.length === members.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
              {members.map((member) => (
                <div 
                  key={member.id} 
                  className={cn(
                    "flex items-center space-x-3 p-2 rounded-lg transition-colors cursor-pointer hover:bg-white dark:hover:bg-gray-800",
                    selectedMembers.includes(member.id) && "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700"
                  )}
                  onClick={() => handleMemberToggle(member.id)}
                >
                  <Checkbox
                    id={member.id}
                    checked={selectedMembers.includes(member.id)}
                    onCheckedChange={() => handleMemberToggle(member.id)}
                  />
                  <MemberAvatar
                    firstName={member.first_name}
                    lastName={member.last_name}
                    profileImage={member.profile_image}
                    size="sm"
                    statusIndicator={{
                      show: true,
                      status: todayAvailability[member.id] as any
                    }}
                  />
                  <Label htmlFor={member.id} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer flex-1 font-medium">
                    {member.first_name} {member.last_name}
                  </Label>
                  {selectedMembers.includes(member.id) && (
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Quick Date Selection Actions */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
            <div className="flex items-center gap-2 mb-4">
              <Bolt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <Label className="text-lg font-bold text-blue-900 dark:text-blue-100">
                ⚡ {t("bulk.quickActions") || "Quick Actions"}
              </Label>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                  📅 {t("bulk.dateShortcuts") || "Date Selection Shortcuts"}
                </Label>
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  {t("bulk.dateShortcutsDescription") || "Selecteer snel datums met één klik. Alleen werkdagen (ma-vr) worden geselecteerd, weekends worden automatisch uitgesloten."}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickPreset("thisWeek")}
                  className="text-xs bg-white dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-800/30 border-blue-200 dark:border-blue-600 h-auto py-2 px-3 flex flex-col sm:flex-row items-center justify-center gap-1 whitespace-nowrap"
                  title={t("bulk.thisWeekTooltip") || "Selecteert alle werkdagen van de huidige week (ma-vr)"}
                >
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <span className="text-center sm:text-left">{t("bulk.thisWeek") || "Deze week"}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickPreset("nextWeek")}
                  className="text-xs bg-white dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-800/30 border-blue-200 dark:border-blue-600 h-auto py-2 px-3 flex flex-col sm:flex-row items-center justify-center gap-1 whitespace-nowrap"
                  title={t("bulk.nextWeekTooltip") || "Selecteert alle werkdagen van volgende week (ma-vr)"}
                >
                  <CalendarDays className="h-3 w-3 flex-shrink-0" />
                  <span className="text-center sm:text-left">{t("bulk.nextWeek") || "Volgende week"}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickPreset("next2Weeks")}
                  className="text-xs bg-white dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-800/30 border-blue-200 dark:border-blue-600 h-auto py-2 px-3 flex flex-col sm:flex-row items-center justify-center gap-1 whitespace-nowrap"
                  title={t("bulk.next2WeeksTooltip") || "Selecteert alle werkdagen van de volgende 2 weken (ma-vr)"}
                >
                  <CalendarDays className="h-3 w-3 flex-shrink-0" />
                  <span className="text-center sm:text-left">{t("bulk.next2Weeks") || "Volgende 2 weken"}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickPreset("thisMonth")}
                  className="text-xs bg-white dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-800/30 border-blue-200 dark:border-blue-600 h-auto py-2 px-3 flex flex-col sm:flex-row items-center justify-center gap-1 whitespace-nowrap"
                  title={t("bulk.thisMonthTooltip") || "Selecteert alle werkdagen van de huidige maand (ma-vr)"}
                >
                  <Target className="h-3 w-3 flex-shrink-0" />
                  <span className="text-center sm:text-left">{t("bulk.thisMonth") || "Deze maand"}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickPreset("nextMonth")}
                  className="text-xs bg-white dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-800/30 border-blue-200 dark:border-blue-600 h-auto py-2 px-3 flex flex-col sm:flex-row items-center justify-center gap-1 whitespace-nowrap"
                  title={t("bulk.nextMonthTooltip") || "Selecteert alle werkdagen van volgende maand (ma-vr)"}
                >
                  <Target className="h-3 w-3 flex-shrink-0" />
                  <span className="text-center sm:text-left">{t("bulk.nextMonth") || "Volgende maand"}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickPreset("workdaysOnly")}
                  disabled={selectedDates.length === 0}
                  className="text-xs bg-white dark:bg-gray-800 hover:bg-green-100 dark:hover:bg-green-800/30 border-green-200 dark:border-green-600 h-auto py-2 px-3 flex flex-col sm:flex-row items-center justify-center gap-1 whitespace-nowrap disabled:opacity-50"
                  title={t("bulk.workdaysOnlyTooltip") || "Filtert de huidige selectie en houdt alleen werkdagen over (ma-vr)"}
                >
                  <Filter className="h-3 w-3 flex-shrink-0" />
                  <span className="text-center sm:text-left">{t("bulk.workdaysOnly") || "Alleen werkdagen"}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Simple Date Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Select Dates
            </Label>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDates.length > 0
                    ? `${selectedDates.length} dates selected`
                    : "Click to select dates"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-2">
                  <Calendar
                    mode="multiple"
                    selected={selectedDates}
                    onSelect={(dates) => setSelectedDates(dates || [])}
                    initialFocus
                    className="rounded-md border-0"
                    locale={nl}
                    weekStartsOn={1}
                    formatters={{
                      formatCaption: (date) => format(date, "MMMM yyyy", { locale: nl }),
                      formatWeekdayName: () => "", // Return empty string to hide weekday names
                    }}
                    modifiers={{
                      weekend: (date) => date.getDay() === 0 || date.getDay() === 6,
                      workday: (date) => date.getDay() >= 1 && date.getDay() <= 5,
                    }}
                    modifiersStyles={{
                      weekend: { 
                        color: '#ef4444', 
                        fontWeight: 'bold'
                      },
                      workday: { 
                        color: '#059669',
                        fontWeight: '600'
                      },
                    }}
                    styles={{
                      day: {
                        fontWeight: 'bold', // Bold for current month days
                      },
                      day_outside: {
                        color: '#9ca3af',
                        opacity: '0.6',
                        fontWeight: 'normal', // Not bold for outside days
                      },
                      head_row: {
                        display: 'none', // Hide weekday headers completely
                      },
                      head_cell: {
                        display: 'none', // Hide individual weekday cells
                      },
                    }}
                  />
                </div>
              </PopoverContent>
            </Popover>

            {/* Selected Dates Display */}
            {selectedDates.length > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium text-green-800 dark:text-green-200">
                    Selected Dates ({selectedDates.length})
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDates([])}
                    className="h-6 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Clear All
                  </Button>
                </div>
                <div className="text-xs text-green-700 dark:text-green-300 max-h-16 overflow-y-auto">
                  <div className="flex flex-wrap gap-1">
                    {selectedDates
                      .sort((a, b) => a.getTime() - b.getTime())
                      .map((date, index) => (
                        <Badge 
                          key={index} 
                          variant="secondary" 
                          className={cn(
                            "text-xs",
                            isWeekend(date) ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200" : 
                            "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
                          )}
                        >
                          {format(date, "dd-MM", { locale: nl })}
                          {isWeekend(date) && " (weekend)"}
                        </Badge>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Status Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-gray-900 dark:text-white">Set Status</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {statusOptions.map((option) => (
                <div 
                  key={option.value} 
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-sm",
                    selectedStatus === option.value 
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30" 
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                  onClick={() => setSelectedStatus(option.value as any)}
                >
                  <input
                    type="radio"
                    id={option.value}
                    name="status"
                    value={option.value}
                    checked={selectedStatus === option.value}
                    onChange={(e) => setSelectedStatus(e.target.value as any)}
                    className="text-blue-600"
                  />
                  <Label
                    htmlFor={option.value}
                    className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer flex items-center gap-2 flex-1"
                  >
                    <span className="text-lg">{option.icon}</span>
                    <span className="font-medium">{option.label}</span>
                  </Label>
                  {selectedStatus === option.value && (
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Update Preview */}
          {selectedMembers.length > 0 && selectedDates.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
              <Label className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2 block">
                📋 Update Preview
              </Label>
              <div className="text-sm text-yellow-700 dark:text-yellow-300">
                <p>
                  <strong>{selectedMembers.length * selectedDates.length}</strong> availability entries will be updated:
                </p>
                <p className="mt-1">
                  • <strong>{selectedMembers.length}</strong> team members
                </p>
                <p>
                  • <strong>{selectedDates.length}</strong> dates ({selectedDates.filter(d => !isWeekend(d)).length} workdays, {selectedDates.filter(d => isWeekend(d)).length} weekend days)
                </p>
                <p>
                  • Status: <strong>{statusOptions.find(s => s.value === selectedStatus)?.label}</strong>
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="text-gray-700 dark:text-gray-300">
            Cancel
          </Button>
          <Button
            onClick={handleBulkUpdate}
            disabled={isUpdating || selectedMembers.length === 0 || selectedDates.length === 0}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white min-w-[140px] shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {isUpdating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Updating...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Update {selectedMembers.length * selectedDates.length} Items
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Analytics Dialog */}
    <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
      <DialogContent className="max-w-[95vw] sm:max-w-[85vw] lg:max-w-[1000px] bg-white dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-green-600" />
            {t("analytics.title")}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 dark:text-gray-300">
            {t("analytics.description")}
          </DialogDescription>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-2 mt-2">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              💡 {t("analytics.dataExplanation")}
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Analytics Level Selector */}
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium text-gray-900 dark:text-white">View:</Label>
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-md p-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAnalyticsLevel("day")}
                className={cn(
                  "text-xs font-medium transition-all duration-200 px-2 py-1 h-7",
                  analyticsLevel === "day" 
                    ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" 
                    : "text-gray-600 dark:text-gray-400"
                )}
              >
                Daily
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAnalyticsLevel("week")}
                className={cn(
                  "text-xs font-medium transition-all duration-200 px-2 py-1 h-7",
                  analyticsLevel === "week" 
                    ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" 
                    : "text-gray-600 dark:text-gray-400"
                )}
              >
                Weekly
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAnalyticsLevel("month")}
                className={cn(
                  "text-xs font-medium transition-all duration-200 px-2 py-1 h-7",
                  analyticsLevel === "month" 
                    ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" 
                    : "text-gray-600 dark:text-gray-400"
                )}
              >
                Monthly
              </Button>
            </div>
          </div>

          {/* Analytics Content */}
          {analyticsData ? (
            <div className="space-y-3">
              {/* Summary Cards */}
              <div className={cn(
                "grid gap-2",
                simplifiedMode 
                  ? "grid-cols-2" 
                  : "grid-cols-2 sm:grid-cols-3 md:grid-cols-6"
              )}>
                {simplifiedMode ? (
                  <>
                    {/* Simplified mode: Only Available (green) and Unavailable (red) */}
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 border border-green-200 dark:border-green-700">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full bg-green-600 flex-shrink-0"></div>
                        <Label className="text-xs font-medium text-green-800 dark:text-green-200 truncate">
                          {t("analytics.available")}
                        </Label>
                      </div>
                      <div className="text-base font-bold text-green-900 dark:text-green-100">
                        {analyticsData[analyticsLevel]?.reduce((sum: number, item: any) => sum + item.available + item.remote, 0) || 0}
                      </div>
                      <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                        {t("analytics.uniqueMembers")}
                      </div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 border border-red-200 dark:border-red-700">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full bg-red-600 flex-shrink-0"></div>
                        <Label className="text-xs font-medium text-red-800 dark:text-red-200 truncate">
                          {t("analytics.notAvailable")}
                        </Label>
                      </div>
                      <div className="text-base font-bold text-red-900 dark:text-red-100">
                        {analyticsData[analyticsLevel]?.reduce((sum: number, item: any) => sum + item.unavailable + item.holiday + item.absent + item.need_to_check, 0) || 0}
                      </div>
                      <div className="text-xs text-red-700 dark:text-red-300 mt-1">
                        {t("analytics.uniqueMembers")}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Full mode: All status types */}
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 border border-green-200 dark:border-green-700">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full bg-green-600 flex-shrink-0"></div>
                        <Label className="text-xs font-medium text-green-800 dark:text-green-200 truncate">Available</Label>
                      </div>
                      <div className="text-sm font-bold text-green-900 dark:text-green-100">
                        {analyticsData[analyticsLevel]?.reduce((sum: number, item: any) => sum + item.available, 0) || 0}
                      </div>
                      <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                        {t("analytics.peopleCount")}
                      </div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 border border-purple-200 dark:border-purple-700">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full bg-purple-600 flex-shrink-0"></div>
                        <Label className="text-xs font-medium text-purple-800 dark:text-purple-200 truncate">Remote</Label>
                      </div>
                      <div className="text-sm font-bold text-purple-900 dark:text-purple-100">
                        {analyticsData[analyticsLevel]?.reduce((sum: number, item: any) => sum + item.remote, 0) || 0}
                      </div>
                      <div className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                        {t("analytics.peopleCount")}
                      </div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 border border-red-200 dark:border-red-700">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full bg-red-600 flex-shrink-0"></div>
                        <Label className="text-xs font-medium text-red-800 dark:text-red-200 truncate">Unavailable</Label>
                      </div>
                      <div className="text-sm font-bold text-red-900 dark:text-red-100">
                        {analyticsData[analyticsLevel]?.reduce((sum: number, item: any) => sum + item.unavailable, 0) || 0}
                      </div>
                      <div className="text-xs text-red-700 dark:text-red-300 mt-1">
                        {t("analytics.peopleCount")}
                      </div>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2 border border-yellow-200 dark:border-yellow-700">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full bg-yellow-600 flex-shrink-0"></div>
                        <Label className="text-xs font-medium text-yellow-800 dark:text-yellow-200 truncate">Holiday</Label>
                      </div>
                      <div className="text-sm font-bold text-yellow-900 dark:text-yellow-100">
                        {analyticsData[analyticsLevel]?.reduce((sum: number, item: any) => sum + item.holiday, 0) || 0}
                      </div>
                      <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                        {t("analytics.peopleCount")}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0"></div>
                        <Label className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">Absent</Label>
                      </div>
                      <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {analyticsData[analyticsLevel]?.reduce((sum: number, item: any) => sum + item.absent, 0) || 0}
                      </div>
                      <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                        {t("analytics.peopleCount")}
                      </div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 border border-blue-200 dark:border-blue-700">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0"></div>
                        <Label className="text-xs font-medium text-blue-800 dark:text-blue-200 truncate">To Check</Label>
                      </div>
                      <div className="text-sm font-bold text-blue-900 dark:text-blue-100">
                        {analyticsData[analyticsLevel]?.reduce((sum: number, item: any) => sum + item.need_to_check, 0) || 0}
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        {t("analytics.peopleCount")}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Chart Representation */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                <Label className="text-sm font-bold text-gray-900 dark:text-white mb-2 block">
                  Availability Trend ({analyticsLevel === "day" ? "Daily" : analyticsLevel === "week" ? "Weekly" : "Monthly"})
                </Label>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {analyticsData[analyticsLevel]?.slice(-15).map((item: any, index: number) => {
                    const total = item.total || 1
                    
                    if (simplifiedMode) {
                      // Simplified mode: Green (available + remote) and Red (everything else)
                      const availableCount = item.available + item.remote
                      const notAvailableCount = item.unavailable + item.holiday + item.absent + item.need_to_check
                      const availablePercent = (availableCount / total) * 100
                      const notAvailablePercent = (notAvailableCount / total) * 100

                      return (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              {analyticsLevel === "day" ? format(new Date(item.date), "MMM dd", { locale: nl }) :
                               analyticsLevel === "week" ? item.week :
                               item.month}
                            </Label>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>
                                {availableCount} {availableCount === 1 ? t("analytics.person") : t("analytics.peopleCount")}
                              </span>
                              <span className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-600"></div>
                                {notAvailableCount} {notAvailableCount === 1 ? t("analytics.person") : t("analytics.peopleCount")}
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 flex overflow-hidden">
                            <div 
                              className="bg-green-600 h-full transition-all duration-300" 
                              style={{ width: `${availablePercent}%` }}
                              title={`${t("analytics.available")} (${t("analytics.includesRemote")}): ${availableCount} ${availableCount === 1 ? t("analytics.person") : t("analytics.peopleCount")} (${availablePercent.toFixed(1)}%)`}
                            ></div>
                            <div 
                              className="bg-red-600 h-full transition-all duration-300" 
                              style={{ width: `${notAvailablePercent}%` }}
                              title={`${t("analytics.notAvailable")}: ${notAvailableCount} ${notAvailableCount === 1 ? t("analytics.person") : t("analytics.peopleCount")} (${notAvailablePercent.toFixed(1)}%)`}
                            ></div>
                          </div>
                        </div>
                      )
                    } else {
                      // Full mode: All status types
                      const availablePercent = (item.available / total) * 100
                      const remotePercent = (item.remote / total) * 100
                      const unavailablePercent = (item.unavailable / total) * 100
                      const holidayPercent = (item.holiday / total) * 100
                      const absentPercent = (item.absent / total) * 100
                      const checkPercent = (item.need_to_check / total) * 100

                      return (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              {analyticsLevel === "day" ? format(new Date(item.date), "MMM dd", { locale: nl }) :
                               analyticsLevel === "week" ? item.week :
                               item.month}
                            </Label>
                            <span className="text-xs text-gray-500">{total} {total === 1 ? t("analytics.person") : t("analytics.peopleCount")}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 flex overflow-hidden">
                            <div className="bg-green-600 h-full" style={{ width: `${availablePercent}%` }}></div>
                            <div className="bg-purple-600 h-full" style={{ width: `${remotePercent}%` }}></div>
                            <div className="bg-yellow-600 h-full" style={{ width: `${holidayPercent}%` }}></div>
                            <div className="bg-red-600 h-full" style={{ width: `${unavailablePercent}%` }}></div>
                            <div className="bg-gray-600 h-full" style={{ width: `${absentPercent}%` }}></div>
                            <div className="bg-blue-600 h-full" style={{ width: `${checkPercent}%` }}></div>
                          </div>
                        </div>
                      )
                    }
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Loading analytics data...</p>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="border-t border-gray-200 dark:border-gray-700 pt-2">
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              💡 Data wordt automatisch ververst bij het openen van analytics
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={fetchAnalyticsData}
                disabled={!analyticsData}
                className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 h-8 text-xs"
                title="Ververs de analytics data"
              >
                🔄 Ververs
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowAnalytics(false)} 
                className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 h-8 text-xs"
              >
                ✕ Sluiten
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
