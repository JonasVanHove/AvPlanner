"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useTranslation, type Locale } from "@/lib/i18n"
import { cn } from "@/lib/utils"

interface Member {
  id: string
  name: string
}

interface Availability {
  member_id: string
  date: string
  status: "available" | "maybe" | "unavailable" | "holiday" | "remote"
}

interface AvailabilityCalendarProps {
  teamId: string
  members: Member[]
  locale: Locale
}

const statusColors = {
  available: "bg-green-500",
  remote: "bg-purple-500",
  maybe: "bg-orange-500",
  unavailable: "bg-red-500",
  holiday: "bg-yellow-500",
}

export function AvailabilityCalendar({ teamId, members, locale }: AvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [availability, setAvailability] = useState<Availability[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { t } = useTranslation(locale)

  const monthNames = [
    t("month.january"),
    t("month.february"),
    t("month.march"),
    t("month.april"),
    t("month.may"),
    t("month.june"),
    t("month.july"),
    t("month.august"),
    t("month.september"),
    t("month.october"),
    t("month.november"),
    t("month.december"),
  ]

  const dayNames = [
    t("day.sunday"),
    t("day.monday"),
    t("day.tuesday"),
    t("day.wednesday"),
    t("day.thursday"),
    t("day.friday"),
    t("day.saturday"),
  ]

  useEffect(() => {
    fetchAvailability()
  }, [currentDate, members])

  const fetchAvailability = async () => {
    if (members.length === 0) return

    setIsLoading(true)
    try {
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

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

  const updateAvailability = async (memberId: string, date: string, status: Availability["status"]) => {
    try {
      const { error } = await supabase.from("availability").upsert([{ member_id: memberId, date, status }])

      if (error) throw error
      fetchAvailability()
    } catch (error) {
      console.error("Error updating availability:", error)
    }
  }

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const getAvailabilityForDate = (memberId: string, date: Date) => {
    const dateString = date.toISOString().split("T")[0]
    return availability.find((a) => a.member_id === memberId && a.date === dateString)
  }

  const isWeekend = (date: Date) => {
    const day = date.getDay()
    return day === 0 || day === 6
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const days = getDaysInMonth()

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("calendar.title")}</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">{t("calendar.prevMonth")}</span>
              </Button>
              <span className="text-lg font-semibold min-w-[200px] text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">{t("calendar.nextMonth")}</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t("common.loading")}</div>
          ) : (
            <div className="space-y-4">
              {/* Legend */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span>{t("status.available")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded"></div>
                  <span>{t("status.maybe")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span>{t("status.unavailable")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span>{t("status.holiday")}</span>
                </div>
              </div>

              {/* Calendar Header */}
              <div className="grid grid-cols-8 gap-1 text-sm font-medium text-center">
                <div></div>
                {dayNames.map((day) => (
                  <div key={day} className="p-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="space-y-1">
                {members.map((member) => (
                  <div key={member.id} className="grid grid-cols-8 gap-1">
                    <div className="p-2 text-sm font-medium truncate" title={member.name}>
                      {member.name}
                    </div>
                    {days.map((date, index) => (
                      <div key={index} className="aspect-square">
                        {date ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className={cn(
                                  "w-full h-full rounded border text-xs flex items-center justify-center transition-colors",
                                  isWeekend(date)
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : "hover:bg-gray-50 cursor-pointer",
                                  getAvailabilityForDate(member.id, date) && !isWeekend(date)
                                    ? statusColors[getAvailabilityForDate(member.id, date)!.status]
                                    : "",
                                )}
                                disabled={isWeekend(date)}
                                onClick={() => {
                                  if (isWeekend(date)) return
                                  const current = getAvailabilityForDate(member.id, date)
                                  const statuses: Availability["status"][] = [
                                    "available",
                                    "remote",
                                    "maybe",
                                    "unavailable",
                                    "holiday",
                                  ]
                                  const currentIndex = current ? statuses.indexOf(current.status) : -1
                                  const nextStatus = statuses[(currentIndex + 1) % statuses.length]
                                  updateAvailability(member.id, date.toISOString().split("T")[0], nextStatus)
                                }}
                              >
                                {date.getDate()}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-center">
                                <div className="font-medium">{member.name}</div>
                                <div className="text-sm">{date.toLocaleDateString(locale)}</div>
                                <div className="text-sm">
                                  {getAvailabilityForDate(member.id, date)
                                    ? t(`status.${getAvailabilityForDate(member.id, date)!.status}` as any)
                                    : t("status.unavailable")}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <div></div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
