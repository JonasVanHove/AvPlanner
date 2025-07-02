"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AvailabilityCalendarRedesigned } from "@/components/availability-calendar-redesigned"
import { supabase } from "@/lib/supabase"
import { useTranslation, type Locale } from "@/lib/i18n"
import Link from "next/link"
import { notFound } from "next/navigation"

interface Team {
  id: string
  name: string
  slug: string
}

interface Member {
  id: string
  first_name: string
  last_name: string
  email?: string
  team_id: string
}

interface LocaleTeamPageProps {
  params: {
    locale: string
    slug: string
  }
}

export default function LocaleTeamPage({ params }: LocaleTeamPageProps) {
  const locale = params.locale as Locale

  if (!["nl", "fr"].includes(locale)) {
    notFound()
  }

  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { t } = useTranslation(locale)

  useEffect(() => {
    fetchTeamData()
  }, [params.slug])

  const fetchTeamData = async () => {
    try {
      // Fetch team
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .eq("slug", params.slug)
        .single()

      if (teamError) throw teamError
      setTeam(teamData)

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
          <Link href={locale === "en" ? "/" : `/${locale}`}>
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
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
