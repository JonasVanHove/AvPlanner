"use client"

import { useState, useEffect, use, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { AvailabilityCalendarRedesigned } from "@/components/availability-calendar-redesigned"
import { TeamPasswordForm } from "@/components/team-password-form"
import { ConditionalThemeProvider } from "@/components/conditional-theme-provider"
import { supabase } from "@/lib/supabase"
import { useTranslation, type Locale } from "@/lib/i18n"
import { useAuth } from "@/hooks/useAuth"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface Team {
  id: string
  name: string
  slug?: string
  invite_code: string
  is_password_protected: boolean
  password_hash?: string
}

interface Member {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  status: string
  member_status?: string
  is_hidden?: boolean
  profile_image?: string
  created_at: string
  last_active?: string
  order_index?: number
}

interface TeamPageProps {
  params: Promise<{
    slug: string // This is actually the invite_code now
  }>
}

export default function TeamPage({ params }: TeamPageProps) {
  const resolvedParams = use(params)
  const locale: Locale = "en" // Default to English for non-locale routes
  const { user } = useAuth()
  const router = useRouter()

  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordError, setPasswordError] = useState<string>("")
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false)
  const { t } = useTranslation(locale)

  // Extract current date from URL or use today as default
  const getCurrentDateFromURL = useCallback(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname
      const weekMatch = path.match(/\/week\/(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
      if (weekMatch) {
        const [, year, month, day] = weekMatch
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      }
    }
    return new Date() // Default to today
  }, [])

  // Handle date navigation by updating URL without page reload
  const handleDateNavigation = useCallback((newDate: Date) => {
    const year = newDate.getFullYear()
    const month = newDate.getMonth() + 1 // Convert to 1-indexed
    const day = newDate.getDate()
    
    const newUrl = `/team/${resolvedParams.slug}/week/${year}/${month}/${day}`
    
    // Update URL without page reload using History API
    const currentPath = window.location.pathname
    if (currentPath !== newUrl) {
      window.history.pushState(null, '', newUrl)
      // Update local URL date state to keep everything in sync
      setUrlDate(newDate)
    }
  }, [resolvedParams.slug])

  useEffect(() => {
    fetchTeamData()
  }, [resolvedParams.slug])

  // State to trigger calendar re-render on URL changes
  const [urlDate, setUrlDate] = useState(() => getCurrentDateFromURL())

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      // Update URL date state to trigger calendar re-render
      setUrlDate(getCurrentDateFromURL())
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [getCurrentDateFromURL])

  const fetchTeamData = async () => {
    try {
      // First try to fetch team by invite_code, then by slug (friendly URL)
      let { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .eq("invite_code", resolvedParams.slug)
        .single()

      // If not found by invite_code, try by slug (friendly URL)
      if (teamError && teamError.code === 'PGRST116') {
        const { data: teamBySlug, error: slugError } = await supabase
          .from("teams")
          .select("*")
          .eq("slug", resolvedParams.slug)
          .single()

        teamData = teamBySlug
        teamError = slugError
      }

      if (teamError) throw teamError

      // Canonicalize URL to invite_code if a friendly slug was used
      try {
        const invite = teamData?.invite_code
        if (invite && resolvedParams.slug !== invite) {
          const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
          const prefix = `/team/${resolvedParams.slug}`
          const suffix = currentPath.startsWith(prefix) ? currentPath.slice(prefix.length) : ''
          router.replace(`/team/${invite}${suffix || ''}`)
          // After replace, stop further processing; next render will reload with canonical URL
          return
        }
      } catch (e) {
        // Non-fatal if canonicalization fails
      }
      setTeam(teamData)

      // Check if team is password protected
      if (teamData.is_password_protected) {
        // Check if already authenticated in session storage
        const sessionKey = `team_auth_${teamData.id}`
        const isSessionAuthenticated = sessionStorage.getItem(sessionKey) === "true"
        setIsAuthenticated(isSessionAuthenticated)
        
        if (!isSessionAuthenticated) {
          setIsLoading(false)
          return // Don't fetch members yet
        }
      } else {
        setIsAuthenticated(true)
      }

      // Fetch all members for this team (including inactive ones)
      const { data: allMembersData, error: membersError } = await supabase
        .from("members")
        .select("*")
        .eq("team_id", teamData.id)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true })

      if (membersError) throw membersError
      
      // Transform to consistent format
      const allMembers: Member[] = (allMembersData || []).map((member: any) => ({
        id: member.id,
        first_name: member.first_name,
        last_name: member.last_name,
        email: member.email,
        role: member.role || 'member',
        status: member.status || 'active',
        member_status: member.status || 'active',
        is_hidden: member.is_hidden || false,
        profile_image: member.profile_image || member.profile_image_url,
        created_at: member.created_at,
        last_active: member.last_active,
        order_index: member.order_index || 0
      }))
      
      setMembers(allMembers)
    } catch (error) {
      console.error("Error fetching team data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSubmit = async (password: string) => {
    if (!team) return

    setIsVerifyingPassword(true)
    setPasswordError("")

    try {
      // Simple verification - compare with base64 encoded password
      const hashedPassword = btoa(password)
      
      if (hashedPassword === team.password_hash) {
        // Password correct
        const sessionKey = `team_auth_${team.id}`
        sessionStorage.setItem(sessionKey, "true")
        setIsAuthenticated(true)
        
        // Fetch members now
        const { data: membersData, error: membersError } = await supabase
          .from("members")
          .select("*")
          .eq("team_id", team.id)
          .order("order_index", { ascending: true })
          .order("created_at", { ascending: true })

        if (membersError) throw membersError
        
        // Transform to consistent format
        const transformedMembers: Member[] = (membersData || []).map((member: any) => ({
          id: member.id,
          first_name: member.first_name,
          last_name: member.last_name,
          email: member.email,
          role: member.role || 'member',
          status: member.status || 'active',
          member_status: member.status || 'active',
          is_hidden: member.is_hidden || false,
          profile_image: member.profile_image || member.profile_image_url,
          created_at: member.created_at,
          last_active: member.last_active,
          order_index: member.order_index || 0
        }))
        
        setMembers(transformedMembers)
      } else {
        setPasswordError("Incorrect password. Please try again.")
      }
    } catch (error) {
      console.error("Error verifying password:", error)
      setPasswordError(t("common.error"))
    } finally {
      setIsVerifyingPassword(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">{t("common.loading")}</div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Team not found</h1>
          <p className="text-gray-600 mb-4">
            The invite code "{resolvedParams.slug}" doesn't match any existing team.
          </p>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (team.is_password_protected && !isAuthenticated) {
    return (
      <ConditionalThemeProvider teamSlug={team.slug || team.invite_code}>
        <TeamPasswordForm
          teamName={team.name}
          onPasswordSubmit={handlePasswordSubmit}
          isLoading={isVerifyingPassword}
          error={passwordError}
          locale={locale}
        />
      </ConditionalThemeProvider>
    )
  }

  return (
    <ConditionalThemeProvider teamSlug={team.slug || team.invite_code}>
      <AvailabilityCalendarRedesigned
        teamId={team.id}
        teamName={team.name}
        team={team}
        members={members}
        locale={locale}
        onMembersUpdate={fetchTeamData}
        isPasswordProtected={team.is_password_protected}
        passwordHash={team.password_hash}
        userEmail={user?.email}
        initialDate={urlDate}
        onDateNavigation={handleDateNavigation}
      />
    </ConditionalThemeProvider>
  )
}
