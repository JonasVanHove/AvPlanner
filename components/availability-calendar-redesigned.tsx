"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Edit3,
  Lock,
  Mail,
  MessageSquare,
  BarChart3,
  Users,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { supabase } from "@/lib/supabase"
import { useTranslation, type Locale } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { MemberForm } from "./member-form"
import { BulkUpdateDialog, AnalyticsButton, PlannerButton } from "./bulk-update-dialog"
import { SettingsDropdown } from "./settings-dropdown"
import { MemberAvatar } from "./member-avatar"
import { EditModePasswordDialog } from "./edit-mode-password-dialog"

interface Member {
  id: string
  first_name: string
  last_name: string
  email?: string
  profile_image?: string
}

interface Availability {
  member_id: string
  date: string
  status: "available" | "unavailable" | "need_to_check" | "absent" | "holiday" | "remote"
}

interface Team {
  id: string
  name: string
  slug?: string
  invite_code: string
  is_password_protected: boolean
}

interface AvailabilityCalendarProps {
  teamId: string
  teamName: string
  team?: Team
  members: Member[]
  locale: Locale
  onMembersUpdate: () => void
  isPasswordProtected?: boolean
  passwordHash?: string
  userEmail?: string
}

const AvailabilityCalendarRedesigned = ({
  teamId,
  teamName,
  team,
  members,
  locale,
  onMembersUpdate,
  isPasswordProtected,
  passwordHash,
  userEmail,
}: AvailabilityCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [availability, setAvailability] = useState<Availability[]>([])
  const [viewMode, setViewMode] = useState<"week">("week")
  const [weeksToShow, setWeeksToShow] = useState<1 | 2 | 4 | 8>(1)
  const [isLoading, setIsLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [simplifiedMode, setSimplifiedMode] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [isPasswordVerified, setIsPasswordVerified] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)
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

  // Get localized day names
  const getDayNames = () => [
    t("day.monday"),
    t("day.tuesday"),
    t("day.wednesday"),
    t("day.thursday"),
    t("day.friday"),
    t("day.saturday"),
    t("day.sunday"),
  ]

  const dutchMonthNames = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEC"]

  const getStatusConfig = (status: string) => {
    if (simplifiedMode) {
      // Simplified mode: only green and red
      if (status === "available" || status === "remote") {
        return {
          icon: "🟢",
          color: "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700/50",
          label: t("status.available"),
          textColor: "text-green-700 dark:text-green-300",
        }
      } else {
        return {
          icon: "🔴",
          color: "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700/50",
          label: t("status.unavailable"),
          textColor: "text-red-700 dark:text-red-300",
        }
      }
    } else {
      // Full mode: all status types
      const statusConfig = {
        available: {
          icon: "🟢",
          color: "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700/50",
          label: t("status.available"),
          textColor: "text-green-700 dark:text-green-300",
        },
        remote: {
          icon: "🟣",
          color: "bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-700/50",
          label: t("status.remote"),
          textColor: "text-purple-700 dark:text-purple-300",
        },
        unavailable: {
          icon: "🔴",
          color: "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700/50",
          label: t("status.unavailable"),
          textColor: "text-red-700 dark:text-red-300",
        },
        need_to_check: {
          icon: "🔵",
          color: "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700/50",
          label: t("status.need_to_check"),
          textColor: "text-blue-700 dark:text-blue-300",
        },
        absent: {
          icon: "⚫",
          color: "bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-700/50",
          label: t("status.absent"),
          textColor: "text-gray-700 dark:text-gray-300",
        },
        holiday: {
          icon: "🟡",
          color: "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700/50",
          label: t("status.holiday"),
          textColor: "text-yellow-700 dark:text-yellow-300",
        },
      }
      return statusConfig[status as keyof typeof statusConfig] || statusConfig.need_to_check
    }
  }

  // For dropdowns, always show real status icons and labels
  const getRealStatusConfig = (status: string) => {
    const statusConfig = {
      available: {
        icon: "🟢",
        color: "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700/50",
        label: t("status.available"),
        textColor: "text-green-700 dark:text-green-300",
      },
      remote: {
        icon: "🟣",
        color: "bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-700/50",
        label: t("status.remote"),
        textColor: "text-purple-700 dark:text-purple-300",
      },
      unavailable: {
        icon: "🔴",
        color: "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700/50",
        label: t("status.unavailable"),
        textColor: "text-red-700 dark:text-red-300",
      },
      need_to_check: {
        icon: "🔵",
        color: "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700/50",
        label: t("status.need_to_check"),
        textColor: "text-blue-700 dark:text-blue-300",
      },
      absent: {
        icon: "⚫",
        color: "bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-700/50",
        label: t("status.absent"),
        textColor: "text-gray-700 dark:text-gray-300",
      },
      holiday: {
        icon: "🟡",
        color: "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700/50",
        label: t("status.holiday"),
        textColor: "text-yellow-700 dark:text-yellow-300",
      },
    }
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.need_to_check
  }

  // Helper function to get ISO week number
  const getISOWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  }

  // Helper function to get Monday of the week
  const getMondayOfWeek = (date: Date): Date => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
  }

  // Calculate the maximum name width needed
  const getMaxNameWidth = () => {
    if (members.length === 0) return "200px"

    const maxNameLength = Math.max(...members.map((member) => `${member.first_name} ${member.last_name}`.length))
    const baseWidth = 180
    const charWidth = 8
    const iconSpace = 60

    return `${Math.max(baseWidth, maxNameLength * charWidth + iconSpace)}px`
  }

  useEffect(() => {
    fetchAvailability()
  }, [currentDate, members, weeksToShow])

  const fetchAvailability = async () => {
    if (members.length === 0) return

    setIsLoading(true)
    try {
      const startDate = getMondayOfWeek(currentDate)
      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + weeksToShow * 7 - 1)

      const { data, error } = await supabase
        .from("availability")
        .select("*")
        .in(
          "member_id",
          members.map((m) => m.id),
        )
        .gte("date", startDate.toISOString().split("T")[0])
        .lte("date", endDate.toISOString().split("T")[0])

      if (error) throw error
      setAvailability(data || [])
    } catch (error) {
      console.error("Error fetching availability:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditModeToggle = (checked: boolean) => {
    if (checked) {
      // Switching to edit mode - check password if team is password protected
      if (isPasswordProtected && !isPasswordVerified) {
        setShowPasswordDialog(true)
      } else {
        setEditMode(true)
      }
    } else {
      // Switching to view mode - no password needed
      setEditMode(false)
    }
  }

  const handlePasswordSubmit = async (password: string) => {
    if (!passwordHash) return
    
    setIsPasswordLoading(true)
    setPasswordError("")
    
    try {
      // Decode the Base64 password hash and compare with entered password
      const decodedPassword = atob(passwordHash)
      
      if (password === decodedPassword) {
        handlePasswordVerified()
      } else {
        setPasswordError("Incorrect password")
      }
    } catch (error) {
      console.error('Error verifying password:', error)
      setPasswordError("An error occurred while verifying the password")
    } finally {
      setIsPasswordLoading(false)
    }
  }

  const handlePasswordVerified = () => {
    setIsPasswordVerified(true)
    setShowPasswordDialog(false)
    setPasswordError("")
    setEditMode(true)
  }

  const updateAvailability = async (
    memberId: string,
    date: string,
    status: "available" | "unavailable" | "need_to_check" | "absent" | "holiday" | "remote",
  ) => {
    if (!editMode) return

    try {
      console.log('Updating availability:', { memberId, date, status })
      const { error } = await supabase.from("availability").upsert([{ member_id: memberId, date, status }], {
        onConflict: "member_id,date",
      })

      if (error) {
        console.error('Supabase error details:', error)
        throw error
      }
      console.log('Availability updated successfully')
      fetchAvailability()
    } catch (error) {
      console.error("Error updating availability:", error)
      alert("Er is een fout opgetreden bij het bijwerken van de beschikbaarheid.")
    }
  }

  const deleteMember = async (memberId: string) => {
    if (!editMode) return

    if (!confirm("Weet je zeker dat je dit teamlid wilt verwijderen?")) return

    try {
      const { error } = await supabase.from("members").delete().eq("id", memberId)
      if (error) throw error
      onMembersUpdate()
    } catch (error) {
      console.error("Error deleting member:", error)
      alert("Er is een fout opgetreden bij het verwijderen van het teamlid.")
    }
  }

  const moveMemberUp = async (memberId: string) => {
    if (!editMode || !userEmail) {
      console.error('Cannot move member:', { editMode, userEmail })
      alert("Je moet ingelogd zijn en in edit mode om leden te verplaatsen.")
      return
    }

    try {
      console.log('Moving member up:', { teamId, memberId, userEmail })
      
      // Debug: show current member info
      const member = members.find(m => m.id === memberId)
      console.log('Member to move:', member)
      
      const { data, error } = await supabase.rpc('move_member_up', {
        team_id_param: teamId,
        member_id_param: memberId,
        user_email: userEmail
      })
      
      console.log('Move member up result:', { data, error })
      
      if (error) {
        console.error('Supabase RPC error:', error)
        // Check if it's a function not found error
        if (error.code === '42883') {
          alert("De database functie 'move_member_up' bestaat niet. Voer eerst de migration script uit.")
          return
        }
        throw error
      }
      
      console.log('Member moved up successfully')
      onMembersUpdate()
    } catch (error: any) {
      console.error("Error moving member up:", error)
      alert(`Er is een fout opgetreden bij het verplaatsen van het teamlid: ${error?.message || error}`)
    }
  }

  const moveMemberDown = async (memberId: string) => {
    if (!editMode || !userEmail) {
      console.error('Cannot move member:', { editMode, userEmail })
      alert("Je moet ingelogd zijn en in edit mode om leden te verplaatsen.")
      return
    }

    try {
      console.log('Moving member down:', { teamId, memberId, userEmail })
      
      // Debug: show current member info
      const member = members.find(m => m.id === memberId)
      console.log('Member to move:', member)
      
      const { data, error } = await supabase.rpc('move_member_down', {
        team_id_param: teamId,
        member_id_param: memberId,
        user_email: userEmail
      })
      
      console.log('Move member down result:', { data, error })
      
      if (error) {
        console.error('Supabase RPC error:', error)
        // Check if it's a function not found error
        if (error.code === '42883') {
          alert("De database functie 'move_member_down' bestaat niet. Voer eerst de migration script uit.")
          return
        }
        throw error
      }
      
      console.log('Member moved down successfully')
      onMembersUpdate()
    } catch (error: any) {
      console.error("Error moving member down:", error)
      alert(`Er is een fout opgetreden bij het verplaatsen van het teamlid: ${error?.message || error}`)
    }
  }

  const getAvailabilityForDate = (memberId: string, date: Date) => {
    const dateString = date.toISOString().split("T")[0]
    return availability.find((a) => a.member_id === memberId && a.date === dateString)
  }

  const getTodayAvailability = (memberId: string) => {
    const today = new Date()
    return getAvailabilityForDate(memberId, today)
  }

  // Get availability for the current week being viewed (prefer today if in range, otherwise first workday)
  const getCurrentWeekAvailability = (memberId: string, weekDays: Date[]) => {
    const today = new Date()
    
    // Check if today is within the current week view
    const todayInCurrentWeek = weekDays.some(day => 
      day.getDate() === today.getDate() &&
      day.getMonth() === today.getMonth() &&
      day.getFullYear() === today.getFullYear()
    )
    
    if (todayInCurrentWeek) {
      return getAvailabilityForDate(memberId, today)
    }
    
    // Find the first workday in the current week
    const firstWorkday = weekDays.find(day => !isWeekend(day))
    if (firstWorkday) {
      return getAvailabilityForDate(memberId, firstWorkday)
    }
    
    // Fallback to first day if no workdays found
    return getAvailabilityForDate(memberId, weekDays[0])
  }

  const isWeekend = (date: Date) => {
    const day = date.getDay()
    return day === 0 || day === 6
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const navigateDate = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      newDate.setDate(prev.getDate() + (direction === "next" ? weeksToShow * 7 : -weeksToShow * 7))
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Calculate availability score for a member in a specific week
  const calculateMemberWeeklyScore = (member: Member, weekDays: Date[]) => {
    const workdays = weekDays.filter(day => !isWeekend(day))
    const availableStatuses = ['available', 'remote']
    
    let availableDays = 0
    let totalDays = 0

    workdays.forEach(day => {
      const availability = getAvailabilityForDate(member.id, day)
      totalDays++
      if (availability && availableStatuses.includes(availability.status)) {
        availableDays++
      } else if (!availability) {
        // No status set, assume available for calculation
        availableDays++
      }
    })

    return totalDays > 0 ? Math.round((availableDays / totalDays) * 100) : 0
  }

  // Calculate team availability score for a specific week
  const calculateTeamWeeklyScore = (weekDays: Date[]) => {
    if (members.length === 0) return 0
    
    const memberScores = members.map(member => calculateMemberWeeklyScore(member, weekDays))
    const averageScore = memberScores.reduce((sum, score) => sum + score, 0) / memberScores.length
    
    return Math.round(averageScore)
  }

  // Get availability stats for a member in a specific week
  const getMemberWeeklyStats = (member: Member, weekDays: Date[]) => {
    const workdays = weekDays.filter(day => !isWeekend(day))
    const stats = {
      available: 0,
      remote: 0,
      unavailable: 0,
      need_to_check: 0,
      absent: 0,
      holiday: 0,
      unset: 0
    }

    workdays.forEach(day => {
      const availability = getAvailabilityForDate(member.id, day)
      if (availability) {
        stats[availability.status]++
      } else {
        stats.unset++
      }
    })

    return stats
  }

  const getMultipleWeeksDays = () => {
    const startDate = getMondayOfWeek(currentDate)
    const weeks = []

    for (let weekOffset = 0; weekOffset < weeksToShow; weekOffset++) {
      const weekStart = new Date(startDate)
      weekStart.setDate(startDate.getDate() + weekOffset * 7)

      const days = []
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart)
        date.setDate(weekStart.getDate() + i)
        days.push(date)
      }

      weeks.push({
        weekNumber: getISOWeekNumber(weekStart),
        days,
      })
    }

    return weeks
  }

  const formatDateRange = () => {
    const weeks = getMultipleWeeksDays()
    const firstWeek = weeks[0]
    const lastWeek = weeks[weeks.length - 1]

    const start = firstWeek.days[0]
    const end = lastWeek.days[6]

    if (weeksToShow === 1) {
      const weekNumber = firstWeek.weekNumber
      const startMonth = dutchMonthNames[start.getMonth()].toLowerCase()
      const endMonth = dutchMonthNames[end.getMonth()].toLowerCase()

      if (start.getMonth() === end.getMonth()) {
        return `Week ${weekNumber} - ${startMonth.charAt(0).toUpperCase() + startMonth.slice(1)} ${start.getDate()} - ${end.getDate()}`
      } else {
        return `Week ${weekNumber} - ${startMonth.charAt(0).toUpperCase() + startMonth.slice(1)} ${start.getDate()} - ${endMonth.charAt(0).toUpperCase() + endMonth.slice(1)} ${end.getDate()}`
      }
    } else {
      const startMonth = dutchMonthNames[start.getMonth()].toLowerCase()
      const endMonth = dutchMonthNames[end.getMonth()].toLowerCase()

      if (start.getMonth() === end.getMonth()) {
        return `Week ${firstWeek.weekNumber}-${lastWeek.weekNumber} - ${startMonth.charAt(0).toUpperCase() + startMonth.slice(1)} ${start.getDate()} - ${end.getDate()}`
      } else {
        return `Week ${firstWeek.weekNumber}-${lastWeek.weekNumber} - ${startMonth.charAt(0).toUpperCase() + startMonth.slice(1)} ${start.getDate()} - ${endMonth.charAt(0).toUpperCase() + endMonth.slice(1)} ${end.getDate()}`
      }
    }
  }

  const renderMultiWeekView = () => {
    const weeks = getMultipleWeeksDays()
    const nameColumnWidth = getMaxNameWidth()

    return (
      <div className="space-y-4 sm:space-y-6">
        {weeks.map((week, weekIndex) => (
          <div
            key={weekIndex}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
          >
            {/* Week Header - More subtle */}
            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 sm:p-4 border-b border-gray-200 dark:border-gray-600">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Week {week.weekNumber}</h3>
                  
                  {/* Availability Score Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/30"
                      >
                        <BarChart3 className="h-4 w-4" />
                        <span className="font-medium">{calculateTeamWeeklyScore(week.days)}%</span>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="start" 
                      className="w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg"
                    >
                      <div className="p-4 space-y-4">
                        {/* Team Score Header */}
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-600">
                          <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="font-semibold text-gray-900 dark:text-white">Team Availability</span>
                          <span className="ml-auto text-lg font-bold text-blue-600 dark:text-blue-400">
                            {calculateTeamWeeklyScore(week.days)}%
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <Progress 
                            value={calculateTeamWeeklyScore(week.days)} 
                            className="h-2"
                          />
                          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>0%</span>
                            <span>100%</span>
                          </div>
                        </div>

                        {/* Individual Member Stats */}
                        <div className="space-y-3">
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Member Breakdown:
                          </div>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {members.map(member => {
                              const memberScore = calculateMemberWeeklyScore(member, week.days)
                              const memberStats = getMemberWeeklyStats(member, week.days)
                              
                              return (
                                <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <MemberAvatar
                                      firstName={member.first_name}
                                      lastName={member.last_name}
                                      profileImage={member.profile_image}
                                      size="sm"
                                      statusIndicator={{
                                        show: true,
                                        status: getTodayAvailability(member.id)?.status
                                      }}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {member.first_name} {member.last_name}
                                      </div>
                                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                        {memberStats.available > 0 && (
                                          <span className="flex items-center gap-1">
                                            🟢 {memberStats.available}
                                          </span>
                                        )}
                                        {memberStats.remote > 0 && (
                                          <span className="flex items-center gap-1">
                                            🟣 {memberStats.remote}
                                          </span>
                                        )}
                                        {memberStats.unavailable > 0 && (
                                          <span className="flex items-center gap-1">
                                            🔴 {memberStats.unavailable}
                                          </span>
                                        )}
                                        {memberStats.need_to_check > 0 && (
                                          <span className="flex items-center gap-1">
                                            🔵 {memberStats.need_to_check}
                                          </span>
                                        )}
                                        {memberStats.absent > 0 && (
                                          <span className="flex items-center gap-1">
                                            ⚫ {memberStats.absent}
                                          </span>
                                        )}
                                        {memberStats.holiday > 0 && (
                                          <span className="flex items-center gap-1">
                                            🟡 {memberStats.holiday}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-right">
                                      <div className={cn(
                                        "text-sm font-bold",
                                        memberScore >= 80 ? "text-green-600 dark:text-green-400" :
                                        memberScore >= 60 ? "text-yellow-600 dark:text-yellow-400" :
                                        "text-red-600 dark:text-red-400"
                                      )}>
                                        {memberScore}%
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                  {dutchMonthNames[week.days[0].getMonth()]} {week.days[0].getDate()} -{" "}
                  {dutchMonthNames[week.days[6].getMonth()]} {week.days[6].getDate()}
                </div>
              </div>
            </div>

            {/* Responsive Table Container */}
            <div className="overflow-x-auto">
              <div className="min-w-full">
                {/* Day Headers - More subtle */}
                <div
                  className="grid bg-gray-50/50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-600"
                  style={{
                    gridTemplateColumns: `${nameColumnWidth} repeat(7, minmax(100px, 1fr))`,
                  }}
                >
                  <div className="p-3 border-r border-gray-200 dark:border-gray-600">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Team</span>
                  </div>
                  {week.days.map((date, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-3 text-center border-r border-gray-200 dark:border-gray-600 last:border-r-0",
                        isToday(date) && "bg-blue-50 dark:bg-blue-900/20",
                      )}
                    >
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {getDayNames()[index]}
                      </div>
                      <div
                        className={cn(
                          "text-lg font-semibold mt-1",
                          isToday(date) ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-white",
                        )}
                      >
                        {date.getDate()}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Member Rows - More subtle styling */}
                {members.map((member, memberIndex) => (
                  <div
                    key={member.id}
                    className={cn(
                      "grid border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors",
                      memberIndex % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50/30 dark:bg-gray-700/20",
                    )}
                    style={{
                      gridTemplateColumns: `${nameColumnWidth} repeat(7, minmax(100px, 1fr))`,
                    }}
                  >
                    <div className="p-3 border-r border-gray-200 dark:border-gray-600 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex-shrink-0">
                          <MemberAvatar
                            firstName={member.first_name}
                            lastName={member.last_name}
                            profileImage={member.profile_image}
                            size="md"
                            className="ring-1 ring-gray-200 dark:ring-gray-600"
                            statusIndicator={{
                              show: true,
                              status: getTodayAvailability(member.id)?.status
                            }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {member.first_name} {member.last_name}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {member.email && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a
                                    href={`mailto:${member.email}`}
                                    className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Mail className="h-3 w-3" />
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Email: {member.email}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {member.email && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a
                                    href={`https://teams.microsoft.com/l/chat/0/0?users=${member.email}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-purple-500 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MessageSquare className="h-3 w-3" />
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Chat in Microsoft Teams</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      </div>
                      {editMode && (
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-600"
                                onClick={() => moveMemberUp(member.id)}
                                disabled={memberIndex === 0}
                              >
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Omhoog verplaatsen</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-600"
                                onClick={() => moveMemberDown(member.id)}
                                disabled={memberIndex === members.length - 1}
                              >
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Omlaag verplaatsen</p>
                            </TooltipContent>
                          </Tooltip>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 flex-shrink-0"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                            >
                              <MemberForm
                                teamId={teamId}
                                locale={locale}
                                onMemberAdded={onMembersUpdate}
                                member={member}
                                mode="edit"
                              />
                              <DropdownMenuItem
                                onClick={() => deleteMember(member.id)}
                                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                Verwijderen
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                    {week.days.map((date, dayIndex) => {
                      const availability = getAvailabilityForDate(member.id, date)
                      const isWeekendDay = isWeekend(date)
                      const isTodayCell = isToday(date)

                      return (
                        <div
                          key={dayIndex}
                          className={cn(
                            "p-3 border-r border-gray-200 dark:border-gray-600 last:border-r-0",
                            isTodayCell && "bg-blue-50/50 dark:bg-blue-900/10",
                          )}
                        >
                          {isWeekendDay ? (
                            <div className="h-10 flex items-center justify-center text-gray-400">
                              <span className="text-lg opacity-50">×</span>
                            </div>
                          ) : (
                            <div className="h-10 flex items-center gap-1">
                              <button
                                className={cn(
                                  "flex-1 h-full rounded-lg text-sm font-medium transition-all duration-200 border",
                                  editMode && "hover:shadow-sm",
                                  !editMode && "cursor-default",
                                  availability
                                    ? getStatusConfig(availability.status).color
                                    : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600",
                                  editMode && !availability && "hover:bg-gray-100 dark:hover:bg-gray-600",
                                )}
                                onClick={() => {
                                  if (!editMode) return
                                  const current = availability
                                  const statuses: Availability["status"][] = [
                                    "available",
                                    "remote",
                                    "unavailable",
                                    "need_to_check",
                                    "absent",
                                    "holiday",
                                  ]
                                  const currentIndex = current ? statuses.indexOf(current.status) : -1
                                  const nextStatus = statuses[(currentIndex + 1) % statuses.length]
                                  updateAvailability(member.id, date.toISOString().split("T")[0], nextStatus)
                                }}
                              >
                                {availability ? getStatusConfig(availability.status).icon : ""}
                              </button>
                              {editMode && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-6 p-0 rounded-md flex-shrink-0 hover:bg-gray-100 dark:hover:bg-gray-600"
                                    >
                                      <ChevronDown className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                                  >
                                  {["available", "remote", "unavailable", "need_to_check", "absent", "holiday"].map((status) => {
                                    const config = getRealStatusConfig(status) // Use real config for dropdown
                                    return (
                                    <DropdownMenuItem
                                      key={status}
                                      onClick={() => {
                                        if (editMode) {
                                          updateAvailability(
                                            member.id,
                                            date.toISOString().split("T")[0],
                                            status as Availability["status"],
                                          )
                                        }
                                      }}
                                      className={cn(
                                        "hover:bg-gray-50 dark:hover:bg-gray-700",
                                        availability?.status === status && "bg-gray-50 dark:bg-gray-700",
                                      )}
                                      disabled={!editMode}
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className="text-lg">{config.icon}</span>
                                        <span className="font-medium">{config.label}</span>
                                      </div>                                      </DropdownMenuItem>
                                    )
                                  })}
                                </DropdownMenuContent>
                              </DropdownMenu>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header - Optimized and Beautiful */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 border-b border-blue-500/20 dark:border-gray-700 shadow-lg">
          <div className="px-4 sm:px-6 py-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/20">
                  <img src="/favicon.svg" alt="Availability Planner" className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl font-bold text-white truncate">Availability Planner</h1>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm sm:text-base font-medium text-blue-100 dark:text-gray-300 truncate">{teamName}</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm border border-white/20 flex-shrink-0">
                      {members.length} {members.length === 1 ? 'member' : 'members'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                {/* Week selector - Optimized */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 w-full sm:w-auto">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {weeksToShow === 1 ? t("calendar.1week") : 
                         weeksToShow === 2 ? t("calendar.2weeks") : 
                         weeksToShow === 4 ? t("calendar.4weeks") : 
                         t("calendar.8weeks")}
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <DropdownMenuItem onClick={() => setWeeksToShow(1)}>
                      {t("calendar.1week")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setWeeksToShow(2)}>
                      {t("calendar.2weeks")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setWeeksToShow(4)}>
                      {t("calendar.4weeks")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setWeeksToShow(8)}>
                      {t("calendar.8weeks")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Analytics and Planner Buttons - Optimized */}
                <div className="flex items-center gap-1 w-full sm:w-auto">
                  <AnalyticsButton 
                    members={members} 
                    locale={locale} 
                    weeksToShow={weeksToShow}
                    currentDate={currentDate}
                    teamId={teamId}
                  />
                  <PlannerButton 
                    members={members} 
                    locale={locale} 
                    teamId={teamId}
                  />
                </div>

                {/* Edit Mode Actions - Optimized */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {editMode ? (
                    <div className="flex items-center gap-1 bg-orange-500/20 backdrop-blur-sm rounded-lg p-1 border border-orange-400/30">
                      <div className="flex items-center gap-2 px-2 py-1">
                        <Edit3 className="h-4 w-4 text-orange-100" />
                        <span className="text-sm font-medium text-orange-100 hidden sm:inline">Edit Mode</span>
                      </div>
                      <div className="w-px h-6 bg-orange-300/30"></div>
                      <BulkUpdateDialog members={members} locale={locale} onUpdate={fetchAvailability} />
                      <MemberForm teamId={teamId} locale={locale} onMemberAdded={onMembersUpdate} />
                      <div className="w-px h-6 bg-orange-300/30"></div>
                      <div className="flex items-center gap-1 px-2">
                        <Switch checked={editMode} onCheckedChange={handleEditModeToggle} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-green-500/20 backdrop-blur-sm rounded-lg p-2 border border-green-400/30">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-green-100" />
                        <span className="text-sm font-medium text-green-100 hidden sm:inline">View Mode</span>
                      </div>
                      <Switch checked={editMode} onCheckedChange={handleEditModeToggle} />
                    </div>
                  )}
                </div>

                <div className="w-full sm:w-auto">
                  <SettingsDropdown currentLocale={locale} members={members} team={team} />
                </div>
              </div>
            </div>
          </div>

          {/* Date Navigation - Integrated and Compact */}
          <div className="bg-black/10 backdrop-blur-sm border-t border-white/10">
            <div className="px-4 sm:px-6 py-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-white/20 backdrop-blur-sm rounded-md flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-3 w-3 text-white" />
                    </div>
                    <span className="font-semibold text-sm sm:text-base text-white">{formatDateRange()}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToToday}
                      className="text-xs bg-white/10 backdrop-blur-sm text-white border-white/20 hover:bg-white/20 font-medium rounded-full px-2 py-1 h-6"
                    >
                      Today
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-1 w-full sm:w-auto justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigateDate("prev")} 
                    className="rounded-md bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 h-7 w-7 p-0"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigateDate("next")} 
                    className="rounded-md bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 h-7 w-7 p-0"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-4 sm:p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-3 bg-white dark:bg-gray-800 rounded-lg px-6 py-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="w-6 h-6 bg-blue-600 rounded-full animate-pulse"></div>
                <span className="font-medium text-gray-900 dark:text-white">Loading...</span>
              </div>
            </div>
          ) : (
            renderMultiWeekView()
          )}
        </div>

        {/* Status Legend */}
        <div className="text-center py-4 px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs text-gray-500 dark:text-gray-400">
            {simplifiedMode ? (
              <>
                {/* Simplified legend: only 2 options */}
                <div className="flex items-center gap-1">
                  <span>🟢</span>
                  <span>{t("status.available")} ({t("analytics.includesRemote")})</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>🔴</span>
                  <span>{t("analytics.notAvailable")}</span>
                </div>
              </>
            ) : (
              <>
                {/* Full legend: all status options */}
                {["available", "remote", "unavailable", "need_to_check", "absent", "holiday"].map((status) => {
                  const config = getStatusConfig(status)
                  return (
                  <div key={status} className="flex items-center gap-1">
                    <span>{config.icon}</span>
                    <span>{config.label}</span>
                  </div>
                )
                })}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4 px-4 sm:px-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Developed with <span className="text-red-500">♥</span> by Jonas Van Hove
          </div>
        </div>

      </div>

      {/* Password Dialog */}
      <EditModePasswordDialog
        isOpen={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
        teamName={teamName}
        onPasswordSubmit={handlePasswordSubmit}
        isLoading={isPasswordLoading}
        error={passwordError}
        locale={locale}
      />
    </TooltipProvider>
  )
}

export { AvailabilityCalendarRedesigned }
