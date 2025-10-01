"use client"

import { useState, useEffect, use, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { AvailabilityCalendarRedesigned } from "@/components/availability-calendar-redesigned"
import { TeamPasswordForm } from "@/components/team-password-form"
import { supabase } from "@/lib/supabase"
import { useTranslation, type Locale } from "@/lib/i18n"
import { useAuth } from "@/hooks/useAuth"
import Link from "next/link"
import { notFound } from "next/navigation"
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

interface DateTeamPageProps {
  params: Promise<{
    slug: string // This is actually the invite_code now
    year: string
    month: string
    day: string
  }>
}

export default function DateTeamPage({ params }: DateTeamPageProps) {
  const resolvedParams = use(params)
  const locale: Locale = "en" // Default to English for non-locale routes
  const { user } = useAuth()
  const router = useRouter()

  // Parse and validate date parameters
  const year = parseInt(resolvedParams.year)
  const month = parseInt(resolvedParams.month) 
  const day = parseInt(resolvedParams.day)

  // Validate date parameters
  if (isNaN(year) || isNaN(month) || isNaN(day) || 
      year < 2020 || year > 2030 || 
      month < 1 || month > 12 || 
      day < 1 || day > 31) {
    notFound()
  }

  // Create target date from URL parameters
  const targetDate = new Date(year, month - 1, day) // month is 0-indexed in Date constructor
  
  // Check if date is valid (e.g., Feb 30 would be invalid)
  if (targetDate.getFullYear() !== year || 
      targetDate.getMonth() !== month - 1 || 
      targetDate.getDate() !== day) {
    notFound()
  }

  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { t } = useTranslation(locale)

  // Extract current date from URL or use target date as default
  const getCurrentDateFromURL = useCallback(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname
      const weekMatch = path.match(/\/week\/(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
      if (weekMatch) {
        const [, year, month, day] = weekMatch
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      }
    }
    return targetDate // Default to target date from URL params
  }, [targetDate])

  // State to trigger calendar re-render on URL changes
  const [urlDate, setUrlDate] = useState(() => getCurrentDateFromURL())

  // Fetch team by invite code
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        // Try to find team by invite_code first, then by slug
        let teamData = null
        let teamError = null

        // First try invite_code
        const { data: inviteTeamData, error: inviteError } = await supabase
          .from('teams')
          .select('*')
          .eq('invite_code', resolvedParams.slug)
          .single()

        if (!inviteError && inviteTeamData) {
          teamData = inviteTeamData
        } else {
          // If not found by invite_code, try by slug
          const { data: slugTeamData, error: slugError } = await supabase
            .from('teams')
            .select('*')
            .eq('slug', resolvedParams.slug)
            .single()

          if (!slugError && slugTeamData) {
            teamData = slugTeamData
          } else {
            teamError = slugError
          }
        }

        if (!teamData || teamError) {
          if (teamError?.code === 'PGRST116' || !teamData) {
            setError('Team not found')
          } else {
            setError('Error loading team')
          }
          setIsLoading(false)
          return
        }

        setTeam(teamData)

        // If team is not password protected, fetch members immediately
        if (!teamData.is_password_protected) {
          await fetchMembers(teamData.id)
          setIsAuthenticated(true)
        }
      } catch (error) {
        console.error('Error:', error)
        setError('Something went wrong')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTeam()
  }, [resolvedParams.slug])

  const fetchMembers = async (teamId: string) => {
    try {
      const { data: allMembersData, error: membersError } = await supabase
        .from("members")
        .select("*")
        .eq("team_id", teamId)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true })

      if (membersError) {
        console.error('Error fetching members:', membersError)
        return
      }
      
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
      console.error('Error:', error)
    }
  }

  const handlePasswordSuccess = () => {
    setIsAuthenticated(true)
    if (team) {
      fetchMembers(team.id)
    }
  }

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

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      // Update URL date state to trigger calendar re-render
      setUrlDate(getCurrentDateFromURL())
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [getCurrentDateFromURL])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold text-gray-900">{error}</h1>
        <Link href="/">
          <Button>Back to Home</Button>
        </Link>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Team not found</h1>
        <Link href="/">
          <Button>Back to Home</Button>
        </Link>
      </div>
    )
  }

  if (team.is_password_protected && !isAuthenticated) {
    return (
      <div className="container mx-auto p-4">
        <div className="max-w-md mx-auto">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4">Password Required</h2>
            <p className="mb-4">Please enter the team password to continue</p>
            <Button onClick={() => router.push(`/team/${resolvedParams.slug}`)}>
              Back to Team
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <AvailabilityCalendarRedesigned
        teamId={team.id}
        teamName={team.name}
        team={team}
        members={members}
        locale={locale}
        onMembersUpdate={() => fetchMembers(team.id)}
        isPasswordProtected={team.is_password_protected}
        passwordHash={team.password_hash}
        userEmail={user?.email}
        initialDate={urlDate}
        onDateNavigation={handleDateNavigation}
      />
    </div>
  )
}