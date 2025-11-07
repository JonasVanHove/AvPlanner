"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from "next-themes"
import { useTranslation, type Locale } from "@/lib/i18n"

interface MemberAvatarProps {
  firstName: string
  lastName: string
  profileImage?: string
  size?: "sm" | "md" | "lg"
  className?: string
  isBirthdayToday?: boolean
  statusIndicator?: {
    show: boolean
    status?: "available" | "unavailable" | "need_to_check" | "absent" | "holiday" | "remote"
    tooltip?: string
  }
  locale?: Locale
}

export function MemberAvatar({ firstName, lastName, profileImage, size = "md", className, statusIndicator, isBirthdayToday, locale = "en" }: MemberAvatarProps) {
  const { theme } = useTheme()
  const { t } = useTranslation(locale)
  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-12 w-12 text-base",
  }

  const statusColors = {
    available: "bg-green-500",
    remote: "bg-purple-500",
    unavailable: "bg-red-500", 
    need_to_check: "bg-blue-500",
    absent: "bg-gray-500",
    holiday: "bg-yellow-500",
  }

  // Handle empty names by using first character of each part, or fallback to first character of firstName
  const getInitials = () => {
    const firstChar = (firstName && firstName.length > 0) ? firstName.charAt(0).toUpperCase() : 'U'
    const lastChar = (lastName && lastName.length > 0) ? lastName.charAt(0).toUpperCase() : ''
    return lastChar ? `${firstChar}${lastChar}` : firstChar
  }

  // Debug: Log profile image processing
  const hasImage = profileImage && profileImage.length > 0

  const getStatusLabel = (status: string | undefined) => {
    switch (status) {
      case 'available': return t('status.available')
      case 'remote': return t('status.remote')
      case 'unavailable': return t('status.unavailable')
      case 'need_to_check': return t('status.need_to_check')
      case 'absent': return t('status.absent')
      case 'holiday': return t('status.holiday')
      default: return t('status.not_set')
    }
  }

  const initials = getInitials()

  // Get theme-specific avatar styling
  const getThemeAvatarClass = () => {
    switch (theme) {
      case 'cozy':
        return 'ring-2 ring-amber-300/50 shadow-lg shadow-amber-900/20'
      case 'blackwhite':
        return 'ring-2 ring-gray-900 shadow-lg border-2 border-gray-900'
      case 'bythestove':
        return 'ring-2 ring-red-400/60 shadow-xl shadow-red-900/30'
      default:
        return 'ring-2 ring-gray-200 dark:ring-gray-700'
    }
  }

  const getThemeFallbackClass = () => {
    switch (theme) {
      case 'cozy':
        return 'bg-gradient-to-br from-amber-600 to-orange-700 text-white'
      case 'blackwhite':
        return 'bg-gray-900 text-white font-bold'
      case 'bythestove':
        return 'bg-gradient-to-br from-red-600 to-orange-600 text-white'
      default:
        return 'bg-blue-500 text-white font-medium'
    }
  }

  return (
    <TooltipProvider>
      <div className="relative">
        <Avatar className={`${sizeClasses[size]} ${getThemeAvatarClass()} ${className}`}>
          {profileImage && profileImage.length > 0 && (
            <AvatarImage 
              src={profileImage} 
              alt={`${firstName} ${lastName}`}
            />
          )}
          <AvatarFallback className={getThemeFallbackClass()}>{initials}</AvatarFallback>
        </Avatar>
        {statusIndicator?.show && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 cursor-help ${
                  statusIndicator.status ? statusColors[statusIndicator.status] : "bg-gray-400"
                }`}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">
                {statusIndicator.tooltip || getStatusLabel(statusIndicator.status)}
              </p>
            </TooltipContent>
          </Tooltip>
        )}
        {isBirthdayToday && (
          <div className="absolute -bottom-0.5 -right-3.5 text-[10px] select-none" title="Birthday">🎂</div>
        )}
      </div>
    </TooltipProvider>
  )
}
