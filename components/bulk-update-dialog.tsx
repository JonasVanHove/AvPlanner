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
import { CalendarIcon, Users, Clock, CheckCircle, Calendar as CalendarDays, Zap, Bolt, Target, Filter, Play, BarChart3, TrendingUp, Calendar as CalendarIcon2 } from "lucide-react"
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

  // Check for personal charts preference
  useEffect(() => {
    const savedShowPersonalCharts = localStorage.getItem("showPersonalCharts") === "true"
    setShowPersonalCharts(savedShowPersonalCharts)
  }, [])

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
      fetchAnalyticsData()
      fetchMemberStats()
    }
  }, [showAnalytics, weeksToShow, currentDate, selectedPeriod, customStartDate, customEndDate])

  const handleShowAnalytics = () => {
    setShowAnalytics(true)
    if (!analyticsData) {
      fetchAnalyticsData()
    }
    if (Object.keys(memberStats).length === 0) {
      fetchMemberStats()
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
            
            {/* Period Selector */}
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
                    <span className="text-sm font-medium">Current view ({getCurrentViewPeriodDescription()})</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="period" 
                      checked={selectedPeriod === 'custom'} 
                      onChange={() => setSelectedPeriod('custom')}
                      className="text-blue-600"
                    />
                    <span className="text-sm font-medium">Custom period</span>
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
                      <label className="text-xs text-gray-600 dark:text-gray-400">From:</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {format(customStartDate, 'dd MMM yyyy', { locale: nl })}
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
                    <span className="text-xs text-gray-400">to</span>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600 dark:text-gray-400">To:</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {format(customEndDate, 'dd MMM yyyy', { locale: nl })}
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

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-2 mt-2">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                💡 {t("analytics.dataExplanation")}
              </p>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-1">
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
  const [existingAvailability, setExistingAvailability] = useState<Record<string, Record<string, string>>>({})
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

  // Fetch existing availability for selected members and dates
  const fetchExistingAvailability = async () => {
    if (selectedMembers.length === 0 || selectedDates.length === 0) {
      setExistingAvailability({})
      return
    }

    try {
      const dateStrings = selectedDates.map(date => date.toISOString().split('T')[0])
      
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

  // Fetch existing availability when members or dates change
  useEffect(() => {
    if (open && (selectedMembers.length > 0 || selectedDates.length > 0)) {
      fetchExistingAvailability()
    }
  }, [selectedMembers, selectedDates, open])

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
    if (selectedMembers.length === 0 || selectedDates.length === 0) {
      alert(t("bulk.selectMembersAndDates"))
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
      alert(t("bulk.updateSuccess"))
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
                  {selectedMembers.length === members.length 
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
                      className="pointer-events-none flex-shrink-0"
                    />
                    <MemberAvatar 
                      firstName={member.first_name}
                      lastName={member.last_name}
                      profileImage={member.profile_image}
                      size="sm"
                      className="flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {member.first_name} {member.last_name}
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
              <Label className="text-sm font-medium mb-3 block">{t("bulk.selectDates")}</Label>
              
              {/* Quick Date Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDateRangeSelect(7)}
                  className="h-8 text-xs"
                >
                  <CalendarDays className="h-3 w-3 mr-1" />
                  <span className="truncate">{t("bulk.next7Days")}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleWeekdaysSelect(1)}
                  className="h-8 text-xs"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  <span className="truncate">{t("bulk.thisWeek")}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleWeekdaysSelect(2)}
                  className="h-8 text-xs"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  <span className="truncate">{t("bulk.next2Weeks")}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDates([])}
                  className="h-8 text-xs"
                >
                  <Target className="h-3 w-3 mr-1" />
                  <span className="truncate">{t("bulk.clearDates")}</span>
                </Button>
              </div>

              {/* Calendar */}
              <div className="border rounded-lg p-3">
                <div className="mb-3">
                  <Label className="text-xs text-gray-600 dark:text-gray-400 mb-2 block">
                    💡 Tip: Klik op een maandnaam om de hele maand te selecteren
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
                    Hele maand selecteren
                  </Button>
                </div>
                <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-50 border border-green-200 rounded"></div>
                    <span>{t("bulk.weekdaysGreen")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div>
                    <span>{t("bulk.weekendsRed")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>{t("bulk.selectedDays")}</span>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {statusOptions.filter(option => option.value !== 'not_set').map(option => (
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
                    <div className="text-lg flex-shrink-0">{option.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {option.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Changes Preview */}
            {selectedMembers.length > 0 && selectedDates.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-3 flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  Wijzigingen overzicht
                </h4>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {selectedMembers.map(memberId => {
                    const member = members.find(m => m.id === memberId)
                    if (!member) return null
                    
                    return (
                      <div key={memberId} className="border-b border-yellow-200 dark:border-yellow-700 pb-2 last:border-b-0">
                        <div className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                          {member.first_name} {member.last_name}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                          {selectedDates.filter(date => !isWeekendDay(date)).map(date => {
                            const dateStr = date.toISOString().split('T')[0]
                            const oldStatus = existingAvailability[memberId]?.[dateStr] || 'not_set'
                            const newStatus = selectedStatus
                            const oldStatusData = statusOptions.find(s => s.value === oldStatus) || 
                              { value: 'not_set', label: t("status.not_set"), icon: '⚪' }
                            const newStatusData = statusOptions.find(s => s.value === newStatus)!
                            
                            return (
                              <div key={dateStr} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded px-2 py-1 border">
                                <span className="text-gray-700 dark:text-gray-300">
                                  {date.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' })}
                                </span>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs">{oldStatusData.icon}</span>
                                    <span className="text-xs text-gray-600 dark:text-gray-400">
                                      {oldStatusData.label}
                                    </span>
                                  </div>
                                  <span className="text-gray-400">→</span>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs">{newStatusData.icon}</span>
                                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                      {newStatusData.label}
                                    </span>
                                  </div>
                                </div>
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
                onClick={() => setOpen(false)}
                disabled={isUpdating}
                className="w-full sm:w-auto"
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleBulkUpdate}
                disabled={selectedMembers.length === 0 || selectedDates.length === 0 || isUpdating}
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
                    {t("bulk.update")}
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    if (score >= 40) return 'text-orange-600 bg-orange-50 border-orange-200'
    return 'text-red-600 bg-red-50 border-red-200'
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
                              {format(new Date(day.date), 'EEEE, dd MMMM yyyy', { locale: nl })}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                              {t("planner.score")}: {Math.round(day.score)}%
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getScoreColor(day.score)} variant="secondary">
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
