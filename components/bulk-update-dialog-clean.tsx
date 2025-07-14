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

  // Process analytics data with unique member counting per day
  const processAnalyticsData = (data: any[], level: "day" | "week" | "month") => {
    const grouped: Record<string, Record<string, Set<string>>> = {}
    
    data.forEach(item => {
      const date = new Date(item.date)
      let key: string
      
      if (level === "day") {
        key = date.toISOString().split('T')[0]
      } else if (level === "week") {
        const weekStart = startOfWeek(date, { weekStartsOn: 1 })
        key = `${weekStart.toISOString().split('T')[0]}`
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      }
      
      if (!grouped[key]) {
        grouped[key] = {}
      }
      
      const status = item.status || 'available'
      if (!grouped[key][status]) {
        grouped[key][status] = new Set()
      }
      
      // Add member_id to the set for this status on this day
      grouped[key][status].add(item.member_id)
    })
    
    // Convert sets to counts
    const result = Object.keys(grouped).map(key => {
      const statusCounts: Record<string, number> = {}
      Object.keys(grouped[key]).forEach(status => {
        statusCounts[status] = grouped[key][status].size
      })
      
      return {
        date: key,
        ...statusCounts
      }
    }).sort((a, b) => a.date.localeCompare(b.date))
    
    return result
  }

  const fetchAnalyticsData = async () => {
    try {
      const endDate = new Date()
      const startDate = new Date()
      
      if (analyticsLevel === "day") {
        startDate.setDate(endDate.getDate() - 30)
      } else if (analyticsLevel === "week") {
        startDate.setDate(endDate.getDate() - 84)
      } else {
        startDate.setMonth(endDate.getMonth() - 6)
      }

      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (error) {
        console.error('Error fetching analytics data:', error)
        return
      }

      const processedData = processAnalyticsData(data || [], analyticsLevel)
      setAnalyticsData(processedData)
    } catch (error) {
      console.error('Analytics fetch error:', error)
    }
  }

  useEffect(() => {
    if (showAnalytics) {
      fetchAnalyticsData()
    }
  }, [showAnalytics, analyticsLevel])

  const handleShowAnalytics = () => {
    setShowAnalytics(true)
    if (!analyticsData) {
      fetchAnalyticsData()
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500'
      case 'remote': return 'bg-purple-500'
      case 'unavailable': return 'bg-red-500'
      case 'need_to_check': return 'bg-blue-500'
      case 'absent': return 'bg-gray-500'
      case 'holiday': return 'bg-yellow-500'
      default: return 'bg-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return '🟢'
      case 'remote': return '🟣'
      case 'unavailable': return '🔴'
      case 'need_to_check': return '🔵'
      case 'absent': return '⚫'
      case 'holiday': return '🟡'
      default: return '⚪'
    }
  }

  const formatDateLabel = (dateStr: string) => {
    if (analyticsLevel === "day") {
      return format(new Date(dateStr), 'dd MMM', { locale: nl })
    } else if (analyticsLevel === "week") {
      const weekStart = new Date(dateStr)
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
      return `${format(weekStart, 'dd MMM', { locale: nl })} - ${format(weekEnd, 'dd MMM', { locale: nl })}`
    } else {
      const [year, month] = dateStr.split('-')
      return format(new Date(parseInt(year), parseInt(month) - 1, 1), 'MMM yyyy', { locale: nl })
    }
  }

  const getTotalUniquePeople = () => {
    if (!analyticsData) return 0
    const allMemberIds = new Set<string>()
    
    analyticsData.forEach((item: any) => {
      Object.keys(item).forEach(key => {
        if (key !== 'date' && item[key] > 0) {
          // This is a simplified approximation since we don't have the original member IDs
          // In a real implementation, you'd need to track the actual member IDs
          for (let i = 0; i < item[key]; i++) {
            allMemberIds.add(`${key}_${i}`)
          }
        }
      })
    })
    
    return allMemberIds.size
  }

  const getStatusCounts = () => {
    if (!analyticsData) return {}
    
    const statusCounts: Record<string, number> = {}
    
    analyticsData.forEach((item: any) => {
      Object.keys(item).forEach(key => {
        if (key !== 'date' && item[key] > 0) {
          statusCounts[key] = (statusCounts[key] || 0) + item[key]
        }
      })
    })
    
    return statusCounts
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
                    "h-7 px-2 text-xs rounded-sm",
                    analyticsLevel === "day" 
                      ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" 
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  {t("analytics.daily")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAnalyticsLevel("week")}
                  className={cn(
                    "h-7 px-2 text-xs rounded-sm",
                    analyticsLevel === "week" 
                      ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" 
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  {t("analytics.weekly")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAnalyticsLevel("month")}
                  className={cn(
                    "h-7 px-2 text-xs rounded-sm",
                    analyticsLevel === "month" 
                      ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" 
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  {t("analytics.monthly")}
                </Button>
              </div>
            </div>

            {/* Summary Cards */}
            {analyticsData && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {Object.entries(getStatusCounts()).map(([status, count]) => (
                  <div key={status} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 text-center">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center justify-center gap-1">
                      <span>{getStatusIcon(status)}</span>
                      <span>{t(`status.${status}`)}</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{count}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {count === 1 ? t("analytics.person") : t("analytics.peopleCount")}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Chart */}
            {analyticsData && analyticsData.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <BarChart3 className="h-3 w-3" />
                  {t("analytics.uniqueMembers")} - {t(`analytics.${analyticsLevel}ly`)}
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {analyticsData.map((item: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <div className="w-16 text-gray-600 dark:text-gray-400 text-xs">
                        {formatDateLabel(item.date)}
                      </div>
                      <div className="flex-1 flex items-center gap-1">
                        {['available', 'remote', 'unavailable', 'need_to_check', 'absent', 'holiday'].map(status => {
                          const count = item[status] || 0
                          if (count === 0) return null
                          return (
                            <div key={status} className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
                              <span className="text-gray-700 dark:text-gray-300">{count}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <div className="flex justify-between items-center w-full">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t("analytics.perPersonBasis")}
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowAnalytics(false)} 
                className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 h-8 text-xs"
              >
                ✕ {t("analytics.close")}
              </Button>
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

  // Fetch today's availability for smart suggestions
  const fetchTodayAvailability = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('availability')
        .select('member_id, status')
        .eq('date', today)

      const todayStatuses: Record<string, string> = {}
      data?.forEach(item => {
        todayStatuses[item.member_id] = item.status
      })
      setTodayAvailability(todayStatuses)
    } catch (error) {
      console.error('Error fetching today availability:', error)
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
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
  }

  const handleSelectAllMembers = () => {
    if (selectedMembers.length === members.length) {
      setSelectedMembers([])
    } else {
      setSelectedMembers(members.map(m => m.id))
    }
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDates(prev => 
        prev.some(d => d.getTime() === date.getTime())
          ? prev.filter(d => d.getTime() !== date.getTime())
          : [...prev, date]
      )
    }
  }

  const handleDateRangeSelect = (days: number) => {
    const dates = []
    for (let i = 0; i < days; i++) {
      dates.push(addDays(new Date(), i))
    }
    setSelectedDates(dates)
  }

  const handleWeekdaysSelect = (weeks: number = 1) => {
    const dates = []
    for (let w = 0; w < weeks; w++) {
      const weekStart = addWeeks(new Date(), w)
      const mondayOfWeek = startOfWeek(weekStart, { weekStartsOn: 1 })
      
      for (let i = 0; i < 7; i++) {
        const date = addDays(mondayOfWeek, i)
        if (!isWeekend(date)) {
          dates.push(date)
        }
      }
    }
    setSelectedDates(dates)
  }

  const handleBulkUpdate = async () => {
    if (selectedMembers.length === 0 || selectedDates.length === 0) {
      alert(t("bulkUpdate.selectMembersAndDates"))
      return
    }

    setIsUpdating(true)
    
    try {
      // Delete existing availability records for selected members and dates
      const dateStrings = selectedDates.map(date => date.toISOString().split('T')[0])
      
      await supabase
        .from('availability')
        .delete()
        .in('member_id', selectedMembers)
        .in('date', dateStrings)

      // Insert new availability records
      const insertData = selectedMembers.flatMap(memberId =>
        dateStrings.map(date => ({
          member_id: memberId,
          date: date,
          status: selectedStatus,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
      )

      const { error } = await supabase
        .from('availability')
        .insert(insertData)

      if (error) {
        console.error('Bulk update error:', error)
        alert(t("common.error"))
        return
      }

      // Success
      alert(t("bulkUpdate.success"))
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
            <Users className="h-4 w-4 mr-2" />
            {t("bulkUpdate.title")}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t("bulkUpdate.title")}
            </DialogTitle>
            <DialogDescription>
              {t("bulkUpdate.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Member Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium">{t("bulkUpdate.selectMembers")}</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllMembers}
                  className="h-8 text-xs"
                >
                  {selectedMembers.length === members.length 
                    ? t("bulkUpdate.deselectAll") 
                    : t("bulkUpdate.selectAll")
                  }
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto border rounded-lg p-3">
                {members.map(member => (
                  <div
                    key={member.id}
                    className={cn(
                      "flex items-center space-x-3 p-2 rounded-lg border transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800",
                      selectedMembers.includes(member.id) 
                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700" 
                        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                    )}
                    onClick={() => handleMemberToggle(member.id)}
                  >
                    <Checkbox 
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => handleMemberToggle(member.id)}
                      className="pointer-events-none"
                    />
                    <MemberAvatar member={member} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {member.first_name} {member.last_name}
                      </p>
                      {todayAvailability[member.id] && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t("bulkUpdate.today")}: {t(`status.${todayAvailability[member.id]}`)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Selection */}
            <div>
              <Label className="text-sm font-medium mb-3 block">{t("bulkUpdate.selectDates")}</Label>
              
              {/* Quick Date Selection */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDateRangeSelect(7)}
                  className="h-8 text-xs"
                >
                  <CalendarDays className="h-3 w-3 mr-1" />
                  {t("bulkUpdate.next7Days")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleWeekdaysSelect(1)}
                  className="h-8 text-xs"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {t("bulkUpdate.thisWeek")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleWeekdaysSelect(2)}
                  className="h-8 text-xs"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  {t("bulkUpdate.next2Weeks")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDates([])}
                  className="h-8 text-xs"
                >
                  <Target className="h-3 w-3 mr-1" />
                  {t("bulkUpdate.clearDates")}
                </Button>
              </div>

              {/* Calendar */}
              <div className="border rounded-lg p-3">
                <Calendar
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={(dates) => setSelectedDates(dates || [])}
                  className="rounded-md"
                  locale={nl}
                />
              </div>

              {/* Selected Dates Display */}
              {selectedDates.length > 0 && (
                <div className="mt-3">
                  <Label className="text-xs text-gray-600 dark:text-gray-400">
                    {t("bulkUpdate.selectedDates")} ({selectedDates.length})
                  </Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedDates.slice(0, 10).map(date => (
                      <Badge key={date.toISOString()} variant="secondary" className="text-xs">
                        {format(date, 'dd MMM', { locale: nl })}
                      </Badge>
                    ))}
                    {selectedDates.length > 10 && (
                      <Badge variant="secondary" className="text-xs">
                        +{selectedDates.length - 10} {t("bulkUpdate.more")}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Status Selection */}
            <div>
              <Label className="text-sm font-medium mb-3 block">{t("bulkUpdate.selectStatus")}</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {statusOptions.map(option => (
                  <div
                    key={option.value}
                    className={cn(
                      "flex items-center space-x-2 p-3 rounded-lg border transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800",
                      selectedStatus === option.value
                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700"
                        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                    )}
                    onClick={() => setSelectedStatus(option.value as any)}
                  >
                    <div className="text-lg">{option.icon}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {option.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            {selectedMembers.length > 0 && selectedDates.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  {t("bulkUpdate.summary")}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-blue-700 dark:text-blue-300 font-medium">
                      {selectedMembers.length} {selectedMembers.length === 1 ? t("bulkUpdate.member") : t("bulkUpdate.members")}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-700 dark:text-blue-300 font-medium">
                      {selectedDates.length} {selectedDates.length === 1 ? t("bulkUpdate.date") : t("bulkUpdate.dates")}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-700 dark:text-blue-300 font-medium">
                      {statusOptions.find(s => s.value === selectedStatus)?.label}
                    </p>
                  </div>
                </div>
                <Separator className="my-3 bg-blue-200 dark:bg-blue-700" />
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {t("bulkUpdate.totalUpdates")}: {selectedMembers.length * selectedDates.length}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isUpdating}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleBulkUpdate}
              disabled={selectedMembers.length === 0 || selectedDates.length === 0 || isUpdating}
            >
              {isUpdating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  {t("bulkUpdate.updating")}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t("bulkUpdate.update")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
