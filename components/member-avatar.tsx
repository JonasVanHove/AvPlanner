"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useTheme } from "next-themes"
import { useTranslation, type Locale } from "@/lib/i18n"
import { BadgeDisplay } from "@/components/badge-display"
import { Award, Mail, Calendar, CalendarDays, User, MessageSquare, Cake } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [lastActivity, setLastActivity] = useState<string | null>(null)

  // Fetch badges when dialog opens
  useEffect(() => {
    if (showDialog && email && memberId && teamId) {
      console.log('🏅 Badge Dialog Opened:', { 
        member: `${firstName} ${lastName}`,
        email, 
        memberId, 
        teamId 
      })
      // Immediately try to use cached badges (if any) so non-authenticated viewers see something
      try {
        const cacheKey = `badges:${memberId}:${teamId}`
        const raw = localStorage.getItem(cacheKey)
        if (raw) {
          const cached = JSON.parse(raw)
          console.log(`🏅 [Avatar] Showing cached badges immediately (${(cached && cached.length) || 0})`)
          setBadges(cached)
        }
      } catch (e) {
        // ignore
      }

      fetchMemberBadges()
      fetchMemberInfo()
    }
  }, [showDialog, email, memberId, teamId])

  // Check authentication status on mount
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (!mounted) return
        setIsAuthenticated(!!data.session)
      } catch (e) {
        if (!mounted) return
        setIsAuthenticated(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const fetchMemberBadges = async () => {
    if (!memberId || !teamId) return

    const startTime = Date.now()
    setIsLoadingBadges(true)

    try {
      console.log('🏅 [Avatar] Fetching badges via server API for memberId:', memberId)
      const res = await fetch(`/api/badges/user?memberId=${encodeURIComponent(memberId)}&teamId=${encodeURIComponent(teamId)}`)
      const data = await res.json()

      if (data && data.success && Array.isArray(data.badges)) {
        setBadges(data.badges.map((b: any) => ({ badge_type: b.badge_type, earned_at: b.earned_at, badge_id: b.badge_id || b.id, team_name: b.team_name })))
        try {
          const cacheKey = `badges:${memberId}:${teamId}`
          localStorage.setItem(cacheKey, JSON.stringify(data.badges))
        } catch (e) {
          // ignore localStorage errors
        }
      } else {
        // fallback to cached badges if available
        try {
          const cacheKey = `badges:${memberId}:${teamId}`
          const raw = localStorage.getItem(cacheKey)
          if (raw) {
            const cached = JSON.parse(raw)
            setBadges(cached)
            return
          }
        } catch (e) {
          // ignore
        }
        setBadges([])
      }
    } catch (err) {
      console.error('🏅 [Avatar] Badge API fetch failed:', err)
      try {
        const cacheKey = `badges:${memberId}:${teamId}`
        const raw = localStorage.getItem(cacheKey)
        if (raw) {
          const cached = JSON.parse(raw)
          setBadges(cached)
          return
        }
      } catch (e) {
        // ignore
      }
      setBadges([])
    } finally {
      setIsLoadingBadges(false)
      const total = Date.now() - startTime
      console.log(`🏅 [Avatar] Badge fetch (API) completed in ${total}ms`)
    }
  }

  const [joinedAt, setJoinedAt] = useState<string | null>(null)

  const fetchMemberInfo = async () => {
    if (!memberId) return
    try {
      const res = await fetch(`/api/members/info?memberId=${encodeURIComponent(memberId)}`)
      const data = await res.json()
      if (data && data.success && data.member) {
        setJoinedAt(data.member.created_at)
      }

      // Fetch last activity from availability table
      const { data: availData, error } = await supabase
        .from('availability')
        .select('updated_at')
        .eq('member_id', memberId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      if (availData && !error) {
        setLastActivity(availData.updated_at)
      }
    } catch (err) {
      console.warn('Failed to fetch member info:', err)
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
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-600 cursor-help ${
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
          <div className="absolute -bottom-0.5 -right-3.5 select-none" title={locale === 'nl' ? 'Verjaardag' : locale === 'fr' ? 'Anniversaire' : 'Birthday'}>
            <Cake className="h-4 w-4 text-pink-500 drop-shadow-sm" />
          </div>
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
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground truncate" title={email}>{email}</span>
                  </div>
                  <div className="flex items-center gap-1 pl-2">
                    <a
                      href={`https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(email)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={locale === 'nl' ? 'Teams bericht sturen' : locale === 'fr' ? 'Envoyer message Teams' : 'Send Teams message'}
                      title={locale === 'nl' ? 'Teams bericht' : locale === 'fr' ? 'Message Teams' : 'Teams message'}
                      className="group"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-purple-600 hover:bg-purple-600/10 transition-colors"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </a>
                    <a
                      href={`mailto:${email}`}
                      aria-label={locale === 'nl' ? 'E-mail sturen' : locale === 'fr' ? 'Envoyer mail' : 'Send email'}
                      title={locale === 'nl' ? 'E-mail' : locale === 'fr' ? 'Mail' : 'Email'}
                      className="group"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-sky-600 hover:bg-sky-600/10 transition-colors"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                </div>
              )}
              {birthDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Cake className="h-4 w-4 text-pink-500" />
                  <span className="text-muted-foreground">
                    {new Date(birthDate).toLocaleDateString(locale, { 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              )}

              {/* Member joined date (visible for all viewers via server API) */}
              {joinedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{locale === 'nl' ? 'Lid sinds' : locale === 'fr' ? 'Membre depuis' : 'Member since'}: {new Date(joinedAt).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              )}
              {isAuthenticated && lastActivity && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {locale === 'nl' ? 'Laatste record' : locale === 'fr' ? 'Dernier enregistrement' : 'Last record'}: {new Date(lastActivity).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}
                    {(() => {
                      const days = Math.floor((new Date().getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
                      if (days === 0) return ` (${locale === 'nl' ? 'Vandaag' : locale === 'fr' ? "Aujourd'hui" : 'Today'})`
                      if (days === 1) return ` (${locale === 'nl' ? 'Gisteren' : locale === 'fr' ? 'Hier' : 'Yesterday'})`
                      if (days < 7) return ` (${days} ${locale === 'nl' ? 'dagen geleden' : locale === 'fr' ? 'jours passés' : 'days ago'})`
                      if (days < 30) return ` (${Math.floor(days / 7)} ${locale === 'nl' ? 'weken geleden' : locale === 'fr' ? 'semaines passées' : 'weeks ago'})`
                      return ` (${Math.floor(days / 30)} ${locale === 'nl' ? 'maanden geleden' : locale === 'fr' ? 'mois passés' : 'months ago'})`
                    })()}
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
                  {isAuthenticated === false ? (
                    // Not logged in: hint to login to view badges (or show cached)
                    (locale === 'nl'
                      ? 'Log in om de badges te zien'
                      : locale === 'fr'
                        ? "Connectez-vous pour voir les badges"
                        : 'Log in to view badges')
                  ) : isAuthenticated === null ? (
                    // Unknown auth state - be neutral
                    (locale === 'nl' ? 'Badges niet beschikbaar' : locale === 'fr' ? 'Badges non disponibles' : 'Badges not available')
                  ) : (
                    // Authenticated but no badges
                    t('badge.noBadges')
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
