"use client"

import { useState } from "react"
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
import { CalendarIcon, Users } from "lucide-react"
import { format } from "date-fns"
import { nl } from "date-fns/locale"
import { supabase } from "@/lib/supabase"
import { useTranslation, type Locale } from "@/lib/i18n"
import { MemberAvatar } from "./member-avatar"

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

export function BulkUpdateDialog({ members, locale, onUpdate }: BulkUpdateDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [selectedStatus, setSelectedStatus] = useState<
    "available" | "unavailable" | "need_to_check" | "absent" | "holiday"
  >("available")
  const [isUpdating, setIsUpdating] = useState(false)
  const { t } = useTranslation(locale)

  const statusOptions = [
    { value: "available", label: t("status.available"), icon: "🟢" },
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-lg bg-transparent">
          <Users className="h-4 w-4 mr-2" />
          {t("bulk.title")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-white dark:bg-gray-800 max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">{t("bulk.title")}</DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">
            {t("bulk.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Member Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-900 dark:text-white">
                {t("bulk.selectMembers")} ({selectedMembers.length}/{members.length})
              </Label>
              <Button variant="outline" size="sm" onClick={handleSelectAllMembers} className="text-xs bg-transparent">
                {selectedMembers.length === members.length ? t("bulk.deselectAll") : t("bulk.selectAll")}
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              {members.map((member) => (
                <div key={member.id} className="flex items-center space-x-3">
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
                  />
                  <Label htmlFor={member.id} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer flex-1">
                    {member.first_name} {member.last_name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Date Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-900 dark:text-white">
              {t("bulk.selectDates")} ({selectedDates.length} {t("bulk.selected")})
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDates.length > 0
                    ? `${selectedDates.length} ${t("bulk.datesSelected")}`
                    : t("bulk.selectDates")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={(dates) => setSelectedDates(dates || [])}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {selectedDates.length > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 max-h-20 overflow-y-auto">
                {selectedDates
                  .sort((a, b) => a.getTime() - b.getTime())
                  .map((date) => format(date, "dd-MM-yyyy", { locale: nl }))
                  .join(", ")}
              </div>
            )}
          </div>

          {/* Status Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-900 dark:text-white">{t("bulk.selectStatus")}</Label>
            <div className="grid grid-cols-1 gap-2">
              {statusOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
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
                    className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer flex items-center gap-2"
                  >
                    <span className="text-lg">{option.icon}</span>
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="text-gray-700 dark:text-gray-300">
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleBulkUpdate}
            disabled={isUpdating || selectedMembers.length === 0 || selectedDates.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isUpdating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                {t("bulk.updating")}
              </>
            ) : (
              `${selectedMembers.length * selectedDates.length} ${t("bulk.itemsToUpdate")}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
