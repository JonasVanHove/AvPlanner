"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface MemberAvatarProps {
  firstName: string
  lastName: string
  profileImage?: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function MemberAvatar({ firstName, lastName, profileImage, size = "md", className }: MemberAvatarProps) {
  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-12 w-12 text-base",
  }

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      {profileImage ? <AvatarImage src={profileImage || "/placeholder.svg"} alt={`${firstName} ${lastName}`} /> : null}
      <AvatarFallback className="bg-blue-500 text-white font-medium">{initials}</AvatarFallback>
    </Avatar>
  )
}
