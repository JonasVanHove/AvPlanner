"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { useTranslation, type Locale } from "@/lib/i18n"
import { Download } from "lucide-react"

interface Member {
  id: string
  first_name: string
  last_name: string
  email?: string
}

interface ExportDialogProps {
  members: Member[]
  locale: Locale
}

export function ExportDialog({ members, locale }: ExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [format, setFormat] = useState<"csv" | "json">("csv")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { t } = useTranslation(locale)

  const exportData = async () => {
    if (!startDate || !endDate || members.length === 0) return

    setIsLoading(true)
    try {
      const { data: availability, error } = await supabase
        .from("availability")
        .select("*")
        .in(
          "member_id",
          members.map((m) => m.id),
        )
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true })

      if (error) throw error

      // Combine member data with availability
      const exportData = availability?.map((avail) => {
        const member = members.find((m) => m.id === avail.member_id)
        return {
          date: avail.date,
          member_name: `${member?.first_name} ${member?.last_name}`,
          email: member?.email || "",
          status: avail.status,
        }
      })

      if (format === "csv") {
        downloadCSV(exportData || [])
      } else {
        downloadJSON(exportData || [])
      }

      setIsOpen(false)
    } catch (error) {
      console.error("Error exporting data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const downloadCSV = (data: any[]) => {
    const headers = ["Date", "Member Name", "Email", "Status"]
    const csvContent = [
      headers.join(","),
      ...data.map((row) => [row.date, `"${row.member_name}"`, row.email, row.status].join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `availability_${startDate}_${endDate}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadJSON = (data: any[]) => {
    const jsonContent = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `availability_${startDate}_${endDate}.json`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          {t("settings.exportAvailability")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("export.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t("export.format")}</Label>
            <Select value={format} onValueChange={(value: "csv" | "json") => setFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="startDate">Start Datum</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="endDate">Eind Datum</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={exportData} disabled={isLoading || !startDate || !endDate}>
              {isLoading ? t("common.loading") : t("export.download")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
