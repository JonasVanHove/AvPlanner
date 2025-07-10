"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface MemberAvatarProps {
  firstName: string
  lastName: string
  profileImage?: string
  size?: "sm" | "md" | "lg"
  className?: string
  statusIndicator?: {
    show: boolean
    status?: "available" | "unavailable" | "need_to_check" | "absent" | "holiday" | "remote"
  }
}

export function MemberAvatar({ firstName, lastName, profileImage, size = "md", className, statusIndicator }: MemberAvatarProps) {
  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-12 w-12 text-base",
  }

  const statusColors = {
    available: "bg-green-400",
    remote: "bg-purple-400",
    unavailable: "bg-red-400", 
    need_to_check: "bg-blue-400",
    absent: "bg-gray-400",
    holiday: "bg-yellow-400",
  }

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()

  return (
    <div className="relative">
      <Avatar className={`${sizeClasses[size]} ${className}`}>
        {profileImage ? <AvatarImage src={profileImage || "/placeholder.svg"} alt={`${firstName} ${lastName}`} /> : null}
        <AvatarFallback className="bg-blue-500 text-white font-medium">{initials}</AvatarFallback>
      </Avatar>
      {statusIndicator?.show && (
        <div 
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
            statusIndicator.status ? statusColors[statusIndicator.status] : "bg-gray-400"
          }`}
        />
      )}
    </div>
  )
}
