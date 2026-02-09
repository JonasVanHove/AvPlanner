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
import { notFound, useRouter, useSearchParams } from "next/navigation"

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

interface DateSharePageProps {
  params: {
    locale: string
    slug: string
    year: string
    month: string
    day: string
  }
}

const getInitialWeeksToShow = (value: string | null) => {
  if (value === "2") return 2
  if (value === "4") return 4
  if (value === "8") return 8
  return 1
}

export default function LocaleDateSharePage({ params }: DateSharePageProps) {
  const locale = params.locale as Locale
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const weeksParam = searchParams.get("weeks")
  const pwParam = searchParams.get("pw")
  const initialWeeksToShow = getInitialWeeksToShow(weeksParam)
  const weeksQuery = weeksParam ? `?weeks=${weeksParam}` : ""

  if (!["en", "nl", "fr"].includes(locale)) {
    notFound()
  }

  const year = parseInt(params.year)
  const month = parseInt(params.month)
  const day = parseInt(params.day)

  if (isNaN(year) || isNaN(month) || isNaN(day) || year < 2020 || year > 2030 || month < 1 || month > 12 || day < 1 || day > 31) {
    notFound()
  }

  const targetDate = new Date(year, month - 1, day)
  if (targetDate.getFullYear() !== year || targetDate.getMonth() !== month - 1 || targetDate.getDate() !== day) {
    notFound()
  }

  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordError, setPasswordError] = useState<string>("")
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false)
  const { t } = useTranslation(locale)

  const getCurrentDateFromURL = useCallback(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname
      const shareMatch = path.match(/\/share\/(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
      if (shareMatch) {
        const [, year, month, day] = shareMatch
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      }
    }
    return targetDate
  }, [targetDate])

  const [urlDate, setUrlDate] = useState(() => getCurrentDateFromURL())

  const handleDateNavigation = useCallback((newDate: Date) => {
    const year = newDate.getFullYear()
    const month = newDate.getMonth() + 1
    const day = newDate.getDate()

    const newUrl = `/${locale}/team/${params.slug}/share/${year}/${month}/${day}${weeksQuery}`
    const currentPath = window.location.pathname + window.location.search
    if (currentPath !== newUrl) {
      window.history.pushState(null, "", newUrl)
      setUrlDate(newDate)
    }
  }, [locale, params.slug, weeksQuery])

  useEffect(() => {
    const handlePopState = () => {
      setUrlDate(getCurrentDateFromURL())
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [getCurrentDateFromURL])

  useEffect(() => {
    fetchTeamData()
  }, [params.slug, pwParam])

  const fetchTeamData = async () => {
    try {
      let { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("id,name,slug,invite_code,is_password_protected,password_hash")
        .eq("invite_code", params.slug)
        .maybeSingle()

      if (!teamData && !teamError) {
        const { data: teamBySlug, error: slugError } = await supabase
          .from("teams")
          .select("id,name,slug,invite_code,is_password_protected,password_hash")
          .eq("slug", params.slug)
          .maybeSingle()

        teamData = teamBySlug
        teamError = slugError
      }

      if (teamError) throw teamError
      if (!teamData) throw new Error("Team not found")

      try {
        const invite = teamData?.invite_code
        if (invite && params.slug !== invite) {
          const currentPath = typeof window !== "undefined" ? window.location.pathname : ""
          const prefix = `/${locale}/team/${params.slug}`
          const suffix = currentPath.startsWith(prefix) ? currentPath.slice(prefix.length) : ""
          router.replace(`/${locale}/team/${invite}${suffix || ""}${weeksQuery}`)
          return
        }
      } catch {}

      setTeam(teamData)

      if (teamData.is_password_protected) {
        const sessionKey = `team_auth_${teamData.id}`
        const hasPwParam = !!pwParam && pwParam === teamData.password_hash

        if (hasPwParam) {
          sessionStorage.setItem(sessionKey, "true")
          setIsAuthenticated(true)
        } else {
          const isSessionAuthenticated = sessionStorage.getItem(sessionKey) === "true"
          setIsAuthenticated(isSessionAuthenticated)

          if (!isSessionAuthenticated) {
            setIsLoading(false)
            return
          }
        }
      } else {
        setIsAuthenticated(true)
      }

      const { data: allMembersData, error: membersError } = await supabase
        .from("members")
        .select("id, first_name, last_name, email, role, status, is_hidden, profile_image, profile_image_url, created_at, last_active, order_index, birth_date")
        .eq("team_id", teamData.id)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true })

      if (membersError) throw membersError

      const allMembers: Member[] = (allMembersData || []).map((member: any) => ({
        id: member.id,
        first_name: member.first_name,
        last_name: member.last_name,
        email: member.email,
        role: member.role || "member",
        status: member.status || "active",
        member_status: member.status || "active",
        is_hidden: member.is_hidden || false,
        profile_image: member.profile_image || member.profile_image_url,
        created_at: member.created_at,
        last_active: member.last_active,
        order_index: member.order_index || 0,
        birth_date: member.birth_date || null,
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
      const hashedPassword = btoa(password)

      if (hashedPassword === team.password_hash) {
        const sessionKey = `team_auth_${team.id}`
        sessionStorage.setItem(sessionKey, "true")
        setIsAuthenticated(true)

        const { data: membersData, error: membersError } = await supabase
          .from("members")
          .select("id, first_name, last_name, email, role, status, is_hidden, profile_image, profile_image_url, created_at, last_active, order_index, birth_date")
          .eq("team_id", team.id)
          .order("order_index", { ascending: true })
          .order("created_at", { ascending: true })

        if (membersError) throw membersError

        const transformedMembers: Member[] = (membersData || []).map((member: any) => ({
          id: member.id,
          first_name: member.first_name,
          last_name: member.last_name,
          email: member.email,
          role: member.role || "member",
          status: member.status || "active",
          member_status: member.status || "active",
          is_hidden: member.is_hidden || false,
          profile_image: member.profile_image || member.profile_image_url,
          created_at: member.created_at,
          last_active: member.last_active,
          order_index: member.order_index || 0,
          birth_date: member.birth_date || null,
        }))

        setMembers(transformedMembers)
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
            The invite code "{params.slug}" doesn't match any existing team.
          </p>
          <Link href={locale === "en" ? "/" : `/${locale}`}>
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
        readOnly
        initialWeeksToShow={initialWeeksToShow}
      />
    </ConditionalThemeProvider>
  )
}
