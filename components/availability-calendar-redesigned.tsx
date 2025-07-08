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
  Edit3,
  Lock,
  Mail,
  MessageSquare,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { supabase } from "@/lib/supabase"
import { useTranslation, type Locale } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { MemberForm } from "./member-form"
import { BulkUpdateDialog } from "./bulk-update-dialog"
import { SettingsDropdown } from "./settings-dropdown"
import { MemberAvatar } from "./member-avatar"

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
  status: "available" | "unavailable" | "need_to_check" | "absent" | "holiday"
}

interface AvailabilityCalendarProps {
  teamId: string
  teamName: string
  members: Member[]
  locale: Locale
  onMembersUpdate: () => void
}

const AvailabilityCalendarRedesigned = ({
  teamId,
  teamName,
  members,
  locale,
  onMembersUpdate,
}: AvailabilityCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [availability, setAvailability] = useState<Availability[]>([])
  const [viewMode, setViewMode] = useState<"week">("week")
  const [weeksToShow, setWeeksToShow] = useState<1 | 2 | 4 | 8>(1)
  const [isLoading, setIsLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const { t } = useTranslation(locale)

  const dutchDayNames = ["MA", "DI", "WO", "DO", "VR", "ZA", "ZO"]
  const dutchMonthNames = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEC"]

  const statusConfig = {
    available: {
      icon: "🟢",
      color: "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700/50",
      label: "Available",
      textColor: "text-green-700 dark:text-green-300",
    },
    unavailable: {
      icon: "🔴",
      color: "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700/50",
      label: "Unavailable",
      textColor: "text-red-700 dark:text-red-300",
    },
    need_to_check: {
      icon: "🔵",
      color: "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700/50",
      label: "Need to Check",
      textColor: "text-blue-700 dark:text-blue-300",
    },
    absent: {
      icon: "⚫",
      color: "bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-600/50",
      label: "Absent",
      textColor: "text-gray-700 dark:text-gray-300",
    },
    holiday: {
      icon: "🟡",
      color: "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700/50",
      label: "Holiday",
      textColor: "text-yellow-700 dark:text-yellow-300",
    },
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

  const updateAvailability = async (
    memberId: string,
    date: string,
    status: "available" | "unavailable" | "need_to_check" | "absent" | "holiday",
  ) => {
    if (!editMode) return

    try {
      const { error } = await supabase.from("availability").upsert([{ member_id: memberId, date, status }], {
        onConflict: "member_id,date",
        returning: "minimal",
      })

      if (error) throw error
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

  const getAvailabilityForDate = (memberId: string, date: Date) => {
    const dateString = date.toISOString().split("T")[0]
    return availability.find((a) => a.member_id === memberId && a.date === dateString)
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
      <div className="space-y-6">
        {weeks.map((week, weekIndex) => (
          <div
            key={weekIndex}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
          >
            {/* Week Header - More subtle */}
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Week {week.weekNumber}</h3>
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
                        {dutchDayNames[index]}
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
                        <div className="relative flex-shrink-0">
                          <MemberAvatar
                            firstName={member.first_name}
                            lastName={member.last_name}
                            profileImage={member.profile_image}
                            size="md"
                            className="ring-1 ring-gray-200 dark:ring-gray-600"
                          />
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-gray-800"></div>
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
                                    ? statusConfig[availability.status].color
                                    : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600",
                                  editMode && !availability && "hover:bg-gray-100 dark:hover:bg-gray-600",
                                )}
                                onClick={() => {
                                  if (!editMode) return
                                  const current = availability
                                  const statuses: Availability["status"][] = [
                                    "available",
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
                                {availability ? statusConfig[availability.status].icon : ""}
                              </button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                      "h-8 w-6 p-0 rounded-md flex-shrink-0",
                                      editMode
                                        ? "hover:bg-gray-100 dark:hover:bg-gray-600"
                                        : "opacity-50 cursor-not-allowed",
                                    )}
                                    disabled={!editMode}
                                  >
                                    <ChevronDown className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                                >
                                  {Object.entries(statusConfig).map(([status, config]) => (
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
                                      </div>
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
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
        {/* Header - More subtle */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="px-6 py-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Availability Planner</h1>
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-300">{teamName}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{members.length} Team Members</p>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <Button
                    variant={weeksToShow === 1 ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setWeeksToShow(1)}
                    className={cn(
                      "text-xs px-3 py-2 rounded-md font-medium",
                      weeksToShow === 1
                        ? "bg-blue-600 text-white shadow-sm"
                        : "hover:bg-gray-200 dark:hover:bg-gray-600",
                    )}
                  >
                    1 Week
                  </Button>
                  <Button
                    variant={weeksToShow === 2 ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setWeeksToShow(2)}
                    className={cn(
                      "text-xs px-3 py-2 rounded-md font-medium",
                      weeksToShow === 2
                        ? "bg-blue-600 text-white shadow-sm"
                        : "hover:bg-gray-200 dark:hover:bg-gray-600",
                    )}
                  >
                    2 Weeks
                  </Button>
                  <Button
                    variant={weeksToShow === 4 ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setWeeksToShow(4)}
                    className={cn(
                      "text-xs px-3 py-2 rounded-md font-medium",
                      weeksToShow === 4
                        ? "bg-blue-600 text-white shadow-sm"
                        : "hover:bg-gray-200 dark:hover:bg-gray-600",
                    )}
                  >
                    4 Weeks
                  </Button>
                  <Button
                    variant={weeksToShow === 8 ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setWeeksToShow(8)}
                    className={cn(
                      "text-xs px-3 py-2 rounded-md font-medium",
                      weeksToShow === 8
                        ? "bg-blue-600 text-white shadow-sm"
                        : "hover:bg-gray-200 dark:hover:bg-gray-600",
                    )}
                  >
                    8 Weeks
                  </Button>
                </div>

                {editMode && (
                  <>
                    <BulkUpdateDialog members={members} locale={locale} onUpdate={fetchAvailability} />
                    <MemberForm teamId={teamId} locale={locale} onMemberAdded={onMembersUpdate} />
                  </>
                )}

                {/* Edit Mode Toggle - More subtle */}
                <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-md",
                      editMode
                        ? "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300"
                        : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300",
                    )}
                  >
                    {editMode ? <Edit3 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    <span className="text-sm font-medium">{editMode ? "Edit Mode" : "View Mode"}</span>
                  </div>
                  <Switch checked={editMode} onCheckedChange={setEditMode} />
                </div>

                <SettingsDropdown currentLocale={locale} members={members} />
              </div>
            </div>
          </div>
        </div>

        {/* Date Navigation - More subtle */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-semibold text-lg text-gray-900 dark:text-white">{formatDateRange()}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToToday}
                    className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-800/50 font-medium rounded-full px-3 py-1"
                  >
                    Today
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigateDate("prev")} className="rounded-md">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateDate("next")} className="rounded-md">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-6">
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
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            {Object.entries(statusConfig).map(([status, config]) => (
              <div key={status} className="flex items-center gap-1">
                <span>{config.icon}</span>
                <span>{config.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Developed with <span className="text-red-500">♥</span> by Jonas Van Hove
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

export { AvailabilityCalendarRedesigned }
