"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useTheme } from "next-themes"
import { useTranslation, type Locale } from "@/lib/i18n"
import { BadgeDisplay } from "@/components/badge-display"
import { Award, Mail, Calendar, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

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
  memberId?: string // For fetching badges
  teamId?: string // For fetching badges
  email?: string // Show email in dialog
  birthDate?: string // Show birthday
  clickable?: boolean // Whether avatar is clickable for badge dialog
}

export function MemberAvatar({ 
  firstName, 
  lastName, 
  profileImage, 
  size = "md", 
  className, 
  statusIndicator, 
  isBirthdayToday, 
  locale = "en",
  memberId,
  teamId,
  email,
  birthDate,
  clickable = false
}: MemberAvatarProps) {
  const { theme } = useTheme()
  const { t } = useTranslation(locale)
  const [showDialog, setShowDialog] = useState(false)
  const [badges, setBadges] = useState<any[]>([])
  const [isLoadingBadges, setIsLoadingBadges] = useState(false)

  // Fetch badges when dialog opens
  useEffect(() => {
    if (showDialog && email && memberId && teamId) {
      console.log('🏅 Badge Dialog Opened:', { 
        member: `${firstName} ${lastName}`,
        email, 
        memberId, 
        teamId 
      })
      fetchMemberBadges()
    }
  }, [showDialog, email, memberId, teamId])

  const fetchMemberBadges = async () => {
    if (!email || !memberId || !teamId) {
      console.log('🏅 [Avatar] Badge Fetch Skipped: Missing required params', { email, memberId, teamId })
      return
    }
    
    console.log('🏅 [Avatar] Fetching badges CLIENT-SIDE for:', email)
    const startTime = Date.now()
    setIsLoadingBadges(true)
    
    try {
      // CLIENT-SIDE: Query badges directly from Supabase
      console.log('🏅 [Avatar] Querying member by auth_user_id...')
      
      // First get the member to find auth_user_id
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('auth_user_id, first_name, last_name')
        .eq('id', memberId)
        .eq('team_id', teamId)
        .maybeSingle()
      
      if (memberError) {
        console.error('🏅 [Avatar] Member query error:', memberError)
        setBadges([])
        return
      }
      
      if (!memberData) {
        console.warn('🏅 [Avatar] Member not found')
        setBadges([])
        return
      }
      
      console.log('🏅 [Avatar] Found member:', memberData.first_name, memberData.last_name)
      
      // Query badges using member_id (more reliable than user_id which can be null)
      const { data: badgeData, error: badgeError } = await supabase
        .from('user_badges')
        .select('badge_type, earned_at')
        .eq('member_id', memberId)
        .eq('team_id', teamId)
        .order('earned_at', { ascending: false })
      
      if (badgeError) {
        console.error('🏅 [Avatar] Badge query error:', badgeError)
        setBadges([])
        return
      }
      
      const elapsed = Date.now() - startTime
      console.log(`🏅 [Avatar] ✅ Loaded ${badgeData?.length || 0} badges in ${elapsed}ms`)
      
      setBadges(badgeData || [])
    } catch (error: any) {
      const elapsed = Date.now() - startTime
      console.error(`🏅 [Avatar] ❌ Badge fetch error after ${elapsed}ms:`, error.message)
      setBadges([])
    } finally {
      setIsLoadingBadges(false)
      const totalTime = Date.now() - startTime
      console.log(`🏅 [Avatar] Badge fetch completed in ${totalTime}ms`)
    }
  }
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
    // No borders/rings by default - clean look
    return ''
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
        <div
          className={cn(
            clickable && "cursor-pointer transition-transform hover:scale-105",
            className
          )}
          onClick={() => clickable && setShowDialog(true)}
        >
          <Avatar className={`${sizeClasses[size]} ${getThemeAvatarClass()}`}>
            {profileImage && profileImage.length > 0 && (
              <AvatarImage 
                src={profileImage} 
                alt={`${firstName} ${lastName}`}
              />
            )}
            <AvatarFallback className={getThemeFallbackClass()}>{initials}</AvatarFallback>
          </Avatar>
        </div>
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

      {/* Member Details Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                {profileImage && (
                  <AvatarImage src={profileImage} alt={`${firstName} ${lastName}`} />
                )}
                <AvatarFallback className={getThemeFallbackClass()}>{initials}</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-lg font-bold">{firstName} {lastName}</div>
                {statusIndicator?.status && (
                  <div className="text-sm font-normal text-muted-foreground">
                    {getStatusLabel(statusIndicator.status)}
                  </div>
                )}
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Member profile information and badges
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Member Info */}
            <div className="space-y-2">
              {email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{email}</span>
                </div>
              )}
              {birthDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {new Date(birthDate).toLocaleDateString(locale, { 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                    {isBirthdayToday && " 🎂"}
                  </span>
                </div>
              )}
            </div>

            {/* Badges Section */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Award className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold">{t('badge.myBadges')}</h3>
              </div>
              
              {isLoadingBadges ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  {t('common.loading')}
                </div>
              ) : badges.length > 0 ? (
                <div className="space-y-3">
                  <BadgeDisplay 
                    badges={badges} 
                    locale={locale} 
                    size="lg" 
                    showCount={true}
                  />
                  <div className="text-xs text-muted-foreground text-center">
                    {badges.length} {badges.length === 1 ? 'badge' : 'badges'} {t('badge.earned').toLowerCase()}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  {t('badge.noBadges')}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
