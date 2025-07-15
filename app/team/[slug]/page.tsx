"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AvailabilityCalendarRedesigned } from "@/components/availability-calendar-redesigned"
import { TeamPasswordForm } from "@/components/team-password-form"
import { supabase } from "@/lib/supabase"
import { useTranslation, type Locale } from "@/lib/i18n"
import Link from "next/link"

interface Team {
  id: string
  name: string
  invite_code: string
  is_password_protected: boolean
  password_hash?: string
}

interface Member {
  id: string
  first_name: string
  last_name: string
  email?: string
  team_id: string
}

interface TeamPageProps {
  params: {
    slug: string // This is actually the invite_code now
  }
}

export default function TeamPage({ params }: TeamPageProps) {
  const locale: Locale = "en" // Default to English for non-locale routes

  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordError, setPasswordError] = useState<string>("")
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false)
  const { t } = useTranslation(locale)

  useEffect(() => {
    fetchTeamData()
  }, [params.slug])

  const fetchTeamData = async () => {
    try {
      // First try to fetch team by invite_code, then by slug (friendly URL)
      let { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .eq("invite_code", params.slug)
        .single()

      // If not found by invite_code, try by slug (friendly URL)
      if (teamError && teamError.code === 'PGRST116') {
        const { data: teamBySlug, error: slugError } = await supabase
          .from("teams")
          .select("*")
          .eq("slug", params.slug)
          .single()

        teamData = teamBySlug
        teamError = slugError
      }

      if (teamError) throw teamError
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

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from("members")
        .select("*")
        .eq("team_id", teamData.id)
        .order("created_at", { ascending: true })

      if (membersError) throw membersError
      setMembers(membersData || [])
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
          .order("created_at", { ascending: true })

        if (membersError) throw membersError
        setMembers(membersData || [])
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
            The invite code "{params.slug}" doesn't match any existing team.
          </p>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Show password form if team is password protected and not authenticated
  if (team.is_password_protected && !isAuthenticated) {
    return (
      <TeamPasswordForm
        teamName={team.name}
        onPasswordSubmit={handlePasswordSubmit}
        isLoading={isVerifyingPassword}
        error={passwordError}
        locale={locale}
      />
    )
  }

  return (
    <AvailabilityCalendarRedesigned
      teamId={team.id}
      teamName={team.name}
      members={members}
      locale={locale}
      onMembersUpdate={fetchTeamData}
    />
  )
}
