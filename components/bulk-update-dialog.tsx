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
  const { t } = useTranslation(locale)

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
    const statusCounts: Record<string, Record<string, number>> = {}

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

      <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
        <DialogContent className="sm:max-w-[1200px] bg-white dark:bg-gray-800 max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-green-600" />
              📊 {t("analytics.dashboard")}
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300 text-base leading-relaxed">
              {t("analytics.dashboardDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Enhanced Header Section with Explanations */}
            <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-teal-900/20 rounded-xl p-6 border border-green-200 dark:border-green-700">
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-green-900 dark:text-green-100 flex items-center gap-2">
                    📊 {t("analytics.dashboard")}
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300 max-w-2xl leading-relaxed">
                    {t("analytics.dashboardDescription")}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-semibold text-green-900 dark:text-green-100 flex items-center gap-2">
                    🔍 {t("analytics.viewBy")}
                  </Label>
                  <div className="text-xs text-green-600 dark:text-green-400">
                    {t("analytics.selectInterval")}
                  </div>
                </div>
                
                <div className="flex bg-white dark:bg-gray-800 rounded-xl p-1.5 gap-1 border border-green-200 dark:border-green-700 shadow-sm">
                  {[
                    { 
                      key: 'day', 
                      label: t("analytics.daily"),
                      icon: '📅',
                      description: t("analytics.dailyDescription")
                    },
                    { 
                      key: 'week', 
                      label: t("analytics.weekly"),
                      icon: '📊',
                      description: t("analytics.weeklyDescription")
                    },
                    { 
                      key: 'month', 
                      label: t("analytics.monthly"),
                      icon: '📈',
                      description: t("analytics.monthlyDescription")
                    }
                  ].map((level) => (
                    <Button
                      key={level.key}
                      variant="ghost"
                      size="sm"
                      onClick={() => setAnalyticsLevel(level.key as any)}
                      className={cn(
                        "text-sm font-medium transition-all duration-200 px-4 py-2 rounded-lg relative group",
                        analyticsLevel === level.key 
                          ? "bg-green-600 text-white shadow-md transform scale-105" 
                          : "text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-800/30"
                      )}
                      title={level.description}
                    >
                      <span className="mr-2">{level.icon}</span>
                      {level.label}
                      
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 pointer-events-none">
                        <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded px-3 py-2 whitespace-nowrap shadow-lg">
                          {level.description}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Period Information */}
              {analyticsData && (
                <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-700">
                  <div className="text-sm text-green-700 dark:text-green-300">
                    <span className="font-semibold">📋 {t("analytics.currentView")}</span>
                    {analyticsLevel === 'day' && (
                      <span className="ml-2">
                        {t("analytics.showsDays").replace("{count}", String(analyticsData.day?.length || 0))}
                        {analyticsData.day?.length > 0 && (
                          <>
                            {' '}{t("analytics.fromTo")
                              .replace("{start}", format(new Date(analyticsData.day[0].date), "dd MMM", { locale: nl }))
                              .replace("{end}", format(new Date(analyticsData.day[analyticsData.day.length - 1].date), "dd MMM yyyy", { locale: nl }))}
                          </>
                        )}
                      </span>
                    )}
                    {analyticsLevel === 'week' && (
                      <span className="ml-2">
                        {t("analytics.showsWeeks").replace("{count}", String(analyticsData.week?.length || 0))}
                        {analyticsData.week?.length > 0 && (
                          <> {t("analytics.lastPeriods")
                            .replace("{count}", String(Math.min(20, analyticsData.week.length)))
                            .replace("{period}", t("analytics.weeks").toLowerCase())}</>
                        )}
                      </span>
                    )}
                    {analyticsLevel === 'month' && (
                      <span className="ml-2">
                        {t("analytics.showsMonths").replace("{count}", String(analyticsData.month?.length || 0))}
                        {analyticsData.month?.length > 0 && (
                          <> {t("analytics.lastPeriods")
                            .replace("{count}", String(Math.min(20, analyticsData.month.length)))
                            .replace("{period}", t("analytics.months").toLowerCase())}</>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {analyticsData ? (
              <div className="space-y-8">
                {/* Enhanced Summary Cards with Explanations */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      📈 {t("analytics.statusTotals")}
                      <div className="flex -space-x-2 ml-2">
                        {members.slice(0, 4).map((member, idx) => (
                          <MemberAvatar
                            key={member.id}
                            firstName={member.first_name}
                            lastName={member.last_name}
                            profileImage={member.profile_image}
                            size="sm"
                            className="border-2 border-white dark:border-gray-800"
                          />
                        ))}
                        {members.length > 4 && (
                          <div className="flex items-center justify-center w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full border-2 border-white dark:border-gray-800 text-xs font-bold text-gray-600 dark:text-gray-400">
                            +{members.length - 4}
                          </div>
                        )}
                      </div>
                    </h4>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {t("analytics.period")} {analyticsLevel === 'day' ? t("analytics.daily") : analyticsLevel === 'week' ? t("analytics.weekly") : t("analytics.monthly")}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-4xl">
                    {t("analytics.totalsDescription")}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {[
                      { 
                        key: 'available', 
                        label: t("analytics.available"), 
                        color: 'green',
                        icon: '🟢',
                        description: t("analytics.availableDescription")
                      },
                      { 
                        key: 'remote', 
                        label: t("analytics.remote"), 
                        color: 'purple',
                        icon: '🟣',
                        description: t("analytics.remoteDescription")
                      },
                      { 
                        key: 'unavailable', 
                        label: t("analytics.unavailable"), 
                        color: 'red',
                        icon: '🔴',
                        description: t("analytics.unavailableDescription")
                      },
                      { 
                        key: 'holiday', 
                        label: t("analytics.holiday"), 
                        color: 'yellow',
                        icon: '🟡',
                        description: t("analytics.holidayDescription")
                      },
                      { 
                        key: 'absent', 
                        label: t("analytics.absent"), 
                        color: 'gray',
                        icon: '⚫',
                        description: t("analytics.absentDescription")
                      },
                      { 
                        key: 'need_to_check', 
                        label: t("analytics.needToCheck"), 
                        color: 'blue',
                        icon: '🔵',
                        description: t("analytics.needToCheckDescription")
                      }
                    ].map(({ key, label, color, icon, description }) => {
                      const total = analyticsData[analyticsLevel]?.reduce((sum: number, item: any) => sum + (item[key] || 0), 0) || 0
                      const grandTotal = analyticsData[analyticsLevel]?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 1
                      const percentage = ((total / grandTotal) * 100).toFixed(1)
                      
                      return (
                        <div key={key} className={`bg-${color}-50 dark:bg-${color}-900/20 rounded-xl p-5 border border-${color}-200 dark:border-${color}-700 hover:shadow-lg transition-all duration-200 group relative`}>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="text-2xl">{icon}</div>
                            <div className="flex-1">
                              <Label className={`text-xs font-bold text-${color}-800 dark:text-${color}-200 uppercase tracking-wide`}>
                                {label}
                              </Label>
                            </div>
                          </div>
                          <div className={`text-2xl font-bold text-${color}-900 dark:text-${color}-100 mb-1`}>
                            {total.toLocaleString()}
                          </div>
                          <div className={`text-xs text-${color}-700 dark:text-${color}-300 font-medium`}>
                            {percentage}{t("analytics.percentOfTotal")}
                          </div>
                          
                          {/* Hover tooltip with explanation */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 pointer-events-none">
                            <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg px-4 py-3 whitespace-nowrap shadow-xl max-w-xs">
                              <div className="font-semibold mb-1">{label}</div>
                              <div className="text-gray-300 dark:text-gray-600 leading-relaxed">{description}</div>
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Total Summary */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">📊</span>
                        <div>
                          <Label className="text-sm font-bold text-blue-800 dark:text-blue-200">
                            Totaal Geregistreerde Entries
                          </Label>
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            Alle statusupdates in de geselecteerde periode
                          </p>
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                        {analyticsData[analyticsLevel]?.reduce((sum: number, item: any) => sum + (item.total || 0), 0)?.toLocaleString() || 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Trend Chart with Better Explanations */}
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/50 dark:to-slate-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                        📊 {t("analytics.trend") || "Beschikbaarheid Trend"} 
                        <span className="text-sm font-normal text-gray-500">
                          ({analyticsLevel === "day" ? t("analytics.daily") || "Dagelijks" : analyticsLevel === "week" ? t("analytics.weekly") || "Wekelijks" : t("analytics.monthly") || "Maandelijks"})
                        </span>
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
                        Zie hoe de statusverdeling evolueert over tijd. Elke balk toont de verhouding tussen verschillende statussen voor die periode.
                        Hover over een balk voor meer details.
                      </p>
                    </div>
                    
                    {/* Legend */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {[
                        { color: 'green', label: t("analytics.available"), icon: '🟢' },
                        { color: 'purple', label: t("analytics.remote"), icon: '🟣' },
                        { color: 'yellow', label: t("analytics.holiday"), icon: '🟡' },
                        { color: 'red', label: t("analytics.unavailable"), icon: '🔴' },
                        { color: 'gray', label: t("analytics.absent"), icon: '⚫' },
                        { color: 'blue', label: t("analytics.needToCheck"), icon: '🔵' }
                      ].map(({ color, label, icon }) => (
                        <div key={color} className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 rounded border">
                          <span>{icon}</span>
                          <span className="text-gray-700 dark:text-gray-300">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-4 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                    {analyticsData[analyticsLevel]?.slice(-20).map((item: any, index: number) => {
                      const total = item.total || 1
                      const availablePercent = (item.available / total) * 100
                      const remotePercent = (item.remote / total) * 100
                      const unavailablePercent = (item.unavailable / total) * 100
                      const holidayPercent = (item.holiday / total) * 100
                      const absentPercent = (item.absent / total) * 100
                      const checkPercent = (item.need_to_check / total) * 100

                      return (
                        <div key={index} className="group hover:bg-white dark:hover:bg-gray-800/50 rounded-lg p-3 transition-all duration-200">
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-3">
                              <Label className="text-sm font-bold text-gray-900 dark:text-gray-100 min-w-0">
                                {analyticsLevel === "day" ? format(new Date(item.date), "EEEE dd MMM", { locale: nl }) :
                                 analyticsLevel === "week" ? `Week van ${item.week}` :
                                 item.month}
                              </Label>
                              <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                {total} {t("analytics.entries") || "entries"}
                              </div>
                            </div>
                            
                            {/* Status breakdown on hover */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs text-gray-600 dark:text-gray-400 text-right">
                              <div>🟢 {item.available} • 🟣 {item.remote} • 🟡 {item.holiday}</div>
                              <div>🔴 {item.unavailable} • ⚫ {item.absent} • 🔵 {item.need_to_check}</div>
                            </div>
                          </div>
                          
                            <div className="relative">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6 flex overflow-hidden shadow-inner border border-gray-300 dark:border-gray-600">
                              {availablePercent > 0 && (
                                <div 
                                  className="bg-gradient-to-r from-green-500 to-green-600 h-full flex items-center justify-center text-white text-xs font-bold transition-all duration-300 hover:from-green-600 hover:to-green-700 first:rounded-l-full" 
                                  style={{ width: `${Math.max(availablePercent, 0)}%` }}
                                  title={`${t("analytics.available")}: ${item.available} (${availablePercent.toFixed(1)}%)`}
                                >
                                  {availablePercent > 12 && `${availablePercent.toFixed(0)}%`}
                                </div>
                              )}
                              {remotePercent > 0 && (
                                <div 
                                  className="bg-gradient-to-r from-purple-500 to-purple-600 h-full flex items-center justify-center text-white text-xs font-bold transition-all duration-300 hover:from-purple-600 hover:to-purple-700" 
                                  style={{ width: `${Math.max(remotePercent, 0)}%` }}
                                  title={`${t("analytics.remote")}: ${item.remote} (${remotePercent.toFixed(1)}%)`}
                                >
                                  {remotePercent > 12 && `${remotePercent.toFixed(0)}%`}
                                </div>
                              )}
                              {holidayPercent > 0 && (
                                <div 
                                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 h-full flex items-center justify-center text-white text-xs font-bold transition-all duration-300 hover:from-yellow-600 hover:to-yellow-700" 
                                  style={{ width: `${Math.max(holidayPercent, 0)}%` }}
                                  title={`${t("analytics.holiday")}: ${item.holiday} (${holidayPercent.toFixed(1)}%)`}
                                >
                                  {holidayPercent > 12 && `${holidayPercent.toFixed(0)}%`}
                                </div>
                              )}
                              {unavailablePercent > 0 && (
                                <div 
                                  className="bg-gradient-to-r from-red-500 to-red-600 h-full flex items-center justify-center text-white text-xs font-bold transition-all duration-300 hover:from-red-600 hover:to-red-700" 
                                  style={{ width: `${Math.max(unavailablePercent, 0)}%` }}
                                  title={`${t("analytics.unavailable")}: ${item.unavailable} (${unavailablePercent.toFixed(1)}%)`}
                                >
                                  {unavailablePercent > 12 && `${unavailablePercent.toFixed(0)}%`}
                                </div>
                              )}
                              {absentPercent > 0 && (
                                <div 
                                  className="bg-gradient-to-r from-gray-500 to-gray-600 h-full flex items-center justify-center text-white text-xs font-bold transition-all duration-300 hover:from-gray-600 hover:to-gray-700" 
                                  style={{ width: `${Math.max(absentPercent, 0)}%` }}
                                  title={`${t("analytics.absent")}: ${item.absent} (${absentPercent.toFixed(1)}%)`}
                                >
                                  {absentPercent > 12 && `${absentPercent.toFixed(0)}%`}
                                </div>
                              )}
                              {checkPercent > 0 && (
                                <div 
                                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-full flex items-center justify-center text-white text-xs font-bold transition-all duration-300 hover:from-blue-600 hover:to-blue-700 last:rounded-r-full" 
                                  style={{ width: `${Math.max(checkPercent, 0)}%` }}
                                  title={`${t("analytics.needToCheck")}: ${item.need_to_check} (${checkPercent.toFixed(1)}%)`}
                                >
                                  {checkPercent > 12 && `${checkPercent.toFixed(0)}%`}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Trend explanation */}
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">💡</span>
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        <span className="font-semibold">Tip:</span> 
                        <span className="ml-1">
                          Hover over de balken om exacte cijfers te zien. De breedte van elke kleur toont het percentage van die status.
                          {analyticsData[analyticsLevel]?.length > 20 && " (Toont de laatste 20 periodes)"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Line Chart with Better Explanations and Interactivity */}
                <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                  <div className="mb-6">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                      📈 {t("analytics.lineTrend")}
                      <span className="text-sm font-normal text-gray-500">
                        ({analyticsLevel === "day" ? t("analytics.daily") : analyticsLevel === "week" ? t("analytics.weekly") : t("analytics.monthly")})
                      </span>
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
                      {t("analytics.lineTrendDescription")}
                    </p>
                  </div>
                  
                  <div className="relative h-80 w-full bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-inner">
                    {/* Enhanced Grid lines with labels */}
                    <div className="absolute inset-6 flex flex-col justify-between pointer-events-none">
                      {[100, 75, 50, 25, 0].map((percent) => (
                        <div key={percent} className="relative w-full">
                          <div className="w-full border-t border-gray-200 dark:border-gray-600 border-dashed opacity-60"></div>
                          <span className="absolute -left-8 -top-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                            {percent}%
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Y-axis label */}
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -rotate-90 text-xs font-semibold text-gray-600 dark:text-gray-400 -ml-4">
                      {t("analytics.percentageAvailable")}
                    </div>
                    
                    {/* Data visualization with enhanced styling */}
                    <div className="absolute inset-6 flex items-end justify-between">
                      {analyticsData[analyticsLevel]?.slice(-15).map((item: any, index: number, array: any[]) => {
                        const total = item.total || 1
                        const availablePercent = (item.available / total) * 100
                        const maxHeight = 288 // available height minus padding
                        const height = Math.max((availablePercent / 100) * maxHeight, 6)
                        
                        // Calculate trend (up/down/stable)
                        let trend = 'stable'
                        if (index > 0) {
                          const prevPercent = (array[index - 1].available / (array[index - 1].total || 1)) * 100
                          if (availablePercent > prevPercent + 2) trend = 'up'
                          else if (availablePercent < prevPercent - 2) trend = 'down'
                        }
                        
                        return (
                          <div key={index} className="flex flex-col items-center group relative min-w-0">
                            {/* Data point with enhanced styling */}
                            <div className="relative mb-10">
                              {/* Trend indicator */}
                              {trend !== 'stable' && (
                                <div className={`absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs ${
                                  trend === 'up' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {trend === 'up' ? '↗️' : '↘️'}
                                </div>
                              )}
                              
                              {/* Bar - constrained within container */}
                              <div 
                                className={`w-2 bg-gradient-to-t rounded-t shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:w-3 ${
                                  availablePercent >= 80 ? 'from-green-600 to-green-400' :
                                  availablePercent >= 60 ? 'from-yellow-600 to-yellow-400' :
                                  availablePercent >= 40 ? 'from-orange-600 to-orange-400' :
                                  'from-red-600 to-red-400'
                                }`}
                                style={{ 
                                  height: `${Math.min(Math.max(height, 8), maxHeight - 16)}px`,
                                  maxHeight: `${maxHeight - 16}px`
                                }}
                              ></div>
                              
                              {/* Data point circle - also constrained */}
                              <div 
                                className={`w-4 h-4 rounded-full absolute -left-1 border-3 border-white dark:border-gray-800 shadow-lg transition-all duration-300 group-hover:scale-125 group-hover:shadow-xl ${
                                  availablePercent >= 80 ? 'bg-green-600' :
                                  availablePercent >= 60 ? 'bg-yellow-600' :
                                  availablePercent >= 40 ? 'bg-orange-600' :
                                  'bg-red-600'
                                }`}
                                style={{ 
                                  top: `${Math.min(Math.max(height, 8), maxHeight - 16) - 8}px`
                                }}
                              ></div>
                              
                              {/* Enhanced Tooltip */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 opacity-0 group-hover:opacity-100 transition-all duration-300 z-30 pointer-events-none">
                                <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-xl px-4 py-3 whitespace-nowrap shadow-2xl border border-gray-700 dark:border-gray-300">
                                  <div className="space-y-1">
                                    <div className="font-bold text-center border-b border-gray-600 dark:border-gray-400 pb-1">
                                      {analyticsLevel === "day" ? format(new Date(item.date), "EEEE dd MMM", { locale: nl }) :
                                       analyticsLevel === "week" ? `Week van ${item.week}` :
                                       item.month}
                                    </div>
                                    <div className="font-semibold text-green-300 dark:text-green-600">
                                      📊 {t("analytics.availablePercent").replace("{percent}", availablePercent.toFixed(1))}
                                    </div>
                                    <div className="text-gray-300 dark:text-gray-600">
                                      👥 {t("analytics.teamMembers").replace("{available}", String(item.available)).replace("{total}", String(total))}
                                    </div>
                                    <div className="text-gray-400 dark:text-gray-500 text-center pt-1 border-t border-gray-600 dark:border-gray-400">
                                      🟣 {item.remote} {t("analytics.remoteShort")} • 🔴 {item.unavailable} {t("analytics.unavailableShort")}
                                    </div>
                                  </div>
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                                </div>
                              </div>
                            </div>
                            
                            {/* X-axis label with better formatting */}
                            <div className="text-xs text-gray-600 dark:text-gray-400 font-medium text-center leading-tight max-w-16 transform group-hover:scale-110 transition-transform duration-200">
                              {analyticsLevel === "day" ? format(new Date(item.date), "dd\nMMM", { locale: nl }).split('\n').map((line, i) => (
                                <div key={i} className={i === 0 ? 'font-bold' : 'font-normal'}>{line}</div>
                              )) :
                               analyticsLevel === "week" ? (
                                <div className="space-y-0.5">
                                  <div className="font-bold">{item.week.split(' ')[1]}</div>
                                  <div className="font-normal text-xs">{item.week.split(' ')[0]}</div>
                                </div>
                               ) :
                               (
                                <div className="space-y-0.5">
                                  <div className="font-bold">{item.month.split(' ')[0]}</div>
                                  <div className="font-normal text-xs">{item.month.split(' ')[1]}</div>
                                </div>
                               )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    
                    {/* X-axis label */}
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                      {t("analytics.timePeriod")} ({analyticsLevel === 'day' ? t("analytics.days") : analyticsLevel === 'week' ? t("analytics.weeks") : t("analytics.months")})
                    </div>
                  </div>
                  
                  {/* Chart explanation and insights */}
                  <div className="mt-6 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Color coding explanation */}
                      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <h5 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                          🎨 {t("analytics.colorCoding")}
                        </h5>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-600 rounded"></div>
                            <span className="text-gray-700 dark:text-gray-300">80%+ {t("analytics.available").toLowerCase()} ({t("analytics.excellent")})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-600 rounded"></div>
                            <span className="text-gray-700 dark:text-gray-300">60-79% {t("analytics.available").toLowerCase()} ({t("analytics.good")})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-orange-600 rounded"></div>
                            <span className="text-gray-700 dark:text-gray-300">40-59% {t("analytics.available").toLowerCase()} ({t("analytics.moderate")})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-600 rounded"></div>
                            <span className="text-gray-700 dark:text-gray-300">&lt;40% {t("analytics.available").toLowerCase()} ({t("analytics.low")})</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Quick insights */}
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                        <h5 className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                          💡 {t("analytics.quickInsights")}
                        </h5>
                        <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                          {analyticsData[analyticsLevel]?.slice(-15).length > 0 && (() => {
                            const data = analyticsData[analyticsLevel].slice(-15)
                            const avgAvailability = data.reduce((sum: number, item: any) => sum + (item.available / (item.total || 1)), 0) / data.length * 100
                            const trend = data.length > 1 ? 
                              (data[data.length - 1].available / (data[data.length - 1].total || 1)) - (data[0].available / (data[0].total || 1)) : 0
                            
                            return (
                              <>
                                <div>📊 {t("analytics.averageAvailability").replace("{percent}", avgAvailability.toFixed(1))}</div>
                                <div>
                                  {trend > 0.1 ? `📈 ${t("analytics.trendUp")}` : trend < -0.1 ? `📉 ${t("analytics.trendDown")}` : `➡️ ${t("analytics.trendStable")}`}
                                </div>
                                <div>📅 {t("analytics.shownLast").replace("{count}", String(data.length))}</div>
                              </>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-16">
                <div className="text-center max-w-md">
                  <div className="w-12 h-12 border-3 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    📊 {t("analytics.loadingTitle")}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {t("analytics.loadingDescription")}
                  </p>
                  <div className="mt-4 text-sm text-gray-500 dark:text-gray-500">
                    💡 {t("analytics.loadingTip")}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between w-full">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                💡 Data wordt automatisch ververst bij het openen van analytics
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={fetchAnalyticsData}
                  disabled={!analyticsData}
                  className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  title="Ververs de analytics data"
                >
                  🔄 Ververs
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowAnalytics(false)} 
                  className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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
  const [todayAvailability, setTodayAvailability] = useState<Record<string, string>>({})
  const { t } = useTranslation(locale)

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
      <DialogContent className="sm:max-w-[1000px] bg-white dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-600" />
            {t("analytics.title")}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">
            {t("analytics.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Analytics Level Selector */}
          <div className="flex items-center gap-4">
            <Label className="text-sm font-semibold text-gray-900 dark:text-white">View:</Label>
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAnalyticsLevel("day")}
                className={cn(
                  "text-xs font-medium transition-all duration-200",
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
                  "text-xs font-medium transition-all duration-200",
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
                  "text-xs font-medium transition-all duration-200",
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
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-green-600"></div>
                    <Label className="text-xs font-semibold text-green-800 dark:text-green-200">Available</Label>
                  </div>
                  <div className="text-lg font-bold text-green-900 dark:text-green-100">
                    {analyticsData[analyticsLevel]?.reduce((sum: number, item: any) => sum + item.available, 0) || 0}
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                    <Label className="text-xs font-semibold text-purple-800 dark:text-purple-200">Remote</Label>
                  </div>
                  <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                    {analyticsData[analyticsLevel]?.reduce((sum: number, item: any) => sum + item.remote, 0) || 0}
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-700">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-red-600"></div>
                    <Label className="text-xs font-semibold text-red-800 dark:text-red-200">Unavailable</Label>
                  </div>
                  <div className="text-lg font-bold text-red-900 dark:text-red-100">
                    {analyticsData[analyticsLevel]?.reduce((sum: number, item: any) => sum + item.unavailable, 0) || 0}
                  </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
                    <Label className="text-xs font-semibold text-yellow-800 dark:text-yellow-200">Holiday</Label>
                  </div>
                  <div className="text-lg font-bold text-yellow-900 dark:text-yellow-100">
                    {analyticsData[analyticsLevel]?.reduce((sum: number, item: any) => sum + item.holiday, 0) || 0}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                    <Label className="text-xs font-semibold text-gray-800 dark:text-gray-200">Absent</Label>
                  </div>
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {analyticsData[analyticsLevel]?.reduce((sum: number, item: any) => sum + item.absent, 0) || 0}
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                    <Label className="text-xs font-semibold text-blue-800 dark:text-blue-200">To Check</Label>
                  </div>
                  <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                    {analyticsData[analyticsLevel]?.reduce((sum: number, item: any) => sum + item.need_to_check, 0) || 0}
                  </div>
                </div>
              </div>

              {/* Simple Chart Representation */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6">
                <Label className="text-lg font-bold text-gray-900 dark:text-white mb-4 block">
                  Availability Trend ({analyticsLevel === "day" ? "Daily" : analyticsLevel === "week" ? "Weekly" : "Monthly"})
                </Label>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {analyticsData[analyticsLevel]?.slice(-20).map((item: any, index: number) => {
                    const total = item.total || 1
                    const availablePercent = (item.available / total) * 100
                    const remotePercent = (item.remote / total) * 100
                    const unavailablePercent = (item.unavailable / total) * 100
                    const holidayPercent = (item.holiday / total) * 100
                    const absentPercent = (item.absent / total) * 100
                    const checkPercent = (item.need_to_check / total) * 100

                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {analyticsLevel === "day" ? format(new Date(item.date), "MMM dd", { locale: nl }) :
                             analyticsLevel === "week" ? item.week :
                             item.month}
                          </Label>
                          <span className="text-xs text-gray-500">{total} entries</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4 flex overflow-hidden">
                          <div className="bg-green-600 h-full" style={{ width: `${availablePercent}%` }}></div>
                          <div className="bg-purple-600 h-full" style={{ width: `${remotePercent}%` }}></div>
                          <div className="bg-yellow-600 h-full" style={{ width: `${holidayPercent}%` }}></div>
                          <div className="bg-red-600 h-full" style={{ width: `${unavailablePercent}%` }}></div>
                          <div className="bg-gray-600 h-full" style={{ width: `${absentPercent}%` }}></div>
                          <div className="bg-blue-600 h-full" style={{ width: `${checkPercent}%` }}></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading analytics data...</p>
              </div>
            </div>
          )}
        </div>          <DialogFooter className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between w-full">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                💡 Data wordt automatisch ververst bij het openen van analytics
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={fetchAnalyticsData}
                  disabled={!analyticsData}
                  className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  title="Ververs de analytics data"
                >
                  🔄 Ververs
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowAnalytics(false)} 
                  className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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
