"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
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
  Keyboard,
  Settings,
} from "lucide-react"
import { Copy } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { useTranslation, type Locale } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { MemberForm } from "./member-form"
import { BulkUpdateDialog, AnalyticsButton, PlannerButton } from "./bulk-update-dialog"
import { SettingsDropdown } from "./settings-dropdown"
import { MemberAvatar } from "./member-avatar"
import { EditModePasswordDialog } from "./edit-mode-password-dialog"
import { AvailabilityDropdown } from "./availability-dropdown"
import { useTodayAvailability } from "@/hooks/use-today-availability"
import { useVersion } from "@/hooks/use-version"
import { HamburgerMenu, HamburgerMenuItem } from "@/components/ui/hamburger-menu"
import { useIsMobile } from "@/hooks/use-mobile"
import { useSwipe } from "@/hooks/use-swipe"
import { format } from "date-fns"
import { useTheme } from "next-themes"
import { toast } from "@/hooks/use-toast"

interface Member {
  id: string
  first_name: string
  last_name: string
  email?: string
  profile_image?: string
  role?: string
  status?: string
  member_status?: string
  is_hidden?: boolean
  created_at?: string
  last_active?: string
  order_index?: number
  birth_date?: string | null
}

interface Availability {
  member_id: string
  date: string
  status: "available" | "unavailable" | "need_to_check" | "absent" | "holiday" | "remote"
  auto_holiday?: boolean
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
  initialDate?: Date
  onDateNavigation?: (newDate: Date) => void
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
  initialDate,
  onDateNavigation,
}: AvailabilityCalendarProps) => {
  const { theme } = useTheme()
  // Note: members include birth_date when available; logs removed to reduce noise
  // Initialize currentDate to Monday of the week containing initialDate or current date
  const [currentDate, setCurrentDate] = useState(() => {
    const targetDate = initialDate || new Date()
    // Inline getMondayOfWeek logic for initialization
    const d = new Date(targetDate)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
  })
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
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  const [openSettings, setOpenSettings] = useState(false)
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null)
  const [bulkSelectionRange, setBulkSelectionRange] = useState<{
    startDate?: Date
    endDate?: Date
    isActive: boolean
  }>({ isActive: false })
  // Weekend behavior: when true, weekends count as weekdays for completion
  const [weekendsAsWeekdays, setWeekendsAsWeekdays] = useState<boolean>(false)
  const router = useRouter()
  const { t } = useTranslation(locale)
  // Realtime channel for team notifications
  const channelRef = useRef<any>(null)

  // Hook to get today's availability for all members (always shows today regardless of visible week)
  const memberIds = members.map(member => member.id)
  const { todayAvailability } = useTodayAvailability(memberIds)

  // Hook to get version info (same as settings menu)
  const { version, isLoading: versionLoading } = useVersion()
  
  // Mobile responsive hook
  const isMobile = useIsMobile()

  // Load weekend preference per team and listen for changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`weekendsAsWeekdays:${teamId}`) === 'true'
      setWeekendsAsWeekdays(saved)
    } catch {}

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { teamId: string; enabled: boolean }
      if (!detail) return
      if (detail.teamId !== teamId) return
      setWeekendsAsWeekdays(detail.enabled)
    }
    window.addEventListener('weekendsAsWeekdaysChanged', handler as EventListener)
    return () => window.removeEventListener('weekendsAsWeekdaysChanged', handler as EventListener)
  }, [teamId])

  // Get theme-specific colors for background and header
  const getThemeColors = () => {
    switch (theme) {
      case 'autumn':
        return {
          background: 'bg-orange-50/50 dark:bg-orange-950/20',
          header: 'bg-gradient-to-r from-orange-600 via-amber-700 to-orange-800 dark:from-orange-900 dark:via-orange-800 dark:to-amber-900',
          headerBorder: 'border-orange-500/20 dark:border-orange-700'
        }
      case 'winter':
        return {
          background: 'bg-blue-50/50 dark:bg-blue-950/20',
          header: 'bg-gradient-to-r from-blue-600 via-slate-700 to-blue-800 dark:from-blue-900 dark:via-slate-800 dark:to-blue-900',
          headerBorder: 'border-blue-500/20 dark:border-blue-700'
        }
      case 'spring':
        return {
          background: 'bg-green-50/50 dark:bg-green-950/20',
          header: 'bg-gradient-to-r from-green-600 via-emerald-700 to-green-800 dark:from-green-900 dark:via-emerald-800 dark:to-green-900',
          headerBorder: 'border-green-500/20 dark:border-green-700'
        }
      case 'summer':
        return {
          background: 'bg-yellow-50/50 dark:bg-yellow-950/20',
          header: 'bg-gradient-to-r from-yellow-600 via-amber-700 to-yellow-800 dark:from-yellow-900 dark:via-amber-800 dark:to-yellow-900',
          headerBorder: 'border-yellow-500/20 dark:border-yellow-700'
        }
      case 'cozy':
        return {
          background: 'bg-amber-50/30 dark:bg-amber-950/20',
          header: 'bg-gradient-to-r from-amber-700 via-orange-800 to-amber-900 dark:from-amber-900 dark:via-orange-900 dark:to-amber-950',
          headerBorder: 'border-amber-500/20 dark:border-amber-700'
        }
      case 'blackwhite':
        return {
          background: 'bg-gray-50 dark:bg-gray-900',
          header: 'bg-gradient-to-r from-gray-800 via-gray-900 to-black dark:from-gray-900 dark:via-black dark:to-gray-950',
          headerBorder: 'border-gray-500/20 dark:border-gray-800'
        }
      case 'bythestove':
        return {
          background: 'bg-red-50/30 dark:bg-red-950/20',
          header: 'bg-gradient-to-r from-red-700 via-orange-800 to-red-900 dark:from-red-900 dark:via-orange-900 dark:to-red-950',
          headerBorder: 'border-red-500/20 dark:border-red-700'
        }
      default:
        return {
          background: 'bg-gray-50 dark:bg-gray-900',
          header: 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900',
          headerBorder: 'border-blue-500/20 dark:border-gray-700'
        }
    }
  }

  const themeColors = getThemeColors()

  // Get comprehensive theme-specific styling
  const getThemeClasses = () => {
    switch (theme) {
      case 'cozy':
        return {
          container: 'cozy',
          card: 'bg-gradient-to-br from-amber-50/80 to-orange-50/60 border-amber-200/50 shadow-lg shadow-amber-900/10',
          button: 'hover:shadow-lg hover:shadow-amber-900/20 hover:-translate-y-0.5 transition-all duration-300',
          input: 'bg-amber-50/50 border-amber-200 focus:border-amber-400 focus:ring-amber-200/50',
          avatar: 'ring-2 ring-amber-300/50 shadow-lg shadow-amber-900/20',
          text: 'text-amber-900/90',
          accent: 'bg-amber-100/80 text-amber-800',
        }
      case 'blackwhite':
        return {
          container: 'blackwhite',
          card: 'bg-white border-2 border-gray-900 shadow-[4px_4px_0_rgb(0,0,0)] hover:shadow-[6px_6px_0_rgb(0,0,0)] transition-all',
          button: 'border-2 border-gray-900 hover:bg-gray-900 hover:text-white font-bold uppercase tracking-wide transition-all duration-200',
          input: 'border-2 border-gray-900 bg-white font-medium focus:ring-4 focus:ring-gray-300',
          avatar: 'ring-2 ring-gray-900 shadow-lg',
          text: 'text-gray-900 font-medium',
          accent: 'bg-gray-100 text-gray-900 border border-gray-400',
        }
      case 'bythestove':
        return {
          container: 'bythestove',
          card: 'bg-gradient-to-br from-red-50/80 to-orange-50/60 border-red-200/30 shadow-xl shadow-red-900/15 relative overflow-hidden',
          button: 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-400',
          input: 'bg-gradient-to-br from-red-50 to-orange-50 border-red-300 focus:border-orange-500 focus:ring-red-200/50',
          avatar: 'ring-2 ring-red-400/60 shadow-xl shadow-red-900/30',
          text: 'text-red-900/90',
          accent: 'bg-gradient-to-r from-red-100 to-orange-100 text-red-800',
        }
      default:
        return {
          container: '',
          card: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
          button: 'hover:bg-gray-50 dark:hover:bg-gray-700',
          input: 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600',
          avatar: 'ring-2 ring-gray-200 dark:ring-gray-700',
          text: 'text-gray-900 dark:text-gray-100',
          accent: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
        }
    }
  }

  const themeClasses = getThemeClasses()


  // Memoized callback for bulk range selection changes
  const handleRangeSelectionChange = useCallback((startDate?: Date, endDate?: Date, isActive?: boolean) => {
    setBulkSelectionRange({ startDate, endDate, isActive: !!isActive })
  }, [])

  // Subscribe to team week-complete notifications via Supabase Realtime
  useEffect(() => {
    try {
      const channel = supabase.channel(`team:${teamId}`)
      channel
        .on('broadcast', { event: 'week_complete' }, (payload: any) => {
          try {
            const data = payload?.payload || payload
            if (!data || data.teamId !== teamId) return

            // Optionally skip showing a notification to the same member who triggered it
            const currentUserMember = members.find(m => m.email && userEmail && m.email.toLowerCase() === userEmail.toLowerCase())
            if (currentUserMember && data.memberId === currentUserMember.id) {
              return
            }

            // Only show if user enabled notifications
            const enabled = typeof window !== 'undefined' && localStorage.getItem('notifications') !== 'false'
            if (!enabled) return

            if (!('Notification' in window)) return
            const titleByLocale = locale === 'nl' ? 'AvPlanner' : locale === 'fr' ? 'AvPlanner' : 'AvPlanner'
            const messageByLocale =
              locale === 'nl'
                ? `${data.memberName} heeft de volledige week ingevuld voor ${teamName} 🎉`
                : locale === 'fr'
                ? `${data.memberName} a complété toute la semaine pour ${teamName} 🎉`
                : `${data.memberName} completed the full week for ${teamName} 🎉`

            if (Notification.permission === 'granted') {
              new Notification(titleByLocale, { body: messageByLocale })
            } else if (Notification.permission !== 'denied') {
              // Try requesting permission once in this context
              Notification.requestPermission().then((permission) => {
                if (permission === 'granted') {
                  new Notification(titleByLocale, { body: messageByLocale })
                }
              }).catch(() => {})
            }
          } catch (e) {
            console.warn('Failed to handle week_complete notification', e)
          }
        })
        .on('broadcast', { event: 'team_notification' }, (payload: any) => {
          try {
            const data = payload?.payload || payload
            if (!data || data.teamId !== teamId) return
            const enabled = typeof window !== 'undefined' && localStorage.getItem('notifications') !== 'false'
            if (!enabled) return
            if (!('Notification' in window)) return
            const title = data.teamName || 'AvPlanner'
            const body = data.message
            if (Notification.permission === 'granted') {
              new Notification(title, { body })
            } else if (Notification.permission !== 'denied') {
              Notification.requestPermission().then((perm) => {
                if (perm === 'granted') new Notification(title, { body })
              }).catch(() => {})
            }
          } catch (e) {
            console.warn('Failed to handle team_notification', e)
          }
        })
        .subscribe()

      channelRef.current = channel
      return () => {
        try { channel.unsubscribe() } catch {}
        channelRef.current = null
      }
    } catch (e) {
      console.warn('Realtime subscription failed', e)
    }
  }, [teamId, members, userEmail, locale, teamName])

  // Listen for local UI requests to send a team notification (from SettingsDropdown) and broadcast them
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { teamId: string; teamName: string; message: string; senderId?: string; senderName?: string; locale?: string }
      if (!detail || detail.teamId !== teamId) return
      const payload = { ...detail }
      try {
        if (channelRef.current) {
          channelRef.current.send({ type: 'broadcast', event: 'team_notification', payload })
        } else {
          supabase.channel(`team:${teamId}`).send({ type: 'broadcast', event: 'team_notification', payload })
        }
      } catch (err) {
        console.warn('Broadcast team_notification failed', err)
      }

      // Provide immediate feedback to the sender if notifications are enabled
      const enabled = typeof window !== 'undefined' && localStorage.getItem('notifications') !== 'false'
      if (enabled && typeof window !== 'undefined' && 'Notification' in window) {
        const title = detail.teamName || 'AvPlanner'
        const body = detail.message
        if (Notification.permission === 'granted') {
          new Notification(title, { body })
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then((perm) => {
            if (perm === 'granted') new Notification(title, { body })
          }).catch(() => {})
        }
      }
    }

    window.addEventListener('teamNotificationSend', handler as EventListener)
    return () => window.removeEventListener('teamNotificationSend', handler as EventListener)
  }, [teamId])

  // Swipe controls for mobile week navigation
  const swipeRef = useSwipe({
    onSwipeLeft: () => {
      if (isMobile) {
        setSwipeDirection("left")
        setTimeout(() => setSwipeDirection(null), 300) // Reset after animation
        navigateDate("next") // Swipe left = go to next week
      }
    },
    onSwipeRight: () => {
      if (isMobile) {
        setSwipeDirection("right")
        setTimeout(() => setSwipeDirection(null), 300) // Reset after animation
        navigateDate("prev") // Swipe right = go to previous week
      }
    }
  }, {
    threshold: 50,   // Minimum 50px swipe distance
    velocity: 0.3    // Minimum swipe velocity
  })

  // Helper function to get Monday of the week
  const getMondayOfWeek = (date: Date): Date => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
  }

  // Helper function to format date to string without timezone issues
  const getDateString = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Alias for getMondayOfWeek for consistency with usage in smart filtering
  const getWeekStart = getMondayOfWeek

  // Helper function to check if a date is in the current visible period (supports multiple weeks)
  const isDateInCurrentPeriod = (date: Date) => {
    const weekStart = getWeekStart(currentDate)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + (weeksToShow * 7) - 1) // Support multiple weeks
    return date >= weekStart && date <= weekEnd
  }

  // Legacy function for backward compatibility (now uses the period check)
  const isDateInCurrentWeek = (date: Date) => {
    return isDateInCurrentPeriod(date)
  }

  // Smart member filtering based on visibility and activity status for the current visible period
  // Rules:
  // 1. Hidden members (is_hidden=true): Only show if they have NON-HOLIDAY availability records for this visible period
  // 2. Visible members (is_hidden=false): Always show
  // 3. Active members (status=active): Always show
  // 4. Inactive members (status=inactive): Only show if they have availability records for this visible period
  const getVisibleMembers = () => {
    // Precompute string range for current visible period to avoid timezone issues
    const periodStart = getDateString(getWeekStart(currentDate))
    const end = new Date(getWeekStart(currentDate))
    end.setDate(end.getDate() + (weeksToShow * 7) - 1)
    const periodEnd = getDateString(end)

    return members.filter(member => {
      // Check if member has availability records for current visible period (supports multiple weeks)
      const hasRecordsThisPeriod = availability.some(record => 
        record.member_id === member.id && 
        record.date >= periodStart && record.date <= periodEnd
      )
      
      // Check if member has NON-HOLIDAY records for this visible period
      const hasNonHolidayRecordsThisPeriod = availability.some(record => 
        record.member_id === member.id && 
        record.date >= periodStart && record.date <= periodEnd &&
        record.status !== 'holiday'
      )
      
      // Get member visibility and status (handle both old and new data structures)
      const isHidden = member.is_hidden || false
      const isActive = !member.member_status || member.member_status === 'active' || !member.status || member.status === 'active'
      
      // Logic based on your requirements:
      if (isHidden) {
        // Hidden members: only show if they have NON-HOLIDAY records for this visible period
  // Removed verbose hidden-member logging
        return hasNonHolidayRecordsThisPeriod
      }
      
      if (isActive) {
        // Active members: always show
        return true
      } else {
        // Inactive members: hide if they have no records for this visible period
        return hasRecordsThisPeriod
      }
    })
  }

  const visibleMembers = getVisibleMembers()

  // Get all active members for analytics (regardless of visibility settings)
  // Analytics should include all active members to give accurate team insights
  const getActiveMembersForAnalytics = () => {
    return members.filter(member => {
      // Get member activity status (handle both old and new data structures)
      const isActive = !member.member_status || member.member_status === 'active' || !member.status || member.status === 'active'
      return isActive
    })
  }

  const activeMembersForAnalytics = getActiveMembersForAnalytics()

  // Check if a date is within the bulk selection range for visual highlighting
  const isDateInBulkRange = (date: Date) => {
    if (!bulkSelectionRange.isActive || !bulkSelectionRange.startDate || !bulkSelectionRange.endDate) {
      return false
    }
    
    const dateTime = date.getTime()
    const startTime = bulkSelectionRange.startDate.getTime()
    const endTime = bulkSelectionRange.endDate.getTime()
    
    return dateTime >= startTime && dateTime <= endTime
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

  // Keyboard shortcuts for navigation (like Google Calendar)
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in input fields
      const target = event.target as HTMLElement | null
      const active = (typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null)
      const isEditable = (el: HTMLElement | null) => {
        if (!el) return false
        const tag = el.tagName
        if (el.isContentEditable) return true
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
        if (el.getAttribute('role') === 'textbox') return true
        if (el.closest && el.closest('[contenteditable="true"]')) return true
        return false
      }

      if (isEditable(target) || isEditable(active)) {
        return
      }

      // Prevent default behavior for our shortcuts
      switch (event.key.toLowerCase()) {
        case 'j':
        case 'n':
          event.preventDefault()
          navigateDate("next")
          break
        case 'k':
        case 'p':
          event.preventDefault()
          navigateDate("prev")
          break
        case 't':
          event.preventDefault()
          goToToday()
          break
        case 's':
          event.preventDefault()
          // Trigger settings dropdown via state
          setOpenSettings(true)
          break
        case 'g':
          event.preventDefault()
          setShowDatePicker(true)
          break
      }
    }

    // Add event listener
    document.addEventListener('keydown', handleKeyPress)

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [weeksToShow]) // Include weeksToShow as dependency since navigateDate uses it

  // Track if this is the initial render to avoid calling onDateNavigation on mount
  const isInitialRender = useRef(true)

  // Update currentDate when initialDate prop changes (from URL navigation)
  useEffect(() => {
    if (initialDate) {
      // Navigate to the Monday of the week containing the initialDate
      const mondayOfWeek = getMondayOfWeek(initialDate)
      
      // Only update if we're not already showing the correct week
      if (mondayOfWeek.getTime() !== currentDate.getTime()) {
        setCurrentDate(mondayOfWeek)
  // Removed navigation debug log
        
        // Notify parent of date navigation (but only if not initial render)
        if (!isInitialRender.current && onDateNavigation) {
          onDateNavigation(mondayOfWeek)
        }
      }
    }
  }, [initialDate, currentDate, onDateNavigation])

  // Set initial render flag after mount
  useEffect(() => {
    isInitialRender.current = false
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

  // Helper function to check if two dates are the same day
  const isSameDay = (date1: Date, date2: Date) => {
    // Compare using local calendar components to avoid timezone-related day shifts
    return getDateString(date1) === getDateString(date2)
  }

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
          color: "bg-green-50 border-green-200 dark:bg-green-500/20 dark:border-green-400/60 dark:ring-1 dark:ring-green-300/40 dark:shadow-[0_0_10px_rgba(34,197,94,0.35)]",
          label: t("status.available"),
          textColor: "text-green-700 dark:text-green-300",
        },
        remote: {
          icon: "🟣",
          color: "bg-purple-50 border-purple-200 dark:bg-purple-500/20 dark:border-purple-400/60 dark:ring-1 dark:ring-purple-300/40 dark:shadow-[0_0_10px_rgba(168,85,247,0.35)]",
          label: t("status.remote"),
          textColor: "text-purple-700 dark:text-purple-300",
        },
        unavailable: {
          icon: "🔴",
          color: "bg-red-50 border-red-200 dark:bg-red-500/20 dark:border-red-400/60 dark:ring-1 dark:ring-red-300/40 dark:shadow-[0_0_10px_rgba(239,68,68,0.35)]",
          label: t("status.unavailable"),
          textColor: "text-red-700 dark:text-red-300",
        },
        need_to_check: {
          icon: "🔵",
          color: "bg-blue-50 border-blue-200 dark:bg-blue-500/20 dark:border-blue-400/60 dark:ring-1 dark:ring-blue-300/40 dark:shadow-[0_0_10px_rgba(59,130,246,0.35)]",
          label: t("status.need_to_check"),
          textColor: "text-blue-700 dark:text-blue-300",
        },
        absent: {
          icon: "⚫",
          color: "bg-gray-50 border-gray-200 dark:bg-gray-800/40 dark:border-gray-600/70",
          label: t("status.absent"),
          textColor: "text-gray-700 dark:text-gray-300",
        },
        holiday: {
          icon: "🟡",
          color: "bg-yellow-50 border-yellow-200 dark:bg-yellow-500/20 dark:border-yellow-400/60 dark:ring-1 dark:ring-yellow-300/40 dark:shadow-[0_0_10px_rgba(234,179,8,0.35)]",
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

  // Calculate the maximum name width needed
  const getMaxNameWidth = () => {
    if (members.length === 0) return "200px"

    const maxNameLength = Math.max(...visibleMembers.map((member) => `${member.first_name} ${member.last_name}`.length))
    const baseWidth = 180
    const charWidth = 8
    const iconSpace = 60

    return `${Math.max(baseWidth, maxNameLength * charWidth + iconSpace)}px`
  }

  useEffect(() => {
    fetchAvailability()
  }, [currentDate, members, weeksToShow])

  const fetchAvailability = async (): Promise<Availability[]> => {
    if (members.length === 0) return []

  setIsLoading(true)
  // Fetching availability data
    try {
      const startDate = getMondayOfWeek(currentDate)
      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + weeksToShow * 7 - 1)

  // Removed verbose calendar range/debug info

      // Fetch availability for ALL members to support proper filtering and analytics
      // This ensures we have data to determine who should be visible and analytics work correctly
      const { data, error } = await supabase
        .from("availability")
        .select("*")
        .in(
          "member_id",
          members.map((m) => m.id), // Changed from visibleMembers to ALL members
        )
        .gte("date", getDateString(startDate))
        .lte("date", getDateString(endDate))

      if (error) throw error
      
  // Removed fetch summary logs
      
      // Log some sample records to help debug bulk update visibility
      if (data && data.length > 0) {
        // Debug samples removed
      }
      
      const fresh = data || []
      setAvailability(fresh)
      return fresh
    } catch (error) {
      console.error("Error fetching availability:", error)
      return []
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
      
      // Get current status first for activity logging
      const { data: currentAvailability } = await supabase
        .from("availability")
        .select("status")
        .eq("member_id", memberId)
        .eq("date", date)
        .single()

      const oldStatus = currentAvailability?.status || null

      // Find current user's member ID to track who made the change
      const currentUserMember = members.find(m => m.email === userEmail)
      const changedById = currentUserMember?.id || null

      // Update availability with changed_by_id and mark as not auto-holiday (manual change)
      const { error } = await supabase.from("availability").upsert([{ 
        member_id: memberId, 
        date, 
        status,
        changed_by_id: changedById,
        auto_holiday: false  // Mark as manual change, not auto-holiday
      }], {
        onConflict: "member_id,date",
      })

      if (error) {
        console.error('Supabase error details:', error)
        throw error
      }

      // Activity logging is now handled automatically by database triggers
  const fresh = await fetchAvailability()
    // Evaluate completion for the current user in the current visible week using fresh data
    const weekStart = getMondayOfWeek(currentDate)
    triggerConfettiIfWeekComplete(weekStart, fresh)
    } catch (error) {
      console.error("Error updating availability:", error)
      alert("Er is een fout opgetreden bij het bijwerken van de beschikbaarheid.")
    }
  }

  const clearAvailability = async (memberId: string, date: string) => {
    if (!editMode) return
    try {
      const { error } = await supabase
        .from("availability")
        .delete()
        .eq("member_id", memberId)
        .eq("date", date)
      if (error) throw error
      fetchAvailability()
    } catch (error) {
      console.error("Error clearing availability:", error)
      alert("Er is een fout opgetreden bij het leegmaken van de beschikbaarheid.")
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
      // Debug: show current member info
      const member = members.find(m => m.id === memberId)
      
      const { data, error } = await supabase.rpc('move_member_up', {
        team_id_param: teamId,
        member_id_param: memberId,
        user_email: userEmail
      })
      
      if (error) {
        console.error('Supabase RPC error:', error)
        // Check if it's a function not found error
        if (error.code === '42883') {
          alert("De database functie 'move_member_up' bestaat niet. Voer eerst de migration script uit.")
          return
        }
        throw error
      }
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
      // Debug: show current member info
      const member = members.find(m => m.id === memberId)
      
      const { data, error } = await supabase.rpc('move_member_down', {
        team_id_param: teamId,
        member_id_param: memberId,
        user_email: userEmail
      })
      
      if (error) {
        console.error('Supabase RPC error:', error)
        // Check if it's a function not found error
        if (error.code === '42883') {
          alert("De database functie 'move_member_down' bestaat niet. Voer eerst de migration script uit.")
          return
        }
        throw error
      }
      onMembersUpdate()
    } catch (error: any) {
      console.error("Error moving member down:", error)
      alert(`Er is een fout opgetreden bij het verplaatsen van het teamlid: ${error?.message || error}`)
    }
  }

  const getAvailabilityForDate = (memberId: string, date: Date, source?: Availability[]) => {
    const dateString = getDateString(date)
    const src = source || availability
    return src.find((a) => a.member_id === memberId && a.date === dateString)
  }

  const getTodayAvailability = (memberId: string) => {
    // Always return today's availability from the hook, regardless of visible week
    return todayAvailability[memberId] ? {
      member_id: memberId,
      date: getDateString(new Date()),
      status: todayAvailability[memberId]!
    } : undefined
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

  // Helper: check if the given date matches member's birthday (month/day)
  const isBirthdayDate = (birth?: string | null, date?: Date) => {
    if (!birth || !date) {
      return false
    }
    // Prefer parsing YYYY-MM-DD safely without timezone shifts
    const m = /^\d{4}-\d{2}-\d{2}$/.test(birth)
    let bMonth: number
    let bDay: number
    if (m) {
      const [year, mm, dd] = birth.split('-')
      bMonth = parseInt(mm, 10) - 1
      bDay = parseInt(dd, 10)
    } else {
      const d = new Date(birth as string)
      if (isNaN(d.getTime())) {
        return false
      }
      bMonth = d.getMonth()
      bDay = d.getDate()
    }
    return date.getMonth() === bMonth && date.getDate() === bDay
  }

  // Debug logging: per-member summary + today's birthdays
  // Runs once per members/date range change to avoid noisy spam
  useEffect(() => {
    const today = new Date()
    // Compute visible dates for the current grid period
    const start = getMondayOfWeek(currentDate)
    const totalDays = weeksToShow * 7
    const visibleDates: Date[] = Array.from({ length: totalDays }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
    const visibleDateStrings = visibleDates.map(d => getDateString(d))

    // Per-member debug log
    members.forEach(m => {
      const name = `${m.first_name} ${m.last_name}`.trim()
      const birth = m.birth_date || null
      const isToday = isBirthdayDate(birth || undefined, today)
      const weekMatches = visibleDates
        .filter(d => isBirthdayDate(birth || undefined, d))
        .map(d => getDateString(d))
      console.info(
        `👤 Member: ${name} | birth_date=${birth ?? 'null'} | isBirthdayToday=${isToday} | weekMatches=[${weekMatches.join(', ')}] | visible=[${visibleDateStrings.join(', ')}]`
      )
    })

    // Summary of birthdays today
    const birthdays = members
      .filter(m => isBirthdayDate(m.birth_date || undefined, today))
      .map(m => `${m.first_name} ${m.last_name}`.trim())
    if (birthdays.length > 0) {
      console.info(`🎂 Birthdays today: ${birthdays.join(", ")}`)
    }
  }, [members, currentDate, weeksToShow])

  // Determine if a given week for a member is fully filled according to the rules
  // Success criteria:
  // - Count only weekdays by default; if includeWeekends=true then count all 7 days
  // - A day is considered "filled" if there is an availability record with any status (including holiday/remote)
  // - Auto-holiday still counts as filled
  const isMemberWeekComplete = (memberId: string, weekStart: Date, includeWeekends?: boolean, source?: Availability[]) => {
    const days: Date[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return d
    })

    // Determine which days to include in denominator
    const consideredDays = days.filter(d => includeWeekends ? true : !isWeekend(d))
    if (consideredDays.length === 0) return false

    // For each considered day, require an availability record (any status)
    const allFilled = consideredDays.every(d => !!getAvailabilityForDate(memberId, d, source))
    return allFilled
  }

  // Trigger confetti when a member completes their current visible week
  const triggerConfettiIfWeekComplete = (weekStart: Date, source?: Availability[]) => {
    try {
      // Confetti is only for the current user's own week (regardless of which member was updated)
      if (!userEmail) return
      const currentUserMember = members.find(m => m.email && userEmail && m.email.toLowerCase() === userEmail.toLowerCase())
      if (!currentUserMember) return

      // Requirement: Only weekdays count for confetti (exclude weekends regardless of admin toggle)
      const includeWeekends = false
      // Normalize to Monday 00:00 to keep keys stable even if weekStart carried a time
      const normalizedWeekStart = getMondayOfWeek(weekStart)
      normalizedWeekStart.setHours(0,0,0,0)

      // Optional early-week guard: Only celebrate once it's reasonable (Fri or later) to avoid premature fireworks
      const today = new Date()
      const isInThisWeek = today >= normalizedWeekStart && today <= new Date(normalizedWeekStart.getTime() + 6 * 86400000)
      const isFriOrLater = today.getDay() === 5 || today.getDay() === 6 || today.getDay() === 0 // Fri/Sat/Sun

      if (!isMemberWeekComplete(currentUserMember.id, normalizedWeekStart, includeWeekends, source)) return
      if (isInThisWeek && !isFriOrLater) {
        // Defer celebration until later in the week to reduce noise
        return
      }
      // Avoid duplicate celebration per member/week/mode
      const key = `celebrated:${teamId}:${currentUserMember.id}:${getDateString(normalizedWeekStart)}:wkdaysOnly`
      if (localStorage.getItem(key) === 'true') return
      // Lazy import local utility
      import('@/lib/confetti').then(mod => mod.createConfetti())
      // Broadcast to teammates that this member completed the week
      const payload = {
        teamId,
        teamName,
        memberId: currentUserMember.id,
        memberName: `${currentUserMember.first_name || ''} ${currentUserMember.last_name || ''}`.trim() || currentUserMember.email || 'Teamlid',
        weekStartISO: getDateString(normalizedWeekStart),
        locale
      }
      try {
        if (channelRef.current) {
          channelRef.current.send({ type: 'broadcast', event: 'week_complete', payload })
        } else {
          // Fire-and-forget in case channelRef isn't ready
          supabase.channel(`team:${teamId}`).send({ type: 'broadcast', event: 'week_complete', payload })
        }
      } catch (e) {
        console.warn('Broadcast failed', e)
      }
      localStorage.setItem(key, 'true')
    } catch (e) {
      console.warn('Confetti trigger failed', e)
    }
  }

  const navigateDate = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      newDate.setDate(prev.getDate() + (direction === "next" ? weeksToShow * 7 : -weeksToShow * 7))
      
      // Trigger URL update after state change
      if (onDateNavigation) {
        setTimeout(() => onDateNavigation(newDate), 0)
      }
      
      return newDate
    })
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    
    // Trigger URL update
    if (onDateNavigation) {
      setTimeout(() => onDateNavigation(today), 0)
    }
  }

  const goToSpecificDate = (dateString: string) => {
    const date = new Date(dateString)
    if (!isNaN(date.getTime())) {
      setCurrentDate(date)
      setShowDatePicker(false)
      
      // Trigger URL update
      if (onDateNavigation) {
        setTimeout(() => onDateNavigation(date), 0)
      }
    }
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
    
    const memberScores = visibleMembers.map(member => calculateMemberWeeklyScore(member, weekDays))
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
            className={`${themeClasses.card} rounded-lg overflow-hidden shadow-sm`}
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
                        className={`flex items-center gap-2 ${themeClasses.button}`}
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
                            {visibleMembers.map(member => {
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
                                      isBirthdayToday={isBirthdayDate(member.birth_date, new Date())}
                                      statusIndicator={{
                                        show: true,
                                        status: getTodayAvailability(member.id)?.status
                                      }}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {member.first_name} {member.last_name}
                                        {member.birth_date && (
                                          <span className="ml-2 text-xs text-muted-foreground whitespace-nowrap">
                                            {(() => {
                                              const birth = member.birth_date as string
                                              const today = new Date()
                                              if (isBirthdayDate(birth, today)) {
                                                return `🎂 ${t("calendar.today")}`
                                              }
                                              if (/^\d{4}-\d{2}-\d{2}$/.test(birth)) {
                                                const [, mm, dd] = birth.split('-')
                                                const label = new Date(2000, parseInt(mm, 10) - 1, parseInt(dd, 10))
                                                  .toLocaleDateString(undefined, { month: 'short', day: '2-digit' })
                                                return `🎂 ${label}`
                                              } else {
                                                const d = new Date(birth)
                                                if (!isNaN(d.getTime())) {
                                                  return `🎂 ${d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })}`
                                                }
                                              }
                                              return null
                                            })()}
                                          </span>
                                        )}
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
              {/* Mobile & Tablet View - Weekly Overview */}
              <div className="block xl:hidden">
                {/* Week Days Header */}
                <div className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 mb-4">
                  <div className="grid grid-cols-7 gap-1 p-2">
                    {week.days.map((date, dayIndex) => {
                      const dayName = getDayNames()[dayIndex]
                      const isWeekendDay = isWeekend(date)
                      const shortDayName = dayName.slice(0, 3) // Mon, Tue, etc.
                      
                      return (
                        <div
                          key={dayIndex}
                          className={cn(
                            "text-center p-2 rounded-md relative",
                            isToday(date) && "bg-blue-500 text-white",
                            isWeekendDay && !isToday(date) && "bg-gray-100 dark:bg-gray-600",
                            !isToday(date) && !isWeekendDay && "bg-white dark:bg-gray-800",
                            isDateInBulkRange(date) && !isToday(date) && "ring-2 ring-orange-400/60 bg-orange-50/80 dark:bg-orange-900/20"
                          )}
                        >
                          <div className={cn(
                            "text-xs font-medium",
                            isToday(date) ? "text-blue-100 font-semibold" : "text-gray-500 dark:text-gray-400"
                          )}>
                            {isToday(date) ? t("calendar.today") : shortDayName}
                          </div>
                          <div className={cn(
                            "text-sm font-bold mt-1",
                            isToday(date) ? "text-white" : 
                            isWeekendDay ? "text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-white"
                          )}>
                            {date.getDate()}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Members with their week availability */}
                {visibleMembers.map((member, memberIndex) => (
                  <div
                    key={member.id}
                    className={cn(
                      "border border-gray-200 dark:border-gray-700 rounded-lg mb-3 overflow-hidden",
                      memberIndex % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50/50 dark:bg-gray-700/30",
                    )}
                  >
                    {/* Member Header */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 border-b border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <MemberAvatar
                            firstName={member.first_name}
                            lastName={member.last_name}
                            profileImage={member.profile_image}
                            size="sm"
                            className="ring-1 ring-gray-200 dark:ring-gray-600"
                            isBirthdayToday={isBirthdayDate(member.birth_date, new Date())}
                            statusIndicator={{
                              show: true,
                              status: getTodayAvailability(member.id)?.status
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {member.first_name} {member.last_name}
                              {member.birth_date && (
                                <span className="ml-2 text-xs text-muted-foreground whitespace-nowrap">
                                  {(() => {
                                    const d = new Date(member.birth_date as string)
                                    if (!isNaN(d.getTime())) {
                                      const today = new Date()
                                      const isToday = d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
                                      return isToday ? `🎂 ${t("calendar.today")}` : `🎂 ${d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })}`
                                    }
                                    return null
                                  })()}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {member.email && (
                                <a
                                  href={`mailto:${member.email}`}
                                  className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Mail className="h-3 w-3" />
                                </a>
                              )}
                              {member.email && (
                                <a
                                  href={`https://teams.microsoft.com/l/chat/0/0?users=${member.email}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-purple-500 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MessageSquare className="h-3 w-3" />
                                </a>
                              )}
                              {member.email && (
                                <button
                                  type="button"
                                  className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigator.clipboard.writeText(member.email || '')
                                    toast({ title: 'Gekopieerd', description: `${member.email} is naar het klembord gekopieerd.` })
                                  }}
                                  aria-label="Copy email"
                                  title="Copy email"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        {editMode && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-8 w-8 p-0 rounded-full flex-shrink-0 ${themeClasses.button}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => moveMemberUp(member.id)} disabled={memberIndex === 0}>
                                Move Up
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => moveMemberDown(member.id)} disabled={memberIndex === members.length - 1}>
                                Move Down
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => deleteMember(member.id)}>
                                Delete Member
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>

                    {/* Week Days Availability - Horizontal Scroll */}
                    <div className="p-3">
                      <div className="grid grid-cols-7 gap-1">
                        {week.days.map((date, dayIndex) => {
                          const record = availability.find(
                            (r) => r.member_id === member.id && r.date === getDateString(date)
                          )
                          const isWeekendDay = isWeekend(date)

                          return (
                            <div
                              key={dayIndex}
                              className={cn(
                                "flex flex-col items-center justify-center p-2 rounded-md border min-h-[60px] relative",
                                isToday(date) && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700",
                                isWeekendDay && !isToday(date) && "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600",
                                !isToday(date) && !isWeekendDay && "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600",
                                isDateInBulkRange(date) && !isToday(date) && "ring-2 ring-orange-400/60 bg-orange-50/80 dark:bg-orange-900/20 border-orange-300 dark:border-orange-600"
                              )}
                            >
                              {/* Birthday indicator - always show at top-right if it's their birthday */}
                              {isBirthdayDate(member.birth_date, date) && (
                                <span className="absolute top-0.5 right-0.5 text-sm leading-none z-10" title="Birthday">🎂</span>
                              )}
                              
                              {isWeekendDay ? (
                                <span className="text-gray-400 dark:text-gray-500 text-2xl font-light">×</span>
                              ) : editMode ? (
                                <div className="flex flex-col items-center gap-1">
                                  <AvailabilityDropdown
                                    value={record?.status}
                                    onValueChange={(status: "available" | "unavailable" | "need_to_check" | "absent" | "holiday" | "remote") => 
                                      updateAvailability(member.id, getDateString(date), status)
                                    }
                                    locale={locale}
                                    size="sm"
                                  />
                                  {record && (
                                    <button
                                      className="text-[10px] text-muted-foreground hover:text-foreground"
                                      onClick={() => clearAvailability(member.id, getDateString(date))}
                                    >
                                      Clear
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="text-xl relative w-full flex items-center justify-center">
                                  {record ? getStatusConfig(record.status).icon : ""}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View */}
              <div className="hidden xl:block min-w-full">
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
                  {week.days.map((date, index) => {
                    const isWeekendDay = isWeekend(date)
                    return (
                      <div
                        key={index}
                        className={cn(
                          "p-3 text-center border-r border-gray-200 dark:border-gray-600 last:border-r-0",
                          isToday(date) && "bg-blue-50 dark:bg-blue-900/20",
                          isWeekendDay && !isToday(date) && "bg-gray-100/80 dark:bg-gray-600/40",
                        )}
                      >
                        <div className={cn(
                          "text-xs font-medium uppercase tracking-wide",
                          isWeekendDay ? "text-gray-400 dark:text-gray-500" : "text-gray-500 dark:text-gray-400"
                        )}>
                          {getDayNames()[index]}
                        </div>
                        <div
                          className={cn(
                            "text-lg font-semibold mt-1",
                            isToday(date) ? "text-blue-600 dark:text-blue-400" : 
                            isWeekendDay ? "text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-white",
                          )}
                        >
                          {date.getDate()}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Member Rows - More subtle styling */}
                {visibleMembers.map((member, memberIndex) => (
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
                            isBirthdayToday={isBirthdayDate(member.birth_date, new Date())}
                            statusIndicator={{
                              show: true,
                              status: getTodayAvailability(member.id)?.status
                            }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {member.first_name} {member.last_name}
                            {member.birth_date && (
                              <span className="ml-2 text-xs text-muted-foreground whitespace-nowrap">
                                {(() => {
                                  const birth = member.birth_date as string
                                  const today = new Date()
                                  if (isBirthdayDate(birth, today)) {
                                    return `🎂 ${t("calendar.today")}`
                                  }
                                  if (/^\d{4}-\d{2}-\d{2}$/.test(birth)) {
                                    const [, mm, dd] = birth.split('-')
                                    const label = new Date(2000, parseInt(mm, 10) - 1, parseInt(dd, 10))
                                      .toLocaleDateString(undefined, { month: 'short', day: '2-digit' })
                                    return `🎂 ${label}`
                                  } else {
                                    const d = new Date(birth)
                                    if (!isNaN(d.getTime())) {
                                      return `🎂 ${d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })}`
                                    }
                                  }
                                  return null
                                })()}
                              </span>
                            )}
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
                            {member.email && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      navigator.clipboard.writeText(member.email || '')
                                      toast({ title: 'Gekopieerd', description: `${member.email} is naar het klembord gekopieerd.` })
                                    }}
                                    aria-label="Copy email"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Kopieer emailadres</p>
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
                      const isHolidayCell = availability?.status === 'holiday'

                      return (
                        <div
                          key={dayIndex}
                          className={cn(
                            "p-3 border-r border-gray-200 dark:border-gray-600 last:border-r-0 relative",
                            isTodayCell && "bg-blue-50/50 dark:bg-blue-900/10",
                            (isWeekendDay || isHolidayCell) && !isTodayCell && "bg-gray-50/80 dark:bg-gray-700/50",
                            isDateInBulkRange(date) && !isTodayCell && "bg-orange-50/80 dark:bg-orange-900/20 ring-1 ring-inset ring-orange-300/60 dark:ring-orange-600/60",
                          )}
                        >
                          {isWeekendDay ? (
                            <div className="h-10 flex items-center justify-center relative">
                              {/* Birthday indicator for weekend */}
                              {isBirthdayDate(member.birth_date, date) && (
                                <span className="absolute top-0 right-0 text-sm leading-none z-10" title="Birthday">🎂</span>
                              )}
                              <div className="w-full h-full bg-gray-100 dark:bg-gray-600 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-500">
                                <span className="text-gray-400 dark:text-gray-500 text-sm font-medium">Weekend</span>
                              </div>
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
                                onClick={(e) => {
                                  if (!editMode) return
                                  
                                  // Ctrl+Click for quick status toggle
                                  if (e.ctrlKey || e.metaKey) {
                                    const newStatus = availability?.status === "available" ? "unavailable" : "available"
                                    updateAvailability(member.id, getDateString(date), newStatus)
                                    return
                                  }
                                  
                                  // Regular click cycles through all statuses
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
                                  updateAvailability(member.id, getDateString(date), nextStatus)
                                }}
                              >
                                <div className="flex items-center justify-center relative w-full h-full">
                                  {/* Birthday indicator - positioned at top-right, always visible */}
                                  {isBirthdayDate(member.birth_date, date) && (
                                    <div className="absolute top-0 right-0 text-sm leading-none z-10" title="Birthday">🎂</div>
                                  )}
                                  
                                  {/* Status icon in center */}
                                  {availability ? getStatusConfig(availability.status).icon : ""}
                                  
                                  {/* Auto-holiday indicator at bottom-right */}
                                  {availability?.auto_holiday && availability?.status === 'holiday' && (
                                    <div className="absolute bottom-0 right-0 w-2 h-2 bg-blue-400 rounded-full border border-white" 
                                         title="Auto-applied holiday" />
                                  )}
                                </div>
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
                                            getDateString(date),
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
                                      </div>
                                    </DropdownMenuItem>
                                    )
                                  })}
                                  <DropdownMenuItem
                                    onClick={() => clearAvailability(member.id, getDateString(date))}
                                    className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                    disabled={!availability}
                                  >
                                    Clear
                                  </DropdownMenuItem>
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
      <div className={`min-h-screen ${themeColors.background} ${themeClasses.container}`}>
        {/* Header - Compact Mobile & Tablet Optimized */}
        <div className={`${themeColors.header} border-b ${themeColors.headerBorder} shadow-lg`}>
          <div className="px-3 lg:px-6 py-2 lg:py-3">
            <div className="flex flex-row items-center justify-between gap-2 lg:gap-3">
              <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/20 flex-shrink-0">
                  <img src="/favicon.svg" alt="Availability Planner" className="h-5 w-5 lg:h-6 lg:w-6 filter brightness-0 invert" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col">
                    <h1 className="text-sm lg:text-lg xl:text-xl font-bold text-white truncate">Availability Planner</h1>
                    <div className="flex items-center gap-2">
                      <p className="text-xs sm:text-sm lg:text-sm font-medium sm:font-semibold text-white lg:text-blue-100 dark:text-gray-300 truncate">{teamName}</p>
                      {bulkSelectionRange.isActive && bulkSelectionRange.startDate && bulkSelectionRange.endDate && (
                        <div className="px-2 py-1 bg-orange-500/20 backdrop-blur-sm rounded-lg border border-orange-400/30 flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-orange-200" />
                          <span className="text-xs font-medium text-orange-200 whitespace-nowrap">
                            {format(bulkSelectionRange.startDate, "MMM d")} - {format(bulkSelectionRange.endDate, "MMM d")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                {/* Desktop Navigation */}
                <div className="hidden xl:flex flex-row items-center gap-2">
                  {/* Week selector */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className={`flex items-center gap-2 ${themeClasses.button}`}>
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

                  {/* Analytics and Planner Buttons */}
                  <div className="flex items-center gap-1">
                    <AnalyticsButton 
                      members={activeMembersForAnalytics} 
                      locale={locale} 
                      weeksToShow={weeksToShow}
                      currentDate={currentDate}
                      teamId={teamId}
                    />
                    <PlannerButton 
                      members={visibleMembers} 
                      locale={locale} 
                      teamId={teamId}
                    />
                  </div>

                  {/* Edit Mode Actions */}
                  <div className="flex items-center gap-2">
                    {editMode ? (
                      <div className="flex items-center gap-1 bg-orange-500/20 backdrop-blur-sm rounded-lg p-1 border border-orange-400/30">
                        <div className="flex items-center gap-2 px-2 py-1">
                          <Edit3 className="h-4 w-4 text-orange-100" />
                          <span className="text-sm font-medium text-orange-100">Edit Mode</span>
                        </div>
                        <div className="w-px h-6 bg-orange-300/30"></div>
                        <BulkUpdateDialog 
                          members={members} 
                          locale={locale} 
                          onUpdate={fetchAvailability} 
                          onRangeSelectionChange={handleRangeSelectionChange}
                        />
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
                          <span className="text-sm font-medium text-green-100">View Mode</span>
                        </div>
                        <Switch checked={editMode} onCheckedChange={handleEditModeToggle} />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Keyboard shortcuts help */}
                    <Dialog open={showKeyboardHelp} onOpenChange={setShowKeyboardHelp}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`h-9 w-9 p-0 ${themeClasses.button}`}
                        >
                          <Keyboard className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Keyboard Shortcuts</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium mb-2">Navigation</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span>Next period:</span>
                                  <div className="flex gap-1">
                                    <kbd className="px-2 py-1 text-xs rounded border border-border bg-muted text-foreground font-mono">J</kbd>
                                    <kbd className="px-2 py-1 text-xs rounded border border-border bg-muted text-foreground font-mono">N</kbd>
                                  </div>
                                </div>
                                <div className="flex justify-between">
                                  <span>Previous period:</span>
                                  <div className="flex gap-1">
                                    <kbd className="px-2 py-1 text-xs rounded border border-border bg-muted text-foreground font-mono">K</kbd>
                                    <kbd className="px-2 py-1 text-xs rounded border border-border bg-muted text-foreground font-mono">P</kbd>
                                  </div>
                                </div>
                                <div className="flex justify-between">
                                  <span>Today:</span>
                                  <kbd className="px-2 py-1 text-xs rounded border border-border bg-muted text-foreground font-mono">T</kbd>
                                </div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-medium mb-2">Actions</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span>Go to date:</span>
                                  <kbd className="px-2 py-1 text-xs rounded border border-border bg-muted text-foreground font-mono">G</kbd>
                                </div>
                                <div className="flex justify-between">
                                  <span>Settings:</span>
                                  <kbd className="px-2 py-1 text-xs rounded border border-border bg-muted text-foreground font-mono">S</kbd>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4">
                            <h4 className="font-medium mb-2">Edit Mode</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Quick toggle:</span>
                                <kbd className="px-2 py-1 text-xs rounded border border-border bg-muted text-foreground font-mono">Ctrl+Click</kbd>
                              </div>
                              <div className="text-xs text-gray-500">
                                Ctrl+Click on availability cells to quickly toggle between available/unavailable
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-4">
                            Shortcuts work when not typing in input fields
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Date picker dialog */}
                    <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`h-9 w-9 p-0 ${themeClasses.button}`}
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm">
                        <DialogHeader>
                          <DialogTitle>Go to Specific Date</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="date-input">Select Date</Label>
                            <Input
                              id="date-input"
                              type="date"
                              defaultValue={getDateString(currentDate)}
                              onChange={(e) => goToSpecificDate(e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div className="text-xs text-gray-500">
                            The calendar will jump to the week containing this date
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <SettingsDropdown 
                      currentLocale={locale} 
                      members={members} 
                      team={team} 
                      forceOpen={openSettings}
                      onOpenChange={() => setOpenSettings(false)}
                    />
                  </div>
                </div>

                {/* Mobile & Tablet Navigation - Icon Only */}
                <div className="xl:hidden flex items-center justify-end">
                  {/* Icon-Only Hamburger Menu */}
                  <HamburgerMenu 
                    title="Menu" 
                    triggerClassName="h-8 w-8 p-0 bg-white/15 hover:bg-white/25 border-white/25 text-white shadow-sm"
                    appName="Availability Planner"
                    teamName={teamName}
                  >
                    {/* Edit Mode Toggle */}
                    <HamburgerMenuItem>
                      <div className="flex items-center justify-between w-full">
                        <span>Edit Mode</span>
                        <Switch 
                          checked={editMode} 
                          onCheckedChange={handleEditModeToggle}
                          className="scale-90"
                        />
                      </div>
                    </HamburgerMenuItem>
                    
                    {/* View Options */}
                    <HamburgerMenuItem onClick={() => setWeeksToShow(1)}>
                      <span className={weeksToShow === 1 ? "font-semibold" : ""}>1 Week</span>
                    </HamburgerMenuItem>
                    <HamburgerMenuItem onClick={() => setWeeksToShow(2)}>
                      <span className={weeksToShow === 2 ? "font-semibold" : ""}>2 Weeks</span>
                    </HamburgerMenuItem>
                    <HamburgerMenuItem onClick={() => setWeeksToShow(4)}>
                      <span className={weeksToShow === 4 ? "font-semibold" : ""}>4 Weeks</span>
                    </HamburgerMenuItem>
                    
                    {/* Analytics & Planning */}
                    <HamburgerMenuItem>
                      <AnalyticsButton 
                        members={activeMembersForAnalytics} 
                        locale={locale} 
                        weeksToShow={weeksToShow}
                        currentDate={currentDate}
                        teamId={teamId}
                      />
                    </HamburgerMenuItem>
                    <HamburgerMenuItem>
                      <PlannerButton 
                        members={visibleMembers} 
                        locale={locale} 
                        teamId={teamId}
                      />
                    </HamburgerMenuItem>
                    
                    {/* Edit Actions (only in edit mode) */}
                    {editMode && (
                      <>
                        <HamburgerMenuItem>
                          <BulkUpdateDialog 
                            members={members} 
                            locale={locale} 
                            onUpdate={fetchAvailability} 
                            onRangeSelectionChange={handleRangeSelectionChange}
                          />
                        </HamburgerMenuItem>
                        <HamburgerMenuItem>
                          <MemberForm teamId={teamId} locale={locale} onMemberAdded={onMembersUpdate} />
                        </HamburgerMenuItem>
                      </>
                    )}
                    
                    {/* Settings */}
                    <HamburgerMenuItem onClick={() => router.push(`/team/${team?.slug || teamId}/settings`)}>
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </div>
                    </HamburgerMenuItem>
                    
                    {/* Date Navigation */}
                    <HamburgerMenuItem onClick={() => navigateDate("prev")}>
                      <div className="flex items-center gap-2">
                        <ChevronLeft className="h-4 w-4" />
                        <span>Previous Week</span>
                      </div>
                    </HamburgerMenuItem>
                    <HamburgerMenuItem onClick={() => navigateDate("next")}>
                      <div className="flex items-center gap-2">
                        <ChevronRight className="h-4 w-4" />
                        <span>Next Week</span>
                      </div>
                    </HamburgerMenuItem>
                    
                    {/* Quick Actions */}
                    <HamburgerMenuItem onClick={goToToday}>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Today</span>
                      </div>
                    </HamburgerMenuItem>
                    <HamburgerMenuItem onClick={() => setShowDatePicker(true)}>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Go to Date</span>
                      </div>
                    </HamburgerMenuItem>
                    <HamburgerMenuItem onClick={() => setShowKeyboardHelp(true)}>
                      <div className="flex items-center gap-2">
                        <Keyboard className="h-4 w-4" />
                        <span>Shortcuts</span>
                      </div>
                    </HamburgerMenuItem>
                  </HamburgerMenu>
                </div>
              </div>
            </div>
          </div>

          {/* Date Navigation - Compact Integration */}
          <div className="xl:bg-black/10 xl:backdrop-blur-sm xl:border-t xl:border-white/10">
            <div className="px-3 lg:px-6 py-1 xl:py-2">
              {/* Desktop: Full layout, Mobile/Tablet: Ultra compact */}
              <div className="flex items-center justify-center xl:justify-between gap-1 xl:gap-3">
                <div className="flex items-center gap-2 xl:gap-2">
                  <div className="w-4 h-4 xl:w-6 xl:h-6 bg-white/25 backdrop-blur-sm rounded flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Calendar className="h-2.5 w-2.5 xl:h-3 xl:w-3 text-white" />
                  </div>
                  <span className="font-semibold text-xs xl:text-sm text-white xl:text-white">{formatDateRange()}</span>
                    <Button
                    variant="outline"
                    size="sm"
                    onClick={goToToday}
                    className={`text-xs font-semibold rounded-full px-2 xl:px-2 py-0.5 xl:py-1 h-5 xl:h-6 shadow-sm ${themeClasses.button}`}
                  >
                    {t("calendar.today")}
                  </Button>
                </div>

                <div className="hidden xl:flex items-center gap-1 w-full sm:w-auto justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigateDate("prev")} 
                    className={`rounded-md h-7 w-7 p-0 ${themeClasses.button}`}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigateDate("next")} 
                    className={`rounded-md h-7 w-7 p-0 ${themeClasses.button}`}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
                
                {/* Mobile: Integrated navigation buttons in hamburger menu */}
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Grid with Swipe Support */}
        <div ref={swipeRef} className={cn(
          "p-4 sm:p-6 touch-pan-y overflow-y-auto transition-transform duration-300 relative",
          swipeDirection === "left" && "transform -translate-x-2",
          swipeDirection === "right" && "transform translate-x-2"
        )}>
          {/* Swipe Indicators */}
          {isMobile && (
            <>
              {/* Left swipe indicator (next week) */}
              <div className={cn(
                "absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-blue-600 text-white rounded-full p-2 shadow-lg transition-all duration-300",
                swipeDirection === "left" ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
              )}>
                <ChevronRight className="h-4 w-4" />
              </div>
              
              {/* Right swipe indicator (previous week) */}
              <div className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-blue-600 text-white rounded-full p-2 shadow-lg transition-all duration-300",
                swipeDirection === "right" ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
              )}>
                <ChevronLeft className="h-4 w-4" />
              </div>
            </>
          )}
          
          {isLoading ? (
            <div className="text-center py-12">
              <div className={`inline-flex items-center gap-3 ${themeClasses.card} rounded-lg px-6 py-4 shadow-sm`}>
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
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {versionLoading ? "..." : version || "Git not available"}
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
