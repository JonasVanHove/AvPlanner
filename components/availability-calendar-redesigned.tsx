"use client"

import { useState, useEffect } from "react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ChevronLeft, ChevronRight, Calendar, MoreHorizontal, ChevronDown } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { supabase } from "@/lib/supabase"
import { useTranslation, type Locale } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { MemberForm } from "./member-form"
import { BulkUpdateDialog } from "./bulk-update-dialog"
import { SettingsDialog } from "./settings-dialog"
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

const statusConfig = {
  available: { icon: "🟢", color: "bg-green-100 border-green-300", label: "Beschikbaar" },
  unavailable: { icon: "🔴", color: "bg-red-100 border-red-300", label: "Niet beschikbaar" },
  need_to_check: { icon: "🔵", color: "bg-blue-100 border-blue-300", label: "Moet nakijken" },
  absent: { icon: "⚫", color: "bg-gray-100 border-gray-300", label: "Afwezig" },
  holiday: { icon: "🟡", color: "bg-yellow-100 border-yellow-300", label: "Vakantie" },
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
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  return new Date(d.setDate(diff))
}

// Helper function to get all weeks in a month
const getWeeksInMonth = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const weeks = []
  const currentWeekStart = getMondayOfWeek(firstDay)

  while (currentWeekStart <= lastDay) {
    const weekDays = []
    const weekNumber = getISOWeekNumber(currentWeekStart)

    for (let i = 0; i < 7; i++) {
      const day = new Date(currentWeekStart)
      day.setDate(currentWeekStart.getDate() + i)
      weekDays.push(day)
    }

    weeks.push({
      weekNumber,
      days: weekDays,
      startsInMonth: currentWeekStart.getMonth() === month,
      endsInMonth: weekDays[6].getMonth() === month,
    })

    currentWeekStart.setDate(currentWeekStart.getDate() + 7)
  }

  return weeks
}

