"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { AvailabilityCalendarRedesigned } from "@/components/availability-calendar-redesigned"
import { TeamPasswordForm } from "@/components/team-password-form"
import { ConditionalThemeProvider } from "@/components/conditional-theme-provider"
import { supabase } from "@/lib/supabase"
import { useTranslation, type Locale } from "@/lib/i18n"
import { useAuth } from "@/hooks/useAuth"
import Link from "next/link"
import { notFound, useRouter } from "next/navigation"

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
  birth_date?: string | null
}

// Next.js 15: Route params are delivered as a Promise; unwrap with React.use()
import { use as usePromise } from "react"

interface LocaleTeamPageParams {
  locale: string
  slug: string // invite_code or friendly slug
}

export default function LocaleTeamPage({ params }: { params: Promise<LocaleTeamPageParams> }) {
  // Unwrap params promise once; suppress repeated warnings about direct access
  const resolvedParams = usePromise(params)
  const locale = resolvedParams.locale as Locale
  const { user } = useAuth()
  const router = useRouter()

  if (!["en", "nl", "fr"].includes(locale)) {
    notFound()
  }

  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordError, setPasswordError] = useState<string>("")
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false)
  const { t } = useTranslation(locale)

  // Handle date navigation by updating URL to date-based format (must be before any returns)
  const handleDateNavigation = useCallback((newDate: Date) => {
    const year = newDate.getFullYear()
    const month = newDate.getMonth() + 1 // Convert to 1-indexed
    const day = newDate.getDate()
    
    const newUrl = `/${locale}/team/${resolvedParams.slug}/week/${year}/${month}/${day}`
    
    // Use setTimeout to avoid calling router.push during render
    setTimeout(() => {
      router.push(newUrl, { scroll: false })
    }, 0)
  }, [locale, resolvedParams.slug, router])

  useEffect(() => {
    fetchTeamData()
  }, [resolvedParams.slug])

  const fetchTeamData = async () => {
    try {
      // First try to fetch team by invite_code, then by slug (friendly URL)
      let { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("id,name,slug,invite_code,is_password_protected,password_hash")
  .eq("invite_code", resolvedParams.slug)
        .single()

      // If not found by invite_code, try by slug (friendly URL)
      if (teamError && teamError.code === 'PGRST116') {
        const { data: teamBySlug, error: slugError } = await supabase
          .from("teams")
          .select("id,name,slug,invite_code,is_password_protected,password_hash")
          .eq("slug", resolvedParams.slug)
          .single()

        teamData = teamBySlug
        teamError = slugError
      }

  if (teamError) throw teamError
  if (!teamData) throw new Error('Team not found')
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
        .select("id, first_name, last_name, email, role, status, is_hidden, profile_image, profile_image_url, created_at, last_active, order_index, birth_date")
        .eq("team_id", teamData.id)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true })

      if (membersError) throw membersError
      
      // Debug raw members to verify birth_date presence (locale route)
      try {
        console.log("🎂 Raw members (locale normal fetch):", (allMembersData || []).map((m: any) => ({
          id: m.id,
          name: `${m.first_name} ${m.last_name}`,
          birth_date: m.birth_date ?? '<missing>'
        })))
      } catch {}

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
        order_index: member.order_index || 0,
        birth_date: member.birth_date || null
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
        
        // Fetch all members now (including inactive ones)
        const { data: allMembersData, error: membersError } = await supabase
          .from("members")
          .select("*")
          .eq("team_id", team.id)
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
      } else {
        setPasswordError(
          locale === "en" ? "Incorrect password. Please try again." :
          locale === "nl" ? "Onjuist wachtwoord. Probeer opnieuw." :
          "Mot de passe incorrect. Veuillez réessayer."
        )
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
          <Link href={locale === "en" ? "/" : `/${locale}`}>
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Show password form if team is password protected and not authenticated
  if (team && team.is_password_protected && !isAuthenticated) {
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
        onDateNavigation={handleDateNavigation}
      />
    </ConditionalThemeProvider>
  )
}
