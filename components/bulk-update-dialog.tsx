"use client"

import { useState, useEffect, useRef } from "react"
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
import { CalendarIcon, Users, Clock, CheckCircle, Calendar as CalendarDays, Zap, Bolt, Target, Filter, Play, BarChart3, TrendingUp, Calendar as CalendarIcon2 } from "lucide-react"
import { format, addDays, startOfWeek, endOfWeek, addWeeks, isWeekend, startOfMonth, endOfMonth } from "date-fns"
import { nl, enUS, fr } from "date-fns/locale"
import { supabase } from "@/lib/supabase"
import { useTranslation, type Locale } from "@/lib/i18n"
import { MemberAvatar } from "./member-avatar"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart as RBarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'

interface Member {
  id: string
  first_name: string
  last_name: string
  email?: string
  profile_image?: string
  is_hidden?: boolean
}

interface BulkUpdateDialogProps {
  members: Member[]
  locale: Locale
  onUpdate: () => void
  onRangeSelectionChange?: (startDate?: Date, endDate?: Date, isActive?: boolean) => void
}

// Export individual button components
export function AnalyticsButton({ members, locale, weeksToShow, currentDate, teamId }: { 
  members: Member[], 
  locale: Locale,
  weeksToShow: 1 | 2 | 4 | 8,
  currentDate: Date,
  teamId: string
}) {
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [simplifiedMode, setSimplifiedMode] = useState(false)
  const [showPersonalCharts, setShowPersonalCharts] = useState(false)
  const [selectedMemberForChart, setSelectedMemberForChart] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'current' | 'custom'>('current')
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date())
  const [customEndDate, setCustomEndDate] = useState<Date>(() => {
    const date = new Date()
    date.setDate(date.getDate() + 6)
    return date
  })
  // Year overview state
  const [viewMode, setViewMode] = useState<'overview' | 'year'>('overview')
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [yearLoading, setYearLoading] = useState<boolean>(false)
  const [yearStats, setYearStats] = useState<null | {
    workdays: number
    weekends: number
    teamTotals: Record<string, number>
    memberBreakdown: Record<string, {
      available: number
      remote: number
      unavailable: number
      need_to_check: number
      absent: number
      holiday: number
      unfilled: number
      workdays: number
    }>
  }>(null)
  // Weekend behavior setting: when true, weekends are treated as weekdays (countable)
  const [weekendsAsWeekdays, setWeekendsAsWeekdays] = useState<boolean>(false)
  const { t } = useTranslation(locale)

  // Get date-fns locale based on current locale
  const getDateFnsLocale = () => {
    switch (locale) {
      case 'nl': return nl
      case 'fr': return fr
      default: return enUS
    }
  }

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

  // Check for personal charts preference
  useEffect(() => {
    const savedShowPersonalCharts = localStorage.getItem("showPersonalCharts") === "true"
    setShowPersonalCharts(savedShowPersonalCharts)
  }, [])

  // Load weekend behavior preference and listen for changes
  useEffect(() => {
    // Load per-team preference
    if (teamId) {
      const saved = localStorage.getItem(`weekendsAsWeekdays:${teamId}`) === 'true'
      setWeekendsAsWeekdays(saved)
    }
    const handler = (e: any) => {
      const detail = e?.detail
      if (!detail || (detail && detail.teamId === teamId)) {
        const val = typeof detail === 'object' ? !!detail.enabled : !!detail
        setWeekendsAsWeekdays(val)
        if (showAnalytics && viewMode === 'year') {
          ensureYearsAndFetch(selectedYear)
        }
      }
    }
    window.addEventListener('weekendsAsWeekdaysChanged', handler as EventListener)
    return () => window.removeEventListener('weekendsAsWeekdaysChanged', handler as EventListener)
  }, [showAnalytics, viewMode, selectedYear, teamId])

  // Process analytics data with unique member counting per day
  const processAnalyticsData = (data: any[], level: "day" | "week" | "month") => {
    // First, deduplicate data per member per day (keep most recent status)
    const memberDayStatuses: Record<string, Record<string, any>> = {}
    
    data.forEach(item => {
      const memberId = item.member_id
      const date = item.date
      const key = `${memberId}-${date}`
      
      if (!memberDayStatuses[key] || new Date(item.created_at || 0) > new Date(memberDayStatuses[key].created_at || 0)) {
        memberDayStatuses[key] = item
      }
    })
    
    // Convert back to array of deduplicated entries
    const deduplicatedData = Object.values(memberDayStatuses)
    
    // Now process the deduplicated data for aggregation
    const grouped: Record<string, Record<string, Set<string>>> = {}
    const memberData: Record<string, any[]> = {} // Store raw member data
    
    deduplicatedData.forEach(item => {
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
      
      // Store raw member data for individual stats
      if (!memberData[item.member_id]) {
        memberData[item.member_id] = []
      }
      memberData[item.member_id].push(item)
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
    
    // Store memberData in result for individual stats
    return { timeData: result, memberData }
  }

  const fetchAnalyticsData = async () => {
    try {
      let startDate: Date, endDate: Date
      
      if (selectedPeriod === 'custom') {
        startDate = new Date(customStartDate)
        endDate = new Date(customEndDate)
      } else {
        // Calculate the Monday of the current week (start of period)
        const getMondayOfWeek = (date: Date): Date => {
          const d = new Date(date)
          const day = d.getDay()
          const diff = d.getDate() - day + (day === 0 ? -6 : 1)
          return new Date(d.setDate(diff))
        }
        
        // Use Monday of the current week as start date
        startDate = getMondayOfWeek(currentDate)
        endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + weeksToShow * 7 - 1)
      }

      const { data, error } = await supabase
        .from('availability')
        .select(`
          date,
          status,
          member_id,
          created_at,
          members!inner(first_name, last_name, profile_image, team_id)
        `)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .eq('members.team_id', teamId) // Filter by team_id
        .order('date', { ascending: true })

      if (error) {
        console.error('Error fetching analytics data:', error)
        return
      }

      // Always use "day" level for analytics to show detailed daily data
      const processedData = processAnalyticsData(data || [], "day")
      setAnalyticsData(processedData)
    } catch (error) {
      console.error('Analytics fetch error:', error)
    }
  }

  useEffect(() => {
    if (showAnalytics) {
      if (viewMode === 'overview') {
        fetchAnalyticsData()
        fetchMemberStats()
      } else {
        ensureYearsAndFetch(selectedYear)
      }
    }
  }, [showAnalytics, weeksToShow, currentDate, selectedPeriod, customStartDate, customEndDate, viewMode, selectedYear])

  const handleShowAnalytics = () => {
    setShowAnalytics(true)
    if (viewMode === 'overview') {
      if (!analyticsData) {
        fetchAnalyticsData()
      }
      if (Object.keys(memberStats).length === 0) {
        fetchMemberStats()
      }
    } else {
      ensureYearsAndFetch(selectedYear)
    }
  }

  // Year helpers
  const ensureYearsAndFetch = async (year: number) => {
    if (!availableYears || availableYears.length === 0) {
      await fetchAvailableYears()
    }
    await fetchYearStats(year)
  }

  const fetchAvailableYears = async () => {
    try {
      const { data, error } = await supabase
        .from('availability')
        .select(`date, members!inner(team_id)`) 
        .eq('members.team_id', teamId)
        .order('date', { ascending: true })

      if (error) {
        console.error('Error fetching years:', error)
        return
      }

      const yearsSet = new Set<number>()
      ;(data || []).forEach((row: any) => {
        if (row.date) {
          yearsSet.add(new Date(row.date).getFullYear())
        }
      })
      const years = Array.from(yearsSet).sort((a, b) => b - a)
      setAvailableYears(years)
      if (years.length > 0 && !years.includes(selectedYear)) {
        setSelectedYear(years[0])
      }
    } catch (e) {
      console.error('Years fetch error:', e)
    }
  }

  const fetchYearStats = async (year: number) => {
    setYearLoading(true)
    try {
      const start = new Date(year, 0, 1)
      const end = new Date(year, 11, 31)
      const { data, error } = await supabase
        .from('availability')
        .select(`date, status, member_id, created_at, members!inner(team_id)`) 
        .eq('members.team_id', teamId)
        .gte('date', start.toISOString().split('T')[0])
        .lte('date', end.toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (error) {
        console.error('Error fetching year stats:', error)
        setYearLoading(false)
        return
      }

      // Deduplicate by member-date keep latest
      const latestByMemberDate: Record<string, any> = {}
      ;(data || []).forEach((row: any) => {
        const key = `${row.member_id}-${row.date}`
        const prev = latestByMemberDate[key]
        if (!prev || new Date(row.created_at || 0) > new Date(prev.created_at || 0)) {
          latestByMemberDate[key] = row
        }
      })

      // Precompute workdays/weekends in year
      let totalWorkdays = 0
      let totalWeekends = 0
      const daysInYear: string[] = []
      const cursor = new Date(start)
      while (cursor <= end) {
        const iso = cursor.toISOString().split('T')[0]
        daysInYear.push(iso)
        if (isWeekend(cursor)) totalWeekends++
        else totalWorkdays++
        cursor.setDate(cursor.getDate() + 1)
      }

      // Initialize per-member breakdown
      const breakdown: Record<string, any> = {}
      members.forEach(m => {
        breakdown[m.id] = {
          available: 0,
          remote: 0,
          unavailable: 0,
          need_to_check: 0,
          absent: 0,
          holiday: 0,
          unfilled: 0,
          // workdays will represent counted days: weekdays only by default,
          // or all days if weekends are treated as weekdays
          workdays: weekendsAsWeekdays ? (totalWorkdays + totalWeekends) : totalWorkdays
        }
      })

      // Count statuses per member
      for (const iso of daysInYear) {
        const dt = new Date(iso)
        const isWknd = isWeekend(dt)
        // Skip weekends unless weekends are treated as weekdays
        if (isWknd && !weekendsAsWeekdays) continue
        members.forEach(m => {
          const key = `${m.id}-${iso}`
          const entry = latestByMemberDate[key]
          if (!entry) {
            breakdown[m.id].unfilled++
          } else {
            const status = entry.status || 'available'
            if (breakdown[m.id][status] !== undefined) {
              breakdown[m.id][status]++
            } else {
              // Unknown statuses do not count; treat as unavailable fallback
              breakdown[m.id].unavailable++
            }
          }
        })
      }

      // Team totals
      const totals: Record<string, number> = {
        available: 0,
        remote: 0,
        unavailable: 0,
        need_to_check: 0,
        absent: 0,
        holiday: 0,
        unfilled: 0
      }
      Object.values(breakdown).forEach((b: any) => {
        totals.available += b.available
        totals.remote += b.remote
        totals.unavailable += b.unavailable
        totals.need_to_check += b.need_to_check
        totals.absent += b.absent
        totals.holiday += b.holiday
        totals.unfilled += b.unfilled
      })

      setYearStats({
        // workdays here means counted workdays (weekdays) for the year header; keep original numbers for display
        workdays: totalWorkdays,
        weekends: totalWeekends,
        teamTotals: totals,
        memberBreakdown: breakdown
      })
    } catch (e) {
      console.error('Year stats error:', e)
    } finally {
      setYearLoading(false)
    }
  }

  const handleTogglePersonalCharts = () => {
    const newValue = !showPersonalCharts
    setShowPersonalCharts(newValue)
    localStorage.setItem("showPersonalCharts", newValue.toString())
    if (!newValue) {
      setSelectedMemberForChart(null) // Reset selection when hiding charts
    }
  }

  const handleMemberClick = (memberId: string) => {
    if (selectedMemberForChart === memberId) {
      setSelectedMemberForChart(null) // Deselect if already selected
    } else {
      setSelectedMemberForChart(memberId) // Select new member
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return t("status.available")
      case 'remote': return t("status.remote")
      case 'unavailable': return t("status.unavailable")
      case 'need_to_check': return t("status.need_to_check")
      case 'absent': return t("status.absent")
      case 'holiday': return t("status.holiday")
      case 'not_set': return t("status.not_set")
      default: return status
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

  // (removed: statusHex now lives inside YearOverviewSection)

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
    return format(new Date(dateStr), 'dd MMM', { locale: nl })
  }

  const getTotalUniquePeople = () => {
    if (!analyticsData || !analyticsData.memberData) return 0
    return Object.keys(analyticsData.memberData).length
  }

  const getStatusCounts = () => {
    if (!analyticsData || !analyticsData.timeData) return {}
    
    const statusCounts: Record<string, number> = {}
    
    analyticsData.timeData.forEach((item: any) => {
      Object.keys(item).forEach(key => {
        if (key !== 'date' && item[key] > 0) {
          statusCounts[key] = (statusCounts[key] || 0) + item[key]
        }
      })
    })
    
    return statusCounts
  }

  // Fetch all member statistics from database (not limited to analytics period)
  const [memberStats, setMemberStats] = useState<Record<string, any>>({})
  const [memberStatsLoading, setMemberStatsLoading] = useState(false)
  
  const fetchMemberStats = async () => {
    setMemberStatsLoading(true)
    try {
      let startDate: Date, endDate: Date
      
      if (selectedPeriod === 'custom') {
        startDate = new Date(customStartDate)
        endDate = new Date(customEndDate)
      } else {
        // Calculate the Monday of the current week (start of period)
        const getMondayOfWeek = (date: Date): Date => {
          const d = new Date(date)
          const day = d.getDay()
          const diff = d.getDate() - day + (day === 0 ? -6 : 1)
          return new Date(d.setDate(diff))
        }
        
        // Use Monday of the current week as start date
        startDate = getMondayOfWeek(currentDate)
        endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + weeksToShow * 7 - 1)
      }
      
      const { data, error } = await supabase
        .from('availability')
        .select(`
          member_id, 
          status, 
          date, 
          created_at,
          members!inner(team_id)
        `)
        .eq('members.team_id', teamId) // Filter by team_id
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (error) {
        console.error('Error fetching member stats:', error)
        return
      }

      const memberStatistics: Record<string, any> = {}
      
      // Process each member
      members.forEach(member => {
        const memberData = data?.filter(item => item.member_id === member.id) || []
        
        // Deduplicate by date (keep most recent status per day)
        const dailyStatuses: Record<string, any> = {}
        memberData.forEach(entry => {
          const date = entry.date
          if (!dailyStatuses[date] || new Date(entry.created_at || 0) > new Date(dailyStatuses[date].created_at || 0)) {
            dailyStatuses[date] = entry
          }
        })
        
        // Count statuses
        const statusCounts = {
          available: 0,
          remote: 0,
          unavailable: 0,
          need_to_check: 0,
          absent: 0,
          holiday: 0
        }
        
        Object.values(dailyStatuses).forEach((entry: any) => {
          const status = entry.status || 'available'
          if (statusCounts.hasOwnProperty(status)) {
            statusCounts[status as keyof typeof statusCounts]++
          }
        })
        
        const total = Object.keys(dailyStatuses).length
        const availableCount = statusCounts.available + statusCounts.remote
        const availabilityRate = total > 0 ? Math.round((availableCount / total) * 100) : 0
        
        memberStatistics[member.id] = {
          ...statusCounts,
          total,
          availabilityRate
        }
      })
      
      setMemberStats(memberStatistics)
    } catch (error) {
      console.error('Error calculating member stats:', error)
    } finally {
      setMemberStatsLoading(false)
    }
  }
  
  const calculateMemberStats = (memberId: string) => {
    return memberStats[memberId] || {
      available: 0,
      remote: 0,
      unavailable: 0,
      need_to_check: 0,
      absent: 0,
      holiday: 0,
      total: 0,
      availabilityRate: 0
    }
  }

  // Get the current view period description (always shows the calendar's current period)
  const getCurrentViewPeriodDescription = () => {
    const getMondayOfWeek = (date: Date): Date => {
      const d = new Date(date)
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      return new Date(d.setDate(diff))
    }
    
    const startDate = getMondayOfWeek(currentDate)
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + weeksToShow * 7 - 1)
    
    return `${format(startDate, 'dd MMM', { locale: nl })} - ${format(endDate, 'dd MMM', { locale: nl })}`
  }

  // Get the selected period description (for analytics data display)
  const getPeriodDescription = () => {
    if (selectedPeriod === 'custom') {
      return `${format(customStartDate, 'dd MMM', { locale: nl })} - ${format(customEndDate, 'dd MMM', { locale: nl })}`
    }
    
    return getCurrentViewPeriodDescription()
  }

  // Get general status distribution for the entire team over the selected period
  const getGeneralStatusDistribution = () => {
    if (!analyticsData || !analyticsData.timeData) return {}
    
    const totalDays = analyticsData.timeData.length
    const statusTotals: Record<string, number> = {}
    
    analyticsData.timeData.forEach((item: any) => {
      Object.keys(item).forEach(key => {
        if (key !== 'date') {
          statusTotals[key] = (statusTotals[key] || 0) + (item[key] || 0)
        }
      })
    })
    
    // Calculate percentages
    const totalEntries = Object.values(statusTotals).reduce((sum, count) => sum + count, 0)
    const statusPercentages: Record<string, { count: number, percentage: number }> = {}
    
    Object.entries(statusTotals).forEach(([status, count]) => {
      if (count > 0) {
        statusPercentages[status] = {
          count,
          percentage: totalEntries > 0 ? Math.round((count / totalEntries) * 100) : 0
        }
      }
    })
    
    return statusPercentages
  }

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleShowAnalytics}
        className="rounded-lg bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 font-medium transition-all duration-200"
      >
        <BarChart3 className="h-4 w-4 mr-2 flex-shrink-0" />
        <span className="truncate hidden sm:inline">{t("analytics.title")}</span>
      </Button>

      {/* Analytics Dialog */}
      <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
        <DialogContent className="max-w-[95vw] sm:max-w-[85vw] lg:max-w-[1000px] bg-white dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-green-600" />
              {t("analytics.title")}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
              {t("analytics.description")} - {getPeriodDescription()}
            </DialogDescription>
            {/* View mode tabs */}
            <div className="mt-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'overview' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('overview')}
                  className={viewMode === 'overview' ? 'h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white' : 'h-8 text-xs'}
                >
                  {t('analytics.trend')}
                </Button>
                <Button
                  variant={viewMode === 'year' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('year')}
                  className={viewMode === 'year' ? 'h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white' : 'h-8 text-xs'}
                >
                  {t('analytics.yearly')}
                </Button>
              </div>
            </div>
            
            {/* Period Selector (only for overview) */}
            {viewMode === 'overview' && (
            <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3 mt-2">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="period" 
                      checked={selectedPeriod === 'current'} 
                      onChange={() => setSelectedPeriod('current')}
                      className="text-blue-600"
                    />
                    <span className="text-sm font-medium">{t("bulk.currentView")} ({getCurrentViewPeriodDescription()})</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="period" 
                      checked={selectedPeriod === 'custom'} 
                      onChange={() => setSelectedPeriod('custom')}
                      className="text-blue-600"
                    />
                    <span className="text-sm font-medium">{t("bulk.customPeriod")}</span>
                  </label>
                </div>
                
                {selectedPeriod === 'custom' && (
                  <div className="space-y-3 ml-6">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Quick selection:</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          const today = new Date()
                          const nextWeek = new Date(today)
                          nextWeek.setDate(today.getDate() + 7)
                          setCustomStartDate(today)
                          setCustomEndDate(nextWeek)
                        }}
                      >
                        This week
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          const today = new Date()
                          const nextMonth = new Date(today)
                          nextMonth.setMonth(today.getMonth() + 1)
                          setCustomStartDate(today)
                          setCustomEndDate(nextMonth)
                        }}
                      >
                        This month
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          const today = new Date()
                          const lastMonth = new Date(today)
                          lastMonth.setMonth(today.getMonth() - 1)
                          setCustomStartDate(lastMonth)
                          setCustomEndDate(today)
                        }}
                      >
                        Last month
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600 dark:text-gray-400">{t("bulk.fromDate")}</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {format(customStartDate, 'dd MMM yyyy', { locale: getDateFnsLocale() })}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={customStartDate}
                            onSelect={(date) => date && setCustomStartDate(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <span className="text-xs text-gray-400">{t("bulk.to")}</span>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600 dark:text-gray-400">{t("bulk.toDate")}</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {format(customEndDate, 'dd MMM yyyy', { locale: getDateFnsLocale() })}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={customEndDate}
                            onSelect={(date) => date && setCustomEndDate(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-2 mt-2">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                💡 {t("analytics.dataExplanation")}
              </p>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-1">
            {viewMode === 'year' && (
              <YearOverviewSection 
                members={members}
                teamId={teamId}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                availableYears={availableYears}
                yearLoading={yearLoading}
                yearStats={yearStats}
                weekendsAsWeekdays={weekendsAsWeekdays}
                t={t}
              />
            )}

            {viewMode === 'overview' && (
            <>
            {/* Summary Cards */}
            {analyticsData && analyticsData.timeData && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                {Object.entries(getStatusCounts()).map(([status, count]) => (
                  <div key={status} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 text-center">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center justify-center gap-1">
                      <span>{getStatusIcon(status)}</span>
                      <span className="truncate">{getStatusLabel(status)}</span>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{count}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {count === 1 ? t("analytics.person") : t("analytics.peopleCount")}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* General Team Status Distribution Bar Chart */}
            {analyticsData && analyticsData.timeData && analyticsData.timeData.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <BarChart3 className="h-3 w-3" />
                  <span className="truncate">{t("analytics.generalTeamStatus")} - {getPeriodDescription()}</span>
                </h4>
                <div className="space-y-3">
                  {['available', 'remote', 'unavailable', 'need_to_check', 'absent', 'holiday']
                    .filter(status => getGeneralStatusDistribution()[status])
                    .map(status => {
                      const data = getGeneralStatusDistribution()[status]
                      return (
                        <div key={status} className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{getStatusIcon(status)}</span>
                              <span className="text-gray-700 dark:text-gray-300 font-medium">
                                {getStatusLabel(status)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                              <span>{data.count} entries</span>
                              <span>({data.percentage}%)</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-500 ${getStatusColor(status)}`}
                              style={{ width: `${data.percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                  }
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {Object.values(getGeneralStatusDistribution()).reduce((sum, data) => sum + data.count, 0)} {t("analytics.totalEntriesCount")} • {members.length} {t("analytics.teamMembersCount")} • {analyticsData.timeData.length} {t("analytics.daysCount")}
                    </div>
                    <Button
                      variant={showPersonalCharts ? "default" : "outline"}
                      size="sm"
                      onClick={handleTogglePersonalCharts}
                      className={`h-7 text-xs ${showPersonalCharts ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                      title={showPersonalCharts ? t("analytics.hidePersonalChartsTooltip") : t("analytics.showPersonalChartsTooltip")}
                    >
                      {showPersonalCharts ? `📊 ${t("analytics.hidePersonalCharts")}` : `👤 ${t("analytics.showPersonalCharts")}`}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Chart */}
            {analyticsData && analyticsData.timeData && analyticsData.timeData.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <BarChart3 className="h-3 w-3" />
                  <span className="truncate">{t("analytics.uniqueMembers")} - {t("analytics.daily")}</span>
                </h4>
                <div className="space-y-2 max-h-48 sm:max-h-60 overflow-y-auto">
                  {analyticsData.timeData.map((item: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <div className="w-12 sm:w-16 text-gray-600 dark:text-gray-400 text-xs flex-shrink-0">
                        {formatDateLabel(item.date)}
                      </div>
                      <div className="flex-1 flex items-center gap-1 flex-wrap">
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

            {/* Info when personal charts are hidden */}
            {!showPersonalCharts && analyticsData && analyticsData.timeData && analyticsData.timeData.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
                  <span className="text-base">👤</span>
                  <span>{t("analytics.personalChartsHiddenInfo")}</span>
                </div>
              </div>
            )}

            {/* Interactive Personal Charts */}
            {showPersonalCharts && analyticsData && analyticsData.timeData && analyticsData.timeData.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <BarChart3 className="h-3 w-3" />
                  <span className="truncate">👤 {t("analytics.interactivePersonalCharts")} - {getPeriodDescription()}</span>
                </h4>
                
                {/* Member Selection Grid */}
                <div className="mb-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    📌 {t("analytics.clickMemberToView")}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {members.map(member => {
                      // Check if member has data
                      const hasData = analyticsData.memberData && analyticsData.memberData[member.id] && analyticsData.memberData[member.id].length > 0
                      const isSelected = selectedMemberForChart === member.id
                      
                      return (
                        <button
                          key={member.id}
                          onClick={() => handleMemberClick(member.id)}
                          className={cn(
                            "p-2 rounded-lg border-2 transition-all duration-200 text-center cursor-pointer hover:shadow-md",
                            isSelected 
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md" 
                              : hasData
                                ? "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 opacity-50 cursor-not-allowed",
                            !hasData && "pointer-events-none"
                          )}
                          disabled={!hasData}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <MemberAvatar
                              firstName={member.first_name}
                              lastName={member.last_name}
                              profileImage={member.profile_image}
                              size="sm"
                              locale={locale}
                            />
                            <div className="text-xs">
                              <p className={cn(
                                "font-medium truncate",
                                isSelected ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-300"
                              )}>
                                {member.first_name}
                              </p>
                              <p className={cn(
                                "text-xs",
                                hasData 
                                  ? isSelected 
                                    ? "text-blue-600 dark:text-blue-400" 
                                    : "text-gray-500 dark:text-gray-400"
                                  : "text-gray-400 dark:text-gray-600"
                              )}>
                                {hasData ? `📊 ${t("analytics.data")}` : `❌ ${t("analytics.noData")}`}
                              </p>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Selected Member Chart */}
                {selectedMemberForChart && (() => {
                  const member = members.find(m => m.id === selectedMemberForChart)
                  if (!member) return null

                  // Calculate member status counts for the selected period
                  const memberStatusCounts = {
                    available: 0,
                    remote: 0,
                    unavailable: 0,
                    need_to_check: 0,
                    absent: 0,
                    holiday: 0
                  }
                  
                  // Count statuses for this member in the analytics period
                  if (analyticsData.memberData && analyticsData.memberData[member.id]) {
                    analyticsData.memberData[member.id].forEach((entry: any) => {
                      const status = entry.status || 'available'
                      if (memberStatusCounts.hasOwnProperty(status)) {
                        memberStatusCounts[status as keyof typeof memberStatusCounts]++
                      }
                    })
                  }
                  
                  const totalDays = Object.values(memberStatusCounts).reduce((sum, count) => sum + count, 0)
                  const hasData = totalDays > 0

                  return (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-2 border-blue-200 dark:border-blue-700">
                      <div className="flex items-center gap-3 mb-4">
                        <MemberAvatar
                          firstName={member.first_name}
                          lastName={member.last_name}
                          profileImage={member.profile_image}
                          size="md"
                          locale={locale}
                        />
                        <div className="flex-1">
                          <h5 className="text-lg font-bold text-gray-900 dark:text-white">
                            {member.first_name} {member.last_name}
                          </h5>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {hasData ? `📊 ${totalDays} ${t("analytics.daysCount")} ${t("analytics.data")} ${t("analytics.periodLabel")} ${getPeriodDescription()}` : t("analytics.noDataForPeriod")}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedMemberForChart(null)}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          ✕
                        </Button>
                      </div>
                      
                      {hasData ? (
                        <div className="space-y-3">
                          {['available', 'remote', 'unavailable', 'need_to_check', 'absent', 'holiday']
                            .filter(status => memberStatusCounts[status as keyof typeof memberStatusCounts] > 0)
                            .map(status => {
                              const count = memberStatusCounts[status as keyof typeof memberStatusCounts]
                              const percentage = totalDays > 0 ? Math.round((count / totalDays) * 100) : 0
                              
                              return (
                                <div key={status} className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">{getStatusIcon(status)}</span>
                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {getStatusLabel(status)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                      <span className="font-semibold">{count} {count === 1 ? t("analytics.dayCount") : t("analytics.daysCount")}</span>
                                      <span className="text-xs">({percentage}%)</span>
                                    </div>
                                  </div>
                                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                    <div 
                                      className={`h-3 rounded-full transition-all duration-500 ${getStatusColor(status)}`}
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <div className="text-4xl mb-2">📭</div>
                          <p className="text-sm">{t("analytics.noDataForPeriod")}</p>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {!selectedMemberForChart && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">👆</div>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {t("analytics.selectMemberAbove")}
                    </p>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    👤 {members.filter(m => analyticsData.memberData && analyticsData.memberData[m.id]).length}/{members.length} {t("analytics.membersHaveData")} • 
                    {t("analytics.periodLabel")} {getPeriodDescription()} • {t("analytics.clickForDetails")}
                  </div>
                </div>
              </div>
            )}

            {/* Individual Member Statistics */}
            {memberStatsLoading ? (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Users className="h-3 w-3" />
                  {t("analytics.individualLevel")} - {t("analytics.memberStats")}
                </h4>
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t("common.loading")}</p>
                  </div>
                </div>
              </div>
            ) : memberStats && Object.keys(memberStats).length > 0 ? (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Users className="h-3 w-3" />
                  {t("analytics.individualLevel")} - {t("analytics.memberStats")}
                </h4>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-2 mb-3">
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    ℹ️ {t("analytics.memberStatsNote")}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {members.map(member => {
                    // Calculate member statistics from all data
                    const memberStatsData = calculateMemberStats(member.id)
                    
                    return (
                      <div key={member.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <MemberAvatar
                            firstName={member.first_name}
                            lastName={member.last_name}
                            profileImage={member.profile_image}
                            size="sm"
                            locale={locale}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {member.first_name} {member.last_name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {t("analytics.availabilityRate")}: {memberStatsData.availabilityRate}%
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                            <span className="truncate">{memberStatsData.available} {t("status.available")}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></div>
                            <span className="truncate">{memberStatsData.remote} {t("status.remote")}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                            <span className="truncate">{memberStatsData.unavailable} {t("status.unavailable")}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                            <span className="truncate">{memberStatsData.need_to_check} {t("status.need_to_check")}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-gray-500 rounded-full flex-shrink-0"></div>
                            <span className="truncate">{memberStatsData.absent} {t("status.absent")}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0"></div>
                            <span className="truncate">{memberStatsData.holiday} {t("status.holiday")}</span>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {t("analytics.totalDays")}: {memberStatsData.total}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
            </>
            )}
          </div>

          <DialogFooter className="pt-2">
            <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-2">
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center sm:text-left">
                {t("analytics.perPersonBasis")}
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowAnalytics(false)} 
                className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 h-8 text-xs w-full sm:w-auto"
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

// Year overview visual section
function YearOverviewSection({
  members,
  teamId,
  selectedYear,
  setSelectedYear,
  availableYears,
  yearLoading,
  yearStats,
  weekendsAsWeekdays,
  t
}: {
  members: Member[]
  teamId: string
  selectedYear: number
  setSelectedYear: (y: number) => void
  availableYears: number[]
  yearLoading: boolean
  yearStats: null | {
    workdays: number
    weekends: number
    teamTotals: Record<string, number>
    memberBreakdown: Record<string, {
      available: number
      remote: number
      unavailable: number
      need_to_check: number
      absent: number
      holiday: number
      unfilled: number
      workdays: number
    }>
  }
  weekendsAsWeekdays: boolean
  t: any
}) {
  // Hex colors aligned with Tailwind classes used for statuses (used in charts)
  const statusHex: Record<string, string> = {
    available: '#22c55e',      // green-500
    remote: '#a855f7',         // purple-500
    unavailable: '#ef4444',    // red-500
    need_to_check: '#3b82f6',  // blue-500
    absent: '#6b7280',         // gray-500
    holiday: '#f59e0b',        // amber/yellow-500
    unfilled: '#94a3b8',       // slate-400
    // Weekend shown as a separate category; use holiday color for non-work-days for consistency
    weekend: '#f59e0b',
  }
  const statusOrder: Array<'available'|'remote'|'unavailable'|'need_to_check'|'absent'|'holiday'|'unfilled'> = [
    'available','remote','unavailable','need_to_check','absent','holiday','unfilled'
  ]
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return t('status.available')
      case 'remote': return t('status.remote')
      case 'unavailable': return t('status.unavailable')
      case 'need_to_check': return t('status.need_to_check')
      case 'absent': return t('status.absent')
      case 'holiday': return t('status.holiday')
      case 'unfilled': return t('analytics.unfilled')
      default: return status
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
      case 'unfilled': return 'bg-slate-400'
      default: return 'bg-gray-400'
    }
  }

  return (
    <div className="space-y-3">
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{t('analytics.yearly')}</span>
            {!weekendsAsWeekdays ? (
              <span className="text-xs text-gray-600 dark:text-gray-400">{t('analytics.weekendsExcluded')}</span>
            ) : (
              <span className="text-xs text-gray-600 dark:text-gray-400">{t('analytics.treatWeekendsAsWeekdays')}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600 dark:text-gray-400">{t('analytics.selectYear')}</label>
            <select
              className="h-8 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {availableYears.length === 0 ? (
                <option value={selectedYear}>{selectedYear}</option>
              ) : (
                availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))
              )}
            </select>
          </div>
        </div>

        {yearStats && (
          <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
            <span className="mr-4">{t('analytics.workdays')}: <span className="font-semibold text-gray-900 dark:text-gray-200">{yearStats.workdays}</span></span>
            <span>{t('analytics.weekends')}: <span className="font-semibold text-gray-900 dark:text-gray-200">{yearStats.weekends}</span></span>
          </div>
        )}
      </div>

      {yearLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      )}

      {!yearLoading && yearStats && (
        <>
          {/* Team totals */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">{t('analytics.statusTotals')}</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
              {statusOrder.map(status => (
                <div key={status} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-center">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center justify-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
                    <span className="truncate">{getStatusLabel(status)}</span>
                  </div>
                  <div className="text-base font-bold text-gray-900 dark:text-white">{yearStats.teamTotals[status] || 0}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Per-member breakdown */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">{t('analytics.memberYearBreakdown')}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {members.map(m => {
                const b = yearStats.memberBreakdown[m.id]
                if (!b) return (
                  <div key={m.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 opacity-70">
                    <div className="text-sm text-gray-600 dark:text-gray-400">No data</div>
                  </div>
                )
                // Percentage should be over the entire year; when weekends are NOT treated as weekdays,
                // they are auto-counted as filled for percentage purposes.
                const yearTotalDays = (yearStats.workdays + yearStats.weekends)
                const filledWeekdays = b.workdays - b.unfilled
                const weekendCount = yearStats?.weekends || 0
                const filled = weekendsAsWeekdays ? filledWeekdays : (filledWeekdays + weekendCount)
                const notFilled = b.unfilled
                const fillPct = yearTotalDays > 0 ? Math.round((filled / yearTotalDays) * 100) : 0
                return (
                  <div key={m.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <MemberAvatar firstName={m.first_name} lastName={m.last_name} profileImage={m.profile_image} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{m.first_name} {m.last_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('analytics.workdays')}: {yearStats.workdays}{yearStats ? ` • ${t('analytics.weekends')}: ${yearStats.weekends}` : ''} • {t('analytics.unfilled')}: {b.unfilled} • {fillPct}% filled</p>
                      </div>
                    </div>
                    {/* Mini per-person bar chart: Filled vs Not filled vs Weekend */}
                    <div className="h-28 w-full">
                      <ChartContainer config={{}} className="aspect-auto h-full">
                        <RBarChart data={[
                          { name: t('analytics.filled') || 'Filled', count: Math.max(0, filled) },
                          { name: t('analytics.unfilled'), count: Math.max(0, notFilled) },
                          { name: t('analytics.weekends'), count: Math.max(0, weekendCount) },
                        ]} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={0} height={24} />
                          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={24} allowDecimals={false} />
                          <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
                          <Bar dataKey="count" radius={[4,4,0,0]}>
                            {[
                              statusHex.available, // Filled → treat as available color
                              statusHex.unfilled,  // Not filled
                              statusHex.weekend,   // Weekend
                            ].map((c, idx) => (
                              <Cell key={`cell-${idx}`} fill={c} />
                            ))}
                          </Bar>
                        </RBarChart>
                      </ChartContainer>
                    </div>
                    {/* Horizontal stacked 100% distribution over the year */}
                    {yearStats && (
                      <div className="mt-3">
                        {(() => {
                          const totalDays = (yearStats.workdays + yearStats.weekends) || 1
                          const cats = {
                            available: b.available || 0,
                            remote: b.remote || 0,
                            unavailable: b.unavailable || 0,
                            need_to_check: b.need_to_check || 0,
                            absent: b.absent || 0,
                            holiday: b.holiday || 0,
                            unfilled: b.unfilled || 0,
                          }
                          const usedDays = Object.values(cats).reduce((a, v) => a + v, 0)
                          const weekendResidual = Math.max(0, totalDays - usedDays)
                          const pct = (n: number) => (n / totalDays) * 100
                          const distData = [{
                            name: 'dist',
                            available: pct(cats.available),
                            remote: pct(cats.remote),
                            unavailable: pct(cats.unavailable),
                            need_to_check: pct(cats.need_to_check),
                            absent: pct(cats.absent),
                            holiday: pct(cats.holiday),
                            unfilled: pct(cats.unfilled),
                            weekend: pct(weekendResidual),
                          }]
                          const colorMap: Record<string, string> = statusHex
                          const order: Array<keyof typeof distData[0]> = ['available','remote','unavailable','need_to_check','absent','holiday','unfilled','weekend']
                          return (
                            <ChartContainer config={{}} className="aspect-auto h-6">
                              <RBarChart data={distData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                                <XAxis type="number" domain={[0, 100]} hide />
                                <YAxis type="category" dataKey="name" hide />
                                <ChartTooltip content={<ChartTooltipContent hideIndicator formatter={(value: any, name: any) => [`${(value as number).toFixed(1)}%`, name]} />} />
                                {order.map((key) => (
                                  <Bar key={String(key)} dataKey={String(key)} stackId="a" fill={colorMap[String(key)]} radius={[4,4,4,4]} />
                                ))}
                              </RBarChart>
                            </ChartContainer>
                          )
                        })()}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {statusOrder.map(status => (
                        <div key={status} className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
                          <span className="truncate">{(b as any)[status] || 0} {getStatusLabel(status)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function BulkUpdateDialog({ members, locale, onUpdate, onRangeSelectionChange }: BulkUpdateDialogProps) {
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
  const [existingAvailability, setExistingAvailability] = useState<Record<string, Record<string, string>>>({})
  
  // Enhanced date range state
  const [dateRange, setDateRange] = useState({
    from: new Date().toISOString().split('T')[0],
    to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  })
  const [useRangeMode, setUseRangeMode] = useState(false)
  
  const { t } = useTranslation(locale)
  const { toast } = useToast()

  // Ref to track previous range state to prevent unnecessary callbacks
  const prevRangeState = useRef<{
    useRangeMode: boolean
    from: string
    to: string
    open: boolean
  }>({
    useRangeMode: false,
    from: '',
    to: '',
    open: false
  })

  // Notify parent component of range selection changes for calendar visualization
  useEffect(() => {
    const currentState = {
      useRangeMode,
      from: dateRange.from,
      to: dateRange.to,
      open
    }
    
    // Only call callback if state actually changed
    if (onRangeSelectionChange && (
      currentState.useRangeMode !== prevRangeState.current.useRangeMode ||
      currentState.from !== prevRangeState.current.from ||
      currentState.to !== prevRangeState.current.to ||
      currentState.open !== prevRangeState.current.open
    )) {
      if (useRangeMode && dateRange.from && dateRange.to && open) {
        const startDate = new Date(dateRange.from)
        const endDate = new Date(dateRange.to)
        onRangeSelectionChange(startDate, endDate, true)
      } else {
        onRangeSelectionChange(undefined, undefined, false)
      }
      
      prevRangeState.current = currentState
    }
  }, [useRangeMode, dateRange.from, dateRange.to, open])

  // Reset form function
  const resetForm = () => {
    setSelectedMembers([])
    setSelectedDates([])
    setUseRangeMode(false)
    setDateRange({
      from: new Date().toISOString().split('T')[0],
      to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    })
  }

  // Date preset helper functions
  const getDatePresets = () => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    
    const thisWeekStart = new Date(today)
    thisWeekStart.setDate(today.getDate() - today.getDay() + 1) // Monday
    const thisWeekEnd = new Date(thisWeekStart)
    thisWeekEnd.setDate(thisWeekStart.getDate() + 6) // Sunday
    
    const nextWeekStart = new Date(thisWeekStart)
    nextWeekStart.setDate(thisWeekStart.getDate() + 7)
    const nextWeekEnd = new Date(nextWeekStart)
    nextWeekEnd.setDate(nextWeekStart.getDate() + 6)
    
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    return [
      {
        label: t("bulk.today"),
        from: today.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0],
        icon: "📅"
      },
      {
        label: t("bulk.tomorrow"), 
        from: tomorrow.toISOString().split('T')[0],
        to: tomorrow.toISOString().split('T')[0],
        icon: "📆"
      },
      {
        label: t("bulk.thisWeek"),
        from: thisWeekStart.toISOString().split('T')[0],
        to: thisWeekEnd.toISOString().split('T')[0],
        icon: "📋"
      },
      {
        label: t("bulk.nextWeek"),
        from: nextWeekStart.toISOString().split('T')[0], 
        to: nextWeekEnd.toISOString().split('T')[0],
        icon: "📊"
      },
      {
        label: t("bulk.thisMonth"),
        from: thisMonthStart.toISOString().split('T')[0],
        to: thisMonthEnd.toISOString().split('T')[0],
        icon: "🗓️"
      }
    ]
  }

  const applyDatePreset = (preset: { from: string, to: string }) => {
    setDateRange(preset)
    setUseRangeMode(true)
    // Convert to Date objects for selectedDates
    const dates = []
    let currentDate = new Date(preset.from)
    const endDate = new Date(preset.to)
    
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }
    setSelectedDates(dates)
  }

  const getDayCount = (from: string, to: string) => {
    const fromDate = new Date(from)
    const toDate = new Date(to)
    return Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }

  const formatDateRange = (from: string, to: string) => {
    const fromDate = new Date(from)
    const toDate = new Date(to)
    const dayCount = getDayCount(from, to)
    
    const dateLocale = locale === 'en' ? 'en-US' : locale === 'fr' ? 'fr-FR' : 'nl-NL'
    
    if (from === to) {
      return `${fromDate.toLocaleDateString(dateLocale)} (1 ${t("bulk.day")})`
    }
    return `${fromDate.toLocaleDateString(dateLocale)} - ${toDate.toLocaleDateString(dateLocale)} (${dayCount} ${t("bulk.days")})`
  }

  // Convert date range to Date array for Change Overview
  const getDateRangeArray = () => {
    if (!useRangeMode || new Date(dateRange.from) > new Date(dateRange.to)) {
      return []
    }
    
    const dates = []
    let currentDate = new Date(dateRange.from)
    const endDate = new Date(dateRange.to)
    
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }
    return dates
  }

  // Helper function to get the correct dates based on current mode
  const getEffectiveDates = () => {
    return useRangeMode ? getDateRangeArray() : selectedDates
  }

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

  // Fetch existing availability for selected members and dates
  const fetchExistingAvailability = async () => {
    if (selectedMembers.length === 0 || getEffectiveDates().length === 0) {
      setExistingAvailability({})
      return
    }

    try {
      const dateStrings = getEffectiveDates().map(date => date.toISOString().split('T')[0])
      
      const { data, error } = await supabase
        .from('availability')
        .select('member_id, date, status')
        .in('member_id', selectedMembers)
        .in('date', dateStrings)

      if (error) {
        console.error('Error fetching existing availability:', error)
        return
      }

      const existingData: Record<string, Record<string, string>> = {}
      selectedMembers.forEach(memberId => {
        existingData[memberId] = {}
        dateStrings.forEach(date => {
          existingData[memberId][date] = 'not_set' // Default value
        })
      })

      data?.forEach(item => {
        if (existingData[item.member_id]) {
          existingData[item.member_id][item.date] = item.status
        }
      })

      setExistingAvailability(existingData)
    } catch (error) {
      console.error('Error fetching existing availability:', error)
    }
  }

  // Fetch today's availability when dialog opens
  useEffect(() => {
    if (open) {
      fetchTodayAvailability()
    }
  }, [open])

  // Fetch date range availability when using range mode
  const fetchDateRangeAvailability = async () => {
    if (!useRangeMode || selectedMembers.length === 0 || !dateRange.from || !dateRange.to) {
      return
    }

    try {
      const dateStrings = getDateRangeArray().map(date => date.toISOString().split('T')[0])
      
      const { data, error } = await supabase
        .from('availability')
        .select('member_id, date, status')
        .in('member_id', selectedMembers)
        .in('date', dateStrings)

      if (error) {
        console.error('Error fetching date range availability:', error)
        return
      }

      const existingData: Record<string, Record<string, string>> = {}
      selectedMembers.forEach(memberId => {
        existingData[memberId] = {}
        dateStrings.forEach(date => {
          existingData[memberId][date] = 'not_set' // Default value
        })
      })

      data?.forEach(item => {
        if (existingData[item.member_id]) {
          existingData[item.member_id][item.date] = item.status
        }
      })

      setExistingAvailability(existingData)
    } catch (error) {
      console.error('Error fetching date range availability:', error)
    }
  }

  // Fetch existing availability when members or dates change
  useEffect(() => {
    if (open && (selectedMembers.length > 0 || getEffectiveDates().length > 0)) {
      fetchExistingAvailability()
    }
  }, [selectedMembers, selectedDates, useRangeMode, dateRange.from, dateRange.to, open])

  // Fetch date range availability when using range mode
  useEffect(() => {
    if (open && useRangeMode && selectedMembers.length > 0 && dateRange.from && dateRange.to) {
      fetchDateRangeAvailability()
    }
  }, [selectedMembers, dateRange.from, dateRange.to, useRangeMode, open])

  const statusOptions = [
    { value: "not_set", label: t("status.not_set"), icon: "⚪" },
    { value: "available", label: t("status.available"), icon: "🟢" },
    { value: "remote", label: t("status.remote"), icon: "🟣" },
    { value: "unavailable", label: t("status.unavailable"), icon: "🔴" },
    { value: "need_to_check", label: t("status.need_to_check"), icon: "🔵" },
    { value: "absent", label: t("status.absent"), icon: "⚫" },
    { value: "holiday", label: t("status.holiday"), icon: "🟡" },
  ]

  const handleMemberToggle = (memberId: string) => {
    // Don't allow toggling of hidden members
    const member = members.find(m => m.id === memberId)
    if (member?.is_hidden) return
    
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
  }

  const handleSelectAllMembers = () => {
    // Only select/deselect non-hidden members
    const visibleMembers = members.filter(m => !m.is_hidden)
    const selectedVisibleMembers = selectedMembers.filter(id => 
      !members.find(m => m.id === id)?.is_hidden
    )
    
    if (selectedVisibleMembers.length === visibleMembers.length) {
      // Deselect all visible members
      setSelectedMembers(prev => prev.filter(id => 
        members.find(m => m.id === id)?.is_hidden
      ))
    } else {
      // Select all visible members (keep hidden members as they were)
      const hiddenSelected = selectedMembers.filter(id => 
        members.find(m => m.id === id)?.is_hidden
      )
      setSelectedMembers([...hiddenSelected, ...visibleMembers.map(m => m.id)])
    }
  }

  const handleSmartDateSelection = () => {
    // Smart date selection: select next 5 workdays
    const dates = []
    let currentDate = new Date()
    let addedDays = 0
    
    while (addedDays < 5) {
      if (!isWeekend(currentDate)) {
        dates.push(new Date(currentDate))
        addedDays++
      }
      currentDate = addDays(currentDate, 1)
    }
    setSelectedDates(dates)
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

  const handleMonthSelect = (month: Date) => {
    const start = startOfMonth(month)
    const end = endOfMonth(month)
    const dates = []
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d))
    }
    setSelectedDates(dates)
  }

  const isWeekendDay = (date: Date) => {
    const day = date.getDay()
    return day === 0 || day === 6
  }

  const handleBulkUpdate = async () => {
    // Get the correct dates based on mode
    const datesToUpdate = useRangeMode ? getDateRangeArray() : selectedDates
    
    if (selectedMembers.length === 0 || datesToUpdate.length === 0) {
      toast({
        title: t("bulk.selectionRequired"),
        description: t("bulk.selectMembersAndDates"),
        variant: "destructive",
      })
      return
    }

    setIsUpdating(true)
    
    try {
      // Use the exact same date formatting as individual updates
      const dateStrings = datesToUpdate.map(date => {
        // Use local date formatting to avoid timezone offset issues
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      })
      
      console.log('🗓️ Bulk update starting:', {
        memberCount: selectedMembers.length,
        dateCount: datesToUpdate.length,
        mode: useRangeMode ? 'range' : 'individual',
        rangeFrom: useRangeMode ? dateRange.from : null,
        rangeTo: useRangeMode ? dateRange.to : null,
        status: selectedStatus,
        totalOperations: selectedMembers.length * dateStrings.length,
        datesRaw: datesToUpdate.map(d => d.toString()),
        dateStringsFormatted: dateStrings,
        dateRange: `${dateStrings[0]} to ${dateStrings[dateStrings.length - 1]}`
      })

      // Get current user for activity logging
      const { data: { user } } = await supabase.auth.getUser()
      
      // Find current user's member ID to track who made the change
      const currentUserMember = members.find(m => m.email === user?.email)
      const changedById = currentUserMember?.id || null

      // Create update data using same structure as individual updates
      const updateData = selectedMembers.flatMap(memberId =>
        dateStrings.map(date => ({
          member_id: memberId,
          date: date,
          status: selectedStatus,
          changed_by_id: changedById,
          auto_holiday: false  // Mark as manual bulk update, not auto-holiday
        }))
      )

      console.log('📝 Sample update data:', updateData.slice(0, 3))

      // Use the same upsert method as individual updates
      const { error: upsertError } = await supabase
        .from('availability')
        .upsert(updateData, {
          onConflict: 'member_id,date'
        })

      if (upsertError) {
        console.error('Bulk update error:', upsertError)
        toast({
          title: t("bulk.updateFailed"),
          description: `${t("common.error")}: ${upsertError.message}`,
          variant: "destructive",
        })
        return
      }

      // Log bulk activities (in background, don't block success)
      if (user?.email) {
        try {
          // Log each activity separately to track individual member changes
          const activityPromises = updateData.map(update => 
            fetch('/api/teams/activities', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                // teamId intentionally omitted here because not available in this scope
                memberId: update.member_id,
                activityDate: update.date,
                oldStatus: null, // Bulk updates don't track previous status
                newStatus: update.status,
                changedByEmail: user.email
              })
            })
          )

          // Run activity logging in background
          Promise.all(activityPromises).catch(error => 
            console.warn('Some bulk activity logs failed:', error)
          )
        } catch (activityError) {
          console.warn('Failed to log bulk activities:', activityError)
        }
      }

      console.log('✅ Bulk update completed successfully')

      // Verify the bulk update worked by checking a few records
      console.log('🔍 Verifying bulk update results...')
      const { data: verifyData, error: verifyError } = await supabase
        .from('availability')
        .select('*')
        .in('member_id', selectedMembers.slice(0, 2)) // Check first 2 members
        .in('date', dateStrings.slice(0, 3)) // Check first 3 dates
        .eq('status', selectedStatus)

      if (verifyError) {
        console.error('❌ Verification error:', verifyError)
      } else {
        const expectedRecords = Math.min(selectedMembers.length, 2) * Math.min(dateStrings.length, 3)
        console.log(`✅ Verification: Found ${verifyData?.length || 0}/${expectedRecords} expected records`)
        console.log('📊 Sample verified records:', verifyData?.slice(0, 3))
        
        if ((verifyData?.length || 0) < expectedRecords) {
          console.warn('⚠️ Some records may not have been updated correctly')
        } else {
          console.log('✅ All verified records have correct status')
        }
      }

      // Force multiple refreshes to ensure data is updated
      console.log('🔄 Triggering calendar refresh...')
      
      // Wait longer for database to process changes and clear any caching
      await new Promise(resolve => setTimeout(resolve, 1200))
      
      // Primary refresh
      console.log('🔄 Primary calendar refresh at', new Date().toISOString())
      onUpdate()
      
      // Additional refresh after short delay to ensure data propagation
      setTimeout(() => {
        console.log('🔄 Secondary calendar refresh at', new Date().toISOString())
        onUpdate()
      }, 1500)
      
      // Final refresh to be absolutely sure
      setTimeout(() => {
        console.log('🔄 Final calendar refresh at', new Date().toISOString())
        onUpdate()
      }, 3000)
      
      // Log helpful debugging information
      console.log('🎯 Bulk Update Summary:')
      console.log(`   📅 Dates updated: ${dateStrings.join(', ')}`)
      console.log(`   👥 Members: ${selectedMembers.length}`)
      console.log(`   📊 Status set to: ${selectedStatus}`)
      console.log(`   🔢 Total records: ${updateData.length}`)
      console.log('   ⏰ Multiple refreshes scheduled to ensure visibility')
      console.log('   🔗 Sample member IDs:', selectedMembers.slice(0, 3))
      console.log('   📊 First few update records:', updateData.slice(0, 3))
      
      // Additional diagnostic: Check if we're updating the right date range
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      const isUpdatingFutureDates = dateStrings.some(date => date >= todayStr)
      console.log(`   ⏰ Updating future dates: ${isUpdatingFutureDates ? 'Yes' : 'No (past dates)'}`)
      console.log(`   📅 Today: ${todayStr}, Updated dates: ${dateStrings.join(', ')}`)
      
      // Check if dates fall within typical calendar view (current week +/- 4 weeks)
      const currentWeekStart = new Date()
      currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1) // Monday
      const viewRangeStart = new Date(currentWeekStart)
      viewRangeStart.setDate(viewRangeStart.getDate() - 28) // 4 weeks before
      const viewRangeEnd = new Date(currentWeekStart)
      viewRangeEnd.setDate(viewRangeEnd.getDate() + 56) // 8 weeks after
      
      const datesInView = dateStrings.filter(dateStr => {
        const date = new Date(dateStr + 'T12:00:00') // Add noon time to avoid timezone issues
        return date >= viewRangeStart && date <= viewRangeEnd
      })
      
      // Format view range using local dates
      const formatLocalDate = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
      
      console.log(`   📊 Typical calendar view range: ${formatLocalDate(viewRangeStart)} to ${formatLocalDate(viewRangeEnd)}`)
      console.log(`   ✅ Dates likely visible in calendar: ${datesInView.length}/${dateStrings.length} (${datesInView.join(', ')})`)
      
      if (datesInView.length < dateStrings.length) {
        const datesOutOfView = dateStrings.filter(d => !datesInView.includes(d))
        console.log(`   ⚠️ Dates that may not be visible: ${datesOutOfView.join(', ')}`)
        console.log(`   💡 To see these dates, navigate to the correct week/month in the calendar`)
      }
      
      // Show success toast with visibility warning if needed
      const warningMessage = datesInView.length < dateStrings.length 
        ? ` ⚠️ Some dates may not be visible in current calendar view - navigate to October 2025 to see all updates.`
        : ' Navigate to the correct date range if needed.'
      
      toast({
        title: t("bulk.bulkUpdateSuccessful"),
        description: `Successfully updated ${updateData.length} availability records for ${selectedMembers.length} ${selectedMembers.length === 1 ? t("bulk.member") : t("bulk.members")} across ${datesToUpdate.length} ${datesToUpdate.length === 1 ? t("bulk.date") : t("bulk.dates")}. Calendar will refresh automatically.${warningMessage}`,
        variant: "default",
        duration: 10000,
      })
      
      console.log('📊 Updated records should now be visible in calendar')
      console.log('🔍 If records are not visible, check:')
      console.log('   1. Calendar date range includes the updated dates')
      console.log('   2. Team view shows the correct members')
      console.log('   3. Browser refresh may be needed in some cases')
      
      // Final fallback: suggest navigation to correct month after 5 seconds if needed
      setTimeout(() => {
        console.log('⚠️ If updates are still not visible, consider refreshing the page manually')
        
        // Check if updates were in future months that need navigation
        const hasOctoberDates = dateStrings.some(dateStr => {
          const dateParts = dateStr.split('-')
          const year = parseInt(dateParts[0])
          const month = parseInt(dateParts[1])
          return month === 10 && year === 2025 // October 2025
        })
        
        if (hasOctoberDates) {
          toast({
            title: t("bulk.navigateToOctober"),
            description: t("bulk.navigateToOctoberDescription"),
            variant: "default",
            duration: 8000,
          })
        } else {
          toast({
            title: t("bulk.updatesNotVisible"),
            description: t("bulk.updatesNotVisibleDescription"),
            variant: "default",
            duration: 6000,
          })
        }
      }, 5000)
      
      // Reset form
      setOpen(false)
      resetForm()
      
    } catch (error) {
      console.error("Bulk update error:", error)
      toast({
        title: t("bulk.unexpectedError"),
        description: `${t("common.error")}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return t("status.available")
      case 'remote': return t("status.remote")
      case 'unavailable': return t("status.unavailable")
      case 'need_to_check': return t("status.need_to_check")
      case 'absent': return t("status.absent")
      case 'holiday': return t("status.holiday")
      case 'not_set': return t("status.not_set")
      default: return status
    }
  }

  return (
    <>
      {/* Bulk Update Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="rounded-md bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 font-medium transition-all duration-200 px-2 py-1.5 h-8"
          >
            <Users className="h-4 w-4 mr-1 flex-shrink-0" />
            <span className="truncate hidden sm:inline">{t("bulk.title")}</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              {t("bulk.title")}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {t("bulk.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Member Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium">{t("bulk.selectMembers")}</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllMembers}
                  className="h-8 text-xs"
                >
                  {selectedMembers.filter(id => !members.find(m => m.id === id)?.is_hidden).length === members.filter(m => !m.is_hidden).length 
                    ? t("bulk.deselectAll") 
                    : t("bulk.selectAll")
                  }
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto border rounded-lg p-3">
                {members.map(member => (
                  <div
                    key={member.id}
                    className={cn(
                      "flex items-center space-x-3 p-2 rounded-lg border transition-all",
                      member.is_hidden 
                        ? "cursor-not-allowed opacity-60 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600" 
                        : "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800",
                      !member.is_hidden && selectedMembers.includes(member.id) 
                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700" 
                        : !member.is_hidden 
                        ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                        : ""
                    )}
                    onClick={() => !member.is_hidden && handleMemberToggle(member.id)}
                  >
                    <Checkbox 
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => !member.is_hidden && handleMemberToggle(member.id)}
                      disabled={member.is_hidden}
                      className="pointer-events-none flex-shrink-0"
                    />
                    <MemberAvatar 
                      firstName={member.first_name}
                      lastName={member.last_name}
                      profileImage={member.profile_image}
                      size="sm"
                      locale={locale}
                      className={cn(
                        "flex-shrink-0",
                        member.is_hidden && "opacity-50"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        member.is_hidden 
                          ? "text-gray-400 dark:text-gray-500 line-through" 
                          : "text-gray-900 dark:text-white"
                      )}>
                        {member.first_name} {member.last_name}
                        {member.is_hidden && (
                          <span className="ml-2 text-xs text-gray-400">(Hidden)</span>
                        )}
                      </p>
                      {todayAvailability[member.id] && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {t("bulk.today")}: {getStatusLabel(todayAvailability[member.id])}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Selection */}
            <div>
              <Label className="text-sm font-medium mb-3 block flex items-center gap-2">
                📅 {t("bulk.selectDates")}
                {useRangeMode && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    {t("bulk.rangeMode")} ✓
                  </span>
                )}
              </Label>
              
              {/* Enhanced Quick Date Selection */}
              <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <Label className="text-sm font-medium text-blue-800">⚡ Snelle Datum Selectie</Label>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                  {getDatePresets().map((preset, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => applyDatePreset(preset)}
                      className="h-9 text-xs bg-white hover:bg-blue-50 border-blue-300 hover:border-blue-400 justify-start"
                    >
                      <span className="mr-1">{preset.icon}</span>
                      {preset.label}
                    </Button>
                  ))}
                </div>
                
                {/* Range Mode Toggle */}
                <div className="flex items-center justify-between mb-2 p-2 bg-white/50 rounded border" title={t("bulk.rangeModeTooltip")}>
                  <div className="flex flex-col">
                    <Label className="text-xs font-medium text-gray-700">🎯 {t("bulk.rangeMode")}</Label>
                    <span className="text-xs text-gray-500">{t("bulk.rangeModeTooltip")}</span>
                  </div>
                  <Checkbox
                    checked={useRangeMode}
                    onCheckedChange={(checked) => setUseRangeMode(!!checked)}
                    className="h-4 w-4"
                  />
                </div>

                {/* Date Range Inputs (when range mode is enabled) */}
                {useRangeMode && (
                  <div className="bg-white p-3 rounded border border-green-200 mb-3">
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div>
                        <Label className="text-xs text-green-600 mb-1 block">📅 {t("bulk.fromDate")}</Label>
                        <input
                          type="date"
                          value={dateRange.from}
                          onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                          className="w-full text-xs border border-green-300 rounded px-2 py-1 focus:border-green-500 focus:ring-1 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-green-600 mb-1 block">📅 {t("bulk.toDate")}</Label>
                        <input
                          type="date"
                          value={dateRange.to}
                          onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                          min={dateRange.from}
                          className="w-full text-xs border border-green-300 rounded px-2 py-1 focus:border-green-500 focus:ring-1 focus:ring-green-500"
                        />
                      </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-blue-700 font-medium">🗓️ {t("bulk.period")} </span>
                          <span className="text-blue-800">{formatDateRange(dateRange.from, dateRange.to)}</span>
                        </div>
                        {dateRange.from && dateRange.to && (
                          <div className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                            {getDateRangeArray().length} {t("bulk.dates")}
                          </div>
                        )}
                      </div>
                    </div>


                  </div>
                )}

                {/* Legacy Quick Actions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSmartDateSelection}
                    className="h-8 text-xs bg-blue-50 hover:bg-blue-100 border-blue-200"
                  >
                    <Bolt className="h-3 w-3 mr-1" />
                    Smart Select
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleWeekdaysSelect(1)}
                    className="h-8 text-xs"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {t("bulk.thisWeek")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleWeekdaysSelect(2)}
                    className="h-8 text-xs"
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    {t("bulk.next2Weeks")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedDates([])
                      setUseRangeMode(false)
                    }}
                    className="h-8 text-xs text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                  >
                    <Target className="h-3 w-3 mr-1" />
                    {t("bulk.clearAll")}
                  </Button>
                </div>
              </div>

              {/* Calendar */}
              <div className="border rounded-lg p-3">
                <div className="mb-3">
                  <Label className="text-xs text-gray-600 dark:text-gray-400 mb-2 block">
                    {t("bulk.calendarTip")}
                  </Label>
                </div>
                <Calendar
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={(dates) => setSelectedDates(dates || [])}
                  className="rounded-md [&_thead]:hidden [&_.rdp-head_row]:hidden [&_.rdp-head_cell]:hidden"
                  locale={nl}
                  showOutsideDays={false}
                  modifiers={{
                    weekend: (date) => isWeekendDay(date),
                    weekday: (date) => !isWeekendDay(date),
                    selected: selectedDates
                  }}
                  modifiersStyles={{
                    weekend: { 
                      backgroundColor: '#fef2f2', 
                      color: '#dc2626',
                      fontWeight: 'bold'
                    },
                    weekday: { 
                      backgroundColor: '#f0fdf4', 
                      color: '#166534',
                      fontWeight: 'bold'
                    },
                    selected: {
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      fontWeight: 'bold'
                    }
                  }}
                  onMonthChange={(month) => {
                    // Optional: auto-select month when navigating
                  }}
                />
                <div className="mt-2 mb-3 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleMonthSelect(new Date())}
                    className="text-xs"
                  >
                    {t("bulk.thisMonth")}
                  </Button>
                </div>
                <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-50 border border-green-200 rounded"></div>
                    <span>Weekdays (green)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div>
                    <span>Weekends (red)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>Selected days</span>
                  </div>
                </div>
              </div>

              {/* Selected Dates Display */}
              {selectedDates.length > 0 && (
                <div className="mt-3">
                  <Label className="text-xs text-gray-600 dark:text-gray-400">
                    {t("bulk.selectedDates")} ({selectedDates.length})
                  </Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedDates.slice(0, 10).map(date => (
                      <Badge key={date.toISOString()} variant="secondary" className="text-xs">
                        {format(date, 'dd MMM', { locale: nl })}
                      </Badge>
                    ))}
                    {selectedDates.length > 10 && (
                      <Badge variant="secondary" className="text-xs">
                        +{selectedDates.length - 10} {t("bulk.more")}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

              {/* Status Selection */}
            <div>
              <Label className="text-sm font-medium mb-3 block">{t("bulk.selectStatus")}</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {statusOptions.filter(option => option.value !== 'not_set').map(option => (
                  <Button
                    key={option.value}
                    variant={selectedStatus === option.value ? 'default' : 'outline'}
                    onClick={() => setSelectedStatus(option.value as any)}
                    className={cn(
                      "h-auto p-3 flex items-center gap-3 justify-start transition-all",
                      selectedStatus === option.value 
                        ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600" 
                        : "bg-white hover:bg-gray-50 border-gray-300 text-gray-700"
                    )}
                  >
                    <span className="text-lg flex-shrink-0">{option.icon}</span>
                    <div className="text-left">
                      <div className="font-medium text-sm">{option.label}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Quick Preview when selections are made */}
            {selectedMembers.length > 0 && selectedDates.length > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-200 flex-wrap">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">{t("bulk.readyToUpdate")}</span>
                  <span>{selectedMembers.length} {selectedMembers.length === 1 ? t("bulk.member") : t("bulk.members")}</span>
                  <span>×</span>
                  <span>{getEffectiveDates().length} {getEffectiveDates().length === 1 ? t("bulk.date") : t("bulk.dates")}</span>
                  <span className="text-gray-600">to</span>
                  <div className="flex items-center gap-1 bg-white rounded px-2 py-1">
                    <span>{statusOptions.find(s => s.value === selectedStatus)?.icon}</span>
                    <span className="font-medium text-gray-900">{statusOptions.find(s => s.value === selectedStatus)?.label}</span>
                  </div>
                  <span>=</span>
                  <span className="font-bold">{selectedMembers.length * getEffectiveDates().length} updates</span>
                </div>
              </div>
            )}

            {/* Changes Preview */}
            {selectedMembers.length > 0 && getEffectiveDates().length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-3 flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  {t("bulk.comprehensiveOverview")}
                  {useRangeMode && (
                    <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full ml-2">
                      📅 Range Mode
                    </span>
                  )}
                </h4>
                <div className="max-h-64 overflow-y-auto space-y-3">
                  {selectedMembers.map(memberId => {
                    const member = members.find(m => m.id === memberId)
                    if (!member) return null
                    
                    // Calculate statistics for this member
                    const dates = getEffectiveDates()
                    const totalDates = dates.length
                    const notSetCount = dates.filter(date => {
                      const dateStr = date.toISOString().split('T')[0]
                      const oldStatus = existingAvailability[memberId]?.[dateStr] || 'not_set'
                      return oldStatus === 'not_set'
                    }).length
                    const noChangeCount = dates.filter(date => {
                      const dateStr = date.toISOString().split('T')[0]
                      const oldStatus = existingAvailability[memberId]?.[dateStr] || 'not_set'
                      return oldStatus === selectedStatus
                    }).length
                    const willChangeCount = totalDates - noChangeCount
                    
                    return (
                      <div key={memberId} className="border-b border-yellow-200 dark:border-yellow-700 pb-3 last:border-b-0">
                        <div className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2 flex items-center justify-between">
                          <span>{member.first_name} {member.last_name}</span>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
                              {notSetCount} {t("bulk.notSetBefore")}
                            </span>
                            <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                              {noChangeCount} {t("bulk.noChanges")}
                            </span>
                            <span className="bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 px-2 py-1 rounded">
                              {willChangeCount} {t("bulk.willChange")}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1 text-xs">
                          {dates.map(date => {
                            const dateStr = date.toISOString().split('T')[0]
                            const oldStatus = existingAvailability[memberId]?.[dateStr] || 'not_set'
                            const newStatus = selectedStatus
                            const oldStatusData = statusOptions.find(s => s.value === oldStatus) || 
                              { value: 'not_set', label: t("status.not_set"), icon: '⚪' }
                            const newStatusData = statusOptions.find(s => s.value === newStatus)!
                            const isWeekend = isWeekendDay(date)
                            const willChange = oldStatus !== selectedStatus
                            const wasNotSet = oldStatus === 'not_set'
                            
                            return (
                              <div key={dateStr} className={cn(
                                "flex flex-col items-center gap-1 rounded p-1 border text-center",
                                isWeekend 
                                  ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700"
                                  : wasNotSet
                                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700"
                                  : willChange
                                  ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700"
                                  : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600"
                              )}>
                                <span className={cn(
                                  "text-xs font-medium",
                                  isWeekend ? "text-red-700 dark:text-red-300" 
                                  : wasNotSet ? "text-blue-700 dark:text-blue-300"
                                  : willChange ? "text-orange-700 dark:text-orange-300" 
                                  : "text-gray-700 dark:text-gray-300"
                                )}>
                                  {date.toLocaleDateString(locale === 'en' ? 'en-US' : locale === 'fr' ? 'fr-FR' : 'nl-NL', { day: '2-digit', month: '2-digit' })}
                                  {isWeekend && <span className="text-red-500"> 🏖️</span>}
                                </span>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs">{oldStatusData.icon}</span>
                                  <span className="text-gray-400 text-xs">→</span>
                                  <span className="text-xs">{newStatusData.icon}</span>
                                </div>
                                {wasNotSet && <div className="w-2 h-1 bg-blue-400 rounded-full"></div>}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Comprehensive overview now replaces both previous sections */}

            {/* Debug Information */}
            {selectedMembers.length > 0 && selectedDates.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <span>🔍</span>
                  Debug Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <div>
                    <strong>Selected Dates:</strong> {selectedDates.length > 0 ? selectedDates.sort((a, b) => a.getTime() - b.getTime()).map(d => {
                      // Use local date formatting to avoid timezone issues
                      const year = d.getFullYear()
                      const month = String(d.getMonth() + 1).padStart(2, '0')
                      const day = String(d.getDate()).padStart(2, '0')
                      return `${year}-${month}-${day}`
                    }).join(', ') : 'None'}
                  </div>
                  <div>
                    <strong>Status:</strong> {statusOptions.find(s => s.value === selectedStatus)?.label}
                  </div>
                  <div>
                    <strong>Members:</strong> {selectedMembers.length} selected
                  </div>
                  <div>
                    <strong>Total Operations:</strong> {selectedMembers.length * selectedDates.length}
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  💡 This information will help with troubleshooting if updates don't appear in the calendar
                </div>
                <div className="mt-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 p-2 rounded border">
                  <strong>📍 Visibility Note:</strong> Updates will only be visible in the calendar if the selected dates fall within the currently displayed time period. 
                  {selectedDates.length > 0 && (() => {
                    // Check if selected dates are in October 2025
                    const hasOctoberDates = selectedDates.some(date => 
                      date.getMonth() === 9 && date.getFullYear() === 2025 // October = month 9
                    )
                    const currentMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
                    
                    if (hasOctoberDates) {
                      return (
                        <div className="mt-1">
                          <strong>🗓️ Current period:</strong> {currentMonth} | <strong>Selected dates in:</strong> October 2025<br/>
                          <strong>⚠️ Action needed:</strong> Navigate to October 2025 in the calendar to see your updates!
                        </div>
                      )
                    }
                    return null
                  })()}
                  <div className="mt-1">
                    If you don't see your updates, navigate to the correct week/month in the calendar or extend the view to more weeks.
                  </div>
                </div>
              </div>
            )}

            {/* Summary */}
            {selectedMembers.length > 0 && selectedDates.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  {t("bulk.summary")}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-blue-700 dark:text-blue-300 font-medium">
                      {selectedMembers.length} {selectedMembers.length === 1 ? t("bulk.member") : t("bulk.members")}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-700 dark:text-blue-300 font-medium">
                      {selectedDates.length} {selectedDates.length === 1 ? t("bulk.date") : t("bulk.dates")}
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
                  {t("bulk.totalUpdates")}: {selectedMembers.length * selectedDates.length}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false)
                  resetForm()
                }}
                disabled={isUpdating}
                className="w-full sm:w-auto"
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleBulkUpdate}
                disabled={selectedMembers.length === 0 || getEffectiveDates().length === 0 || isUpdating}
                className="w-full sm:w-auto"
              >
                {isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    {t("bulk.updating")}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t("bulk.apply")}
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Export PlannerButton component
export function PlannerButton({ members, locale, teamId }: { members: Member[], locale: Locale, teamId: string }) {
  const [showPlanner, setShowPlanner] = useState(false)
  const [plannerData, setPlannerData] = useState<any>(null)
  const [plannerPeriod, setPlannerPeriod] = useState<7 | 14 | 30>(7)
  const [isLoading, setIsLoading] = useState(false)
  const { t } = useTranslation(locale)

  // Get date-fns locale based on current locale
  const getDateFnsLocale = () => {
    switch (locale) {
      case 'nl': return nl
      case 'fr': return fr
      default: return enUS
    }
  }

  const fetchPlannerData = async () => {
    setIsLoading(true)
    try {
      // Start from tomorrow instead of today for better planning insight
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const endDate = new Date(tomorrow.getTime() + plannerPeriod * 24 * 60 * 60 * 1000)
      
      const { data, error } = await supabase
        .from('availability')
        .select(`
          date,
          status,
          member_id,
          members!inner(first_name, last_name, team_id)
        `)
        .gte('date', tomorrow.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .eq('members.team_id', teamId) // Filter by team_id
        .order('date', { ascending: true })

      if (error) throw error

      // Process data to calculate daily scores
      const dailyScores = processPlannerData(data || [])
      setPlannerData(dailyScores)
    } catch (error) {
      console.error('Planner fetch error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const processPlannerData = (data: any[]) => {
    const dailyStats: Record<string, { 
      available: number, 
      remote: number, 
      unavailable: number, 
      total: number,
      membersByStatus: {
        available: any[],
        remote: any[],
        unavailable: any[]
      }
    }> = {}
    
    // Group by date and collect member details
    data.forEach(item => {
      const date = item.date
      if (!dailyStats[date]) {
        dailyStats[date] = { 
          available: 0, 
          remote: 0, 
          unavailable: 0, 
          total: 0,
          membersByStatus: {
            available: [],
            remote: [],
            unavailable: []
          }
        }
      }
      
      const memberInfo = {
        id: item.member_id,
        firstName: item.members?.first_name || '',
        lastName: item.members?.last_name || '',
        status: item.status
      }
      
      if (item.status === 'available') {
        dailyStats[date].available++
        dailyStats[date].membersByStatus.available.push(memberInfo)
      } else if (item.status === 'remote') {
        dailyStats[date].remote++
        dailyStats[date].membersByStatus.remote.push(memberInfo)
      } else {
        dailyStats[date].unavailable++
        dailyStats[date].membersByStatus.unavailable.push(memberInfo)
      }
      dailyStats[date].total++
    })

    // Calculate scores and sort by best days
    const scoredDays = Object.entries(dailyStats).map(([date, stats]) => {
      const availableScore = (stats.available / (stats.total || 1)) * 100
      const remoteScore = (stats.remote / (stats.total || 1)) * 50 // Remote counts as 50% of available
      const totalScore = availableScore + remoteScore
      
      return {
        date,
        ...stats,
        score: Math.min(totalScore, 100),
        availableMembers: stats.available,
        remoteMembers: stats.remote,
        unavailableMembers: stats.unavailable,
        totalMembers: stats.total,
        membersByStatus: stats.membersByStatus
      }
    }).sort((a, b) => b.score - a.score)

    return scoredDays
  }

  // Surface colors (background + border) tuned for both light and dark themes
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
    if (score >= 60) return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
    if (score >= 40) return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700'
    return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
  }

  // Text colors for badges (keep container text controlled by existing utility classes)
  const getScoreTextColor = (score: number) => {
    if (score >= 80) return 'text-green-700 dark:text-green-300'
    if (score >= 60) return 'text-yellow-700 dark:text-yellow-300'
    if (score >= 40) return 'text-orange-700 dark:text-orange-300'
    return 'text-red-700 dark:text-red-300'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return t("planner.excellent")
    if (score >= 60) return t("planner.good")
    if (score >= 40) return t("planner.fair")
    return t("planner.poor")
  }

  useEffect(() => {
    if (showPlanner) {
      fetchPlannerData()
    }
  }, [showPlanner, plannerPeriod])

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setShowPlanner(true)}
        className="rounded-lg bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 font-medium transition-all duration-200"
      >
        <TrendingUp className="h-4 w-4 mr-2 flex-shrink-0" />
        <span className="truncate hidden sm:inline">{t("planner.title")}</span>
      </Button>

      {/* Planner Dialog */}
      <Dialog open={showPlanner} onOpenChange={setShowPlanner}>
        <DialogContent className="max-w-[95vw] sm:max-w-[85vw] lg:max-w-[1000px] bg-white dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="truncate">{t("planner.title")}</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
              {t("planner.description")}
            </DialogDescription>
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-2 mt-2">
              <p className="text-xs text-purple-800 dark:text-purple-200">
                💡 {t("planner.explanation")}
              </p>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Period Selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <Label className="text-sm font-medium text-gray-900 dark:text-white">Period:</Label>
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-md p-0.5 w-full sm:w-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPlannerPeriod(7)}
                  className={cn(
                    "h-7 px-2 text-xs rounded-sm flex-1 sm:flex-none",
                    plannerPeriod === 7 
                      ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" 
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  <span className="truncate">{t("planner.next7Days")}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPlannerPeriod(14)}
                  className={cn(
                    "h-7 px-2 text-xs rounded-sm flex-1 sm:flex-none",
                    plannerPeriod === 14 
                      ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" 
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  <span className="truncate">{t("planner.next14Days")}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPlannerPeriod(30)}
                  className={cn(
                    "h-7 px-2 text-xs rounded-sm flex-1 sm:flex-none",
                    plannerPeriod === 30 
                      ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" 
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  <span className="truncate">{t("planner.next30Days")}</span>
                </Button>
              </div>
            </div>

            {/* Planner Results */}
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">{t("planner.loading")}</p>
                </div>
              </div>
            ) : plannerData && plannerData.length > 0 ? (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  {t("planner.bestDays")}
                </h4>
                <div className="space-y-3 max-h-80 sm:max-h-96 overflow-y-auto">
                  {plannerData.slice(0, 10).map((day: any, index: number) => (
                    <div key={day.date} className={`p-3 sm:p-4 rounded-lg border-2 ${getScoreColor(day.score)} transition-all hover:shadow-md`}>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                        <div className="flex items-center gap-3">
                          <div className="text-xl sm:text-2xl">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📅'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                              {format(new Date(day.date), 'EEEE, dd MMMM yyyy', { locale: getDateFnsLocale() })}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                              {t("planner.score")}: {Math.round(day.score)}%
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={`${getScoreColor(day.score)} ${getScoreTextColor(day.score)}`} variant="secondary">
                            {getScoreLabel(day.score)}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-sm mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                          <span className="truncate">{day.availableMembers} {t("planner.available")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-purple-500 rounded-full flex-shrink-0"></div>
                          <span className="truncate">{day.remoteMembers} {t("planner.remote")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gray-500 rounded-full flex-shrink-0"></div>
                          <span className="truncate">{day.unavailableMembers} {t("planner.unavailable")}</span>
                        </div>
                      </div>
                      
                      {/* Team Members by Status */}
                      <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        {/* Available Members */}
                        {day.membersByStatus.available.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                              <span className="text-xs font-medium text-green-700 dark:text-green-300">
                                {t("planner.availableMembers")}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {day.membersByStatus.available.map((member: any) => (
                                <Badge key={member.id} variant="secondary" className="text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700">
                                  <span className="truncate">{member.firstName} {member.lastName}</span>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Remote Members */}
                        {day.membersByStatus.remote.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></div>
                              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                                {t("planner.remoteMembers")}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {day.membersByStatus.remote.map((member: any) => (
                                <Badge key={member.id} variant="secondary" className="text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700">
                                  <span className="truncate">{member.firstName} {member.lastName}</span>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Unavailable Members */}
                        {day.membersByStatus.unavailable.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 bg-gray-500 rounded-full flex-shrink-0"></div>
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                {t("planner.unavailableMembers")}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {day.membersByStatus.unavailable.map((member: any) => (
                                <Badge key={member.id} variant="secondary" className="text-xs bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600">
                                  <span className="truncate">{member.firstName} {member.lastName}</span>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {t("planner.noData")}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button 
              variant="outline" 
              onClick={() => setShowPlanner(false)} 
              className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 h-8 text-xs w-full sm:w-auto"
            >
              ✕ {t("analytics.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