export function AvailabilityCalendarRedesigned({
  teamId,
  teamName,
  members,
  locale,
  onMembersUpdate,
}: AvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [availability, setAvailability] = useState<Availability[]>([])
  const [viewMode, setViewMode] = useState<"week">("week")
  const [weeksToShow, setWeeksToShow] = useState<1 | 2 | 4 | 8>(1)
  const [isLoading, setIsLoading] = useState(false)
  const { t } = useTranslation(locale)

  const dutchDayNames = ["MA", "DI", "WO", "DO", "VR", "ZA", "ZO"]
  const dutchMonthNames = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEC"]

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
    try {
      const { error } = await supabase.from("availability").upsert([{ member_id: memberId, date, status }], {
        onConflict: "member_id,date",
        returning: "minimal",
      })

      if (error) throw error
      fetchAvailability()
    } catch (error) {
      console.error("Error updating availability:", error)
    }
  }

  const deleteMember = async (memberId: string) => {
    try {
      const { error } = await supabase.from("members").delete().eq("id", memberId)
      if (error) throw error
      onMembersUpdate()
    } catch (error) {
      console.error("Error deleting member:", error)
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

  // Helper function to render member availability for a specific date
  const renderMemberAvailability = (date: Date, maxVisible: number, showNames = false) => {
    const dayAvailability = availability.filter((a) => a.date === date.toISOString().split("T")[0])

    // Group members by status and include all members (even those without availability)
    const membersByStatus = {
      available: [] as (Member & { hasAvailability: boolean })[],
      unavailable: [] as (Member & { hasAvailability: boolean })[],
      need_to_check: [] as (Member & { hasAvailability: boolean })[],
      absent: [] as (Member & { hasAvailability: boolean })[],
      holiday: [] as (Member & { hasAvailability: boolean })[],
      no_status: [] as (Member & { hasAvailability: boolean })[], // Members without availability set
    }

    members.forEach((member) => {
      const memberAvailability = dayAvailability.find((a) => a.member_id === member.id)
      if (memberAvailability) {
        membersByStatus[memberAvailability.status].push({ ...member, hasAvailability: true })
      } else {
        // Member has no availability set for this date
        membersByStatus.no_status.push({ ...member, hasAvailability: false })
      }
    })

    // Flatten all members with their status
    const allMembersWithStatus = [
      ...membersByStatus.available.map((m) => ({ ...m, status: "available" as const })),
      ...membersByStatus.unavailable.map((m) => ({ ...m, status: "unavailable" as const })),
      ...membersByStatus.need_to_check.map((m) => ({ ...m, status: "need_to_check" as const })),
      ...membersByStatus.absent.map((m) => ({ ...m, status: "absent" as const })),
      ...membersByStatus.holiday.map((m) => ({ ...m, status: "holiday" as const })),
      ...membersByStatus.no_status.map((m) => ({ ...m, status: "no_status" as const })),
    ]

    const visibleMembers = allMembersWithStatus.slice(0, maxVisible)
    const hiddenCount = allMembersWithStatus.length - maxVisible

    return (
      <div className="flex-1 overflow-hidden">
        <div className={cn("flex flex-wrap gap-0.5", showNames ? "space-y-0.5" : "")}>
          {visibleMembers.map((member) => (
            <Tooltip key={`${member.id}-${member.status}`}>
              <TooltipTrigger asChild>
                <div className={cn("flex items-center", showNames ? "gap-1 w-full" : "")}>
                  <div className="relative">
                    <MemberAvatar
                      firstName={member.first_name}
                      lastName={member.last_name}
                      profileImage={member.profile_image}
                      size="sm"
                      className={cn(
                        "flex-shrink-0",
                        viewMode === "year" ? "h-4 w-4 text-xs" : "h-6 w-6 text-xs",
                        member.status !== "no_status" && statusConfig[member.status]?.color,
                      )}
                    />
                    {member.status !== "no_status" && (
                      <div className="absolute -bottom-0.5 -right-0.5 text-xs leading-none">
                        {statusConfig[member.status].icon}
                      </div>
                    )}
                  </div>
                  {showNames && (
                    <span className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">
                      {member.first_name}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-medium">
                    {member.first_name} {member.last_name}
                  </div>
                  <div className="text-sm">{date.toLocaleDateString("nl-NL")}</div>
                  <div className="text-sm">
                    {member.status === "no_status" ? "Geen status ingesteld" : statusConfig[member.status].label}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        {hiddenCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">+{hiddenCount} meer</div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="max-w-xs">
                <div className="font-medium mb-1">Overige teamleden:</div>
                {allMembersWithStatus.slice(maxVisible).map((member) => (
                  <div key={member.id} className="text-sm">
                    {member.first_name} {member.last_name} -{" "}
                    {member.status === "no_status" ? "Geen status" : statusConfig[member.status].label}
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    )
  }

  const renderMultiWeekView = () => {
    const weeks = getMultipleWeeksDays()
    const totalColumns = 1 + weeksToShow * 7 // 1 voor member naam + 7 dagen per week

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div
          className={`grid border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700`}
          style={{ gridTemplateColumns: `200px repeat(${weeksToShow * 7}, 1fr)` }}
        >
          <div className="p-3 border-r dark:border-gray-600">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Teamlid</span>
          </div>
          {weeks.map((week) => (
            <React.Fragment key={week.weekNumber}>
              {week.days.map((date, dayIndex) => (
                <div
                  key={`${week.weekNumber}-${dayIndex}`}
                  className={cn(
                    "p-2 text-center border-r dark:border-gray-600",
                    dayIndex === 6 && "border-r-2 border-gray-300 dark:border-gray-500",
                    isToday(date) && "bg-blue-100 dark:bg-blue-900",
                  )}
                >
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                    {dayIndex === 0 && `W${week.weekNumber}`}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">{dutchDayNames[dayIndex]}</div>
                  <div
                    className={cn(
                      "text-sm font-semibold",
                      isToday(date) ? "text-blue-600 dark:text-blue-300" : "text-gray-900 dark:text-white",
                    )}
                  >
                    {date.getDate()}
                  </div>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>

        {/* Member Rows */}
        {members.map((member, memberIndex) => (
          <div
            key={member.id}
            className={cn(
              "grid border-b dark:border-gray-700 last:border-b-0",
              memberIndex % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-750",
            )}
            style={{ gridTemplateColumns: `200px repeat(${weeksToShow * 7}, 1fr)` }}
          >
            <div className="p-3 border-r dark:border-gray-600 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MemberAvatar
                  firstName={member.first_name}
                  lastName={member.last_name}
                  profileImage={member.profile_image}
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {member.first_name} {member.last_name}
                  </div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <MemberForm
                    teamId={teamId}
                    locale={locale}
                    onMemberAdded={onMembersUpdate}
                    member={member}
                    mode="edit"
                  />
                  <DropdownMenuItem onClick={() => deleteMember(member.id)} className="text-red-600">
                    Verwijderen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {weeks.map((week) => (
              <React.Fragment key={`${member.id}-${week.weekNumber}`}>
                {week.days.map((date, dayIndex) => {
                  const availability = getAvailabilityForDate(member.id, date)
                  const isWeekendDay = isWeekend(date)
                  const isTodayCell = isToday(date)

                  return (
                    <div
                      key={`${member.id}-${week.weekNumber}-${dayIndex}`}
                      className={cn(
                        "p-2 border-r dark:border-gray-600 relative",
                        dayIndex === 6 && "border-r-2 border-gray-300 dark:border-gray-500",
                        isTodayCell && "bg-blue-50 dark:bg-blue-900/20",
                      )}
                    >
                      {isWeekendDay ? (
                        <div className="h-8 flex items-center justify-center text-gray-400">
                          <span className="text-sm">×</span>
                        </div>
                      ) : (
                        <div className="h-8 flex items-center gap-1">
                          {/* Click to cycle functionality */}
                          <button
                            className={cn(
                              "flex-1 h-full rounded text-xs font-medium transition-colors border",
                              availability
                                ? statusConfig[availability.status].color
                                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700",
                            )}
                            onClick={() => {
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
                          {/* Dropdown functionality */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-4 p-0">
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {Object.entries(statusConfig).map(([status, config]) => (
                                <DropdownMenuItem
                                  key={status}
                                  onClick={() =>
                                    updateAvailability(
                                      member.id,
                                      date.toISOString().split("T")[0],
                                      status as Availability["status"],
                                    )
                                  }
                                >
                                  <div className="flex items-center gap-2">
                                    <span>{config.icon}</span>
                                    <span>{config.label}</span>
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
              </React.Fragment>
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <Calendar className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{teamName}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">{members.length} teamleden</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <Button
                  variant={weeksToShow === 1 ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setWeeksToShow(1)}
                  className="text-xs px-2 sm:px-3"
                >
                  1 Week
                </Button>
                <Button
                  variant={weeksToShow === 2 ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setWeeksToShow(2)}
                  className="text-xs px-2 sm:px-3"
                >
                  2 Weken
                </Button>
                <Button
                  variant={weeksToShow === 4 ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setWeeksToShow(4)}
                  className="text-xs px-2 sm:px-3"
                >
                  4 Weken
                </Button>
                <Button
                  variant={weeksToShow === 8 ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setWeeksToShow(8)}
                  className="text-xs px-2 sm:px-3"
                >
                  8 Weken
                </Button>
              </div>

              <BulkUpdateDialog members={members} locale={locale} onUpdate={fetchAvailability} />

              <MemberForm teamId={teamId} locale={locale} onMemberAdded={onMembersUpdate} />

              <SettingsDialog currentLocale={locale} members={members} />
            </div>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="font-medium dark:text-white">{formatDateRange()}</span>
                <span className="text-sm text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded">
                  {t("calendar.today")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateDate("prev")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateDate("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8 dark:text-white">{t("common.loading")}</div>
          ) : (
            renderMultiWeekView()
          )}
        </div>

        {/* Footer */}
        <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
          Developed with {"<3"} by Jonas Van Hove
        </div>
      </div>
    </TooltipProvider>
  )
}
