"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation, type Locale } from "@/lib/i18n"

interface AvailabilityDropdownProps {
  value?: "available" | "unavailable" | "need_to_check" | "absent" | "holiday"
  onValueChange: (value: "available" | "unavailable" | "need_to_check" | "absent" | "holiday") => void
  locale: Locale
  disabled?: boolean
}

const statusConfig = {
  available: { icon: "🟢", color: "text-green-600" },
  unavailable: { icon: "🔴", color: "text-red-600" },
  need_to_check: { icon: "🟠", color: "text-orange-600" },
  absent: { icon: "⚫", color: "text-gray-600" },
  holiday: { icon: "🟡", color: "text-yellow-600" },
}

export function AvailabilityDropdown({ value, onValueChange, locale, disabled }: AvailabilityDropdownProps) {
  const { t } = useTranslation(locale)

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-full h-8 text-xs">
        <SelectValue placeholder="Status">
          {value && (
            <div className="flex items-center gap-1">
              <span>{statusConfig[value].icon}</span>
              <span className={statusConfig[value].color}>{t(`status.${value}` as any)}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="available">
          <div className="flex items-center gap-2">
            <span>{statusConfig.available.icon}</span>
            <span>{t("status.available")}</span>
          </div>
        </SelectItem>
        <SelectItem value="unavailable">
          <div className="flex items-center gap-2">
            <span>{statusConfig.unavailable.icon}</span>
            <span>{t("status.unavailable")}</span>
          </div>
        </SelectItem>
        <SelectItem value="need_to_check">
          <div className="flex items-center gap-2">
            <span>{statusConfig.need_to_check.icon}</span>
            <span>{t("status.need_to_check")}</span>
          </div>
        </SelectItem>
        <SelectItem value="absent">
          <div className="flex items-center gap-2">
            <span>{statusConfig.absent.icon}</span>
            <span>{t("status.absent")}</span>
          </div>
        </SelectItem>
        <SelectItem value="holiday">
          <div className="flex items-center gap-2">
            <span>{statusConfig.holiday.icon}</span>
            <span>{t("status.holiday")}</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}
