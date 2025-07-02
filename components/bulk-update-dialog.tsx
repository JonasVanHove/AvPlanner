"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"
import { useTranslation, type Locale } from "@/lib/i18n"

interface Member {
  id: string
  first_name: string
  last_name: string
  email?: string
}

interface BulkUpdateDialogProps {
  members: Member[]
  locale: Locale
  onUpdate: () => void
}

type AvailabilityStatus = "available" | "unavailable" | "need_to_check" | "absent" | "holiday"

export function BulkUpdateDialog({ members, locale, onUpdate }: BulkUpdateDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [status, setStatus] = useState<AvailabilityStatus>("available")
  const [isLoading, setIsLoading] = useState(false)
  const { t } = useTranslation(locale)

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers((prev) => (prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]))
  }

  const handleSelectAll = () => {
    if (selectedMembers.length === members.length) {
      setSelectedMembers([])
    } else {
      setSelectedMembers(members.map((m) => m.id))
    }
  }

  const applyBulkUpdate = async () => {
    if (!startDate || !endDate || selectedMembers.length === 0) return

    setIsLoading(true)
    try {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const updates = []

      // Generate all dates in range
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        // Skip weekends
        if (d.getDay() === 0 || d.getDay() === 6) continue

        for (const memberId of selectedMembers) {
          updates.push({
            member_id: memberId,
            date: d.toISOString().split("T")[0],
            status,
          })
        }
      }

      const { error } = await supabase.from("availability").upsert(updates, {
        onConflict: "member_id,date", // ← tell Supabase which composite key to target
        returning: "minimal", // optional: keeps payload small
      })

      if (error) throw error

      setIsOpen(false)
      setSelectedMembers([])
      setStartDate("")
      setEndDate("")
      onUpdate()
    } catch (error) {
      console.error("Error applying bulk update:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-purple-600 text-white hover:bg-purple-700">
          {t("bulk.title")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("bulk.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Member Selection */}
          <div>
            <Label className="text-sm font-medium">{t("bulk.selectMembers")}</Label>
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border rounded p-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectedMembers.length === members.length}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all" className="text-sm font-medium">
                  Selecteer Alles
                </Label>
              </div>
              {members.map((member) => (
                <div key={member.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={member.id}
                    checked={selectedMembers.includes(member.id)}
                    onCheckedChange={() => handleMemberToggle(member.id)}
                  />
                  <Label htmlFor={member.id} className="text-sm">
                    {member.first_name} {member.last_name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="startDate">{t("bulk.startDate")}</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="endDate">{t("bulk.endDate")}</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <Label>{t("bulk.selectStatus")}</Label>
            <Select value={status} onValueChange={(value: AvailabilityStatus) => setStatus(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">{t("status.available")}</SelectItem>
                <SelectItem value="unavailable">{t("status.unavailable")}</SelectItem>
                <SelectItem value="need_to_check">{t("status.need_to_check")}</SelectItem>
                <SelectItem value="absent">{t("status.absent")}</SelectItem>
                <SelectItem value="holiday">{t("status.holiday")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={applyBulkUpdate}
              disabled={isLoading || !startDate || !endDate || selectedMembers.length === 0}
            >
              {isLoading ? t("common.loading") : t("bulk.apply")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
