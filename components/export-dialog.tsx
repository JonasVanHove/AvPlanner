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
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Download } from "lucide-react"
import { format } from "date-fns"
import { nl } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

interface Member {
  id: string
  first_name: string
  last_name: string
  email?: string
  profile_image?: string
}

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  members: Member[]
}

export function ExportDialog({ open, onOpenChange, members }: ExportDialogProps) {
  const [exportFormat, setExportFormat] = useState<"excel" | "csv" | "json">("excel")
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({
    from: new Date(),
    to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
  })
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (!dateRange.from || !dateRange.to) {
      alert("Selecteer een datumbereik.")
      return
    }

    setIsExporting(true)
    try {
      // Fetch availability data for the selected date range
      const { data: availabilityData, error } = await supabase
        .from("availability")
        .select("*")
        .in(
          "member_id",
          members.map((m) => m.id),
        )
        .gte("date", dateRange.from.toISOString().split("T")[0])
        .lte("date", dateRange.to.toISOString().split("T")[0])

      if (error) throw error

      // Prepare export data
      const exportData = []
      const startDate = new Date(dateRange.from)
      const endDate = new Date(dateRange.to)

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateString = d.toISOString().split("T")[0]

        members.forEach((member) => {
          const availability = availabilityData?.find((a) => a.member_id === member.id && a.date === dateString)

          exportData.push({
            Date: format(d, "dd-MM-yyyy", { locale: nl }),
            "First Name": member.first_name,
            "Last Name": member.last_name,
            Email: member.email || "",
            Status: availability?.status || "not_set",
          })
        })
      }

      // Export based on format
      if (exportFormat === "json") {
        const jsonString = JSON.stringify(exportData, null, 2)
        downloadFile(jsonString, "availability-export.json", "application/json")
      } else if (exportFormat === "csv") {
        const csvContent = convertToCSV(exportData)
        downloadFile(csvContent, "availability-export.csv", "text/csv")
      } else if (exportFormat === "excel") {
        // For Excel, we'll create a CSV that can be opened in Excel
        const csvContent = convertToCSV(exportData)
        downloadFile(
          csvContent,
          "availability-export.xlsx",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
      }

      onOpenChange(false)
    } catch (error) {
      console.error("Export error:", error)
      alert("Er is een fout opgetreden bij het exporteren.")
    } finally {
      setIsExporting(false)
    }
  }

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return ""

    const headers = Object.keys(data[0])
    const csvRows = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header]
            return typeof value === "string" && value.includes(",") ? `"${value}"` : value
          })
          .join(","),
      ),
    ]

    return csvRows.join("\n")
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">Beschikbaarheid exporteren</DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">
            Kies het formaat en datumbereik voor de export.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-900 dark:text-white">Export formaat</Label>
            <RadioGroup value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="excel" />
                <Label htmlFor="excel" className="text-gray-700 dark:text-gray-300">
                  Excel (.xlsx)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="text-gray-700 dark:text-gray-300">
                  CSV (.csv)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json" className="text-gray-700 dark:text-gray-300">
                  JSON (.json)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-900 dark:text-white">Datumbereik</Label>
            <div className="grid grid-cols-2 gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, "dd-MM-yyyy", { locale: nl }) : "Van datum"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => setDateRange((prev) => ({ ...prev, from: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("justify-start text-left font-normal", !dateRange.to && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, "dd-MM-yyyy", { locale: nl }) : "Tot datum"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => setDateRange((prev) => ({ ...prev, to: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-gray-700 dark:text-gray-300">
            Annuleren
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || !dateRange.from || !dateRange.to}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Exporteren...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exporteren
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
