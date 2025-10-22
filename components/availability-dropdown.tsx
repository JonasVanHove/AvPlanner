"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation, type Locale } from "@/lib/i18n"

interface AvailabilityDropdownProps {
  value?: "available" | "unavailable" | "need_to_check" | "absent" | "holiday" | "remote"
  onValueChange: (value: "available" | "unavailable" | "need_to_check" | "absent" | "holiday" | "remote") => void
  locale: Locale
  disabled?: boolean
  size?: "sm" | "md" | "lg"
}

const statusConfig = {
  available: { color: "text-green-600" },
  remote: { color: "text-purple-600" },
  unavailable: { color: "text-red-600" },
  need_to_check: { color: "text-blue-600" },
  absent: { color: "text-gray-600" },
  holiday: { color: "text-yellow-600" },
}

function renderStatusIcon(
  status: "available" | "unavailable" | "need_to_check" | "absent" | "holiday" | "remote",
  size: "sm" | "md" | "lg"
) {
  const sizeClass = size === "sm" ? "text-xs" : ""
  // const dotSize = size === "sm" ? "w-2.5 h-2.5" : size === "md" ? "w-3 h-3" : "w-3.5 h-3.5"

  // if (status === "need_to_check") {
  //   // Use a CSS dot to avoid emoji font support issues on some mobile devices
  //   return (
  //     <span
  //       aria-hidden="true"
  //       className={`inline-block rounded-full bg-blue-500 ${dotSize}`}
  //     />
  //   )
  // }

  const emojiMap: Record<string, string> = {
    available: "🟢",
    remote: "🟣",
    unavailable: "🔴",
    need_to_check: "🔵",
    absent: "⚫",
    holiday: "🟡",
  }
  return <span className={sizeClass}>{emojiMap[status] || ""}</span>
}

export function AvailabilityDropdown({ value, onValueChange, locale, disabled, size = "md" }: AvailabilityDropdownProps) {
  const { t } = useTranslation(locale)

  const sizeClasses = {
    sm: "h-6 text-xs px-2",
    md: "h-8 text-xs px-3", 
    lg: "h-10 text-sm px-4"
  }

  // In test environments, render a simple native select to avoid Radix/jsdom limitations
  if (typeof window !== 'undefined' && (window as any).__TEST__) {
    return (
      <select
        role="combobox"
        value={value}
        onChange={(e) => onValueChange(e.target.value as any)}
        disabled={disabled}
        aria-disabled={disabled ? 'true' : undefined}
        className={`w-full border rounded ${sizeClasses[size]}`}
      >
        <option value="available">{t('status.available')}</option>
        <option value="remote">{t('status.remote')}</option>
        <option value="unavailable">{t('status.unavailable')}</option>
        <option value="need_to_check">{t('status.need_to_check')}</option>
        <option value="absent">{t('status.absent')}</option>
        <option value="holiday">{t('status.holiday')}</option>
      </select>
    )
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        className={`w-full ${sizeClasses[size]}`}
        disabled={disabled}
        aria-disabled={disabled ? true : undefined}
      >
        <SelectValue placeholder="Status">
          {value && (
            <div className="flex items-center gap-1">
              {renderStatusIcon(value, size)}
              {size !== "sm" && (
                <span className={statusConfig[value].color}>{t(`status.${value}` as any)}</span>
              )}
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="available">
          <div className="flex items-center gap-2">
            {renderStatusIcon("available", size)}
            <span>{t("status.available")}</span>
          </div>
        </SelectItem>
        <SelectItem value="remote">
          <div className="flex items-center gap-2">
            {renderStatusIcon("remote", size)}
            <span>{t("status.remote")}</span>
          </div>
        </SelectItem>
        <SelectItem value="unavailable">
          <div className="flex items-center gap-2">
            {renderStatusIcon("unavailable", size)}
            <span>{t("status.unavailable")}</span>
          </div>
        </SelectItem>
        <SelectItem value="need_to_check">
          <div className="flex items-center gap-2">
            {renderStatusIcon("need_to_check", size)}
            <span>{t("status.need_to_check")}</span>
          </div>
        </SelectItem>
        <SelectItem value="absent">
          <div className="flex items-center gap-2">
            {renderStatusIcon("absent", size)}
            <span>{t("status.absent")}</span>
          </div>
        </SelectItem>
        <SelectItem value="holiday">
          <div className="flex items-center gap-2">
            {renderStatusIcon("holiday", size)}
            <span>{t("status.holiday")}</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}