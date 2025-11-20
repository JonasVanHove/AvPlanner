"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trophy, Award } from "lucide-react"
import { BadgeDisplay, BadgeList, type BadgeType } from "@/components/badge-display"
import { type Locale } from "@/lib/i18n"
import { MemberAvatar } from "@/components/member-avatar"

interface TeamBadgesPageProps {
  teamId: string
  teamName: string
  userEmail?: string
  locale: Locale
}

interface LeaderboardEntry {
  member_id: string
  member_name: string
  total_badges: number
  timely_badges: number
  helper_badges: number
  streak_badges: number
}

interface Badge {
  badge_id: string
  badge_type: BadgeType
  week_year: string
  earned_at: string
  team_name: string
  metadata?: any
}

export function TeamBadgesPage({ teamId, teamName, userEmail, locale }: TeamBadgesPageProps) {
  const router = useRouter()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [myBadges, setMyBadges] = useState<Badge[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [selectedMemberName, setSelectedMemberName] = useState<string | null>(null)
  const [selectedBadges, setSelectedBadges] = useState<Badge[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load leaderboard and default badges
    loadBadgeData()
  }, [teamId, userEmail])

  const loadBadgeData = async () => {
    setIsLoading(true)
    try {
      // Load leaderboard
      const leaderboardRes = await fetch(`/api/badges/leaderboard?teamId=${teamId}&limit=10`)
      const leaderboardData = await leaderboardRes.json()
      
      if (leaderboardData.success) {
        setLeaderboard(leaderboardData.leaderboard || [])
      }

      // Load user's badges if logged in
      if (userEmail) {
        // Default to current user
        const badgesRes = await fetch(`/api/badges/user?email=${encodeURIComponent(userEmail)}&teamId=${teamId}`)
        const badgesData = await badgesRes.json()
        
        if (badgesData.success) {
          setMyBadges(badgesData.badges || [])
          setSelectedBadges(badgesData.badges || [])
          setSelectedMemberId(null)
          setSelectedMemberName(null)
        }
      }
    } catch (error) {
      console.error('Error loading badge data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadBadgesForMember = async (memberId: string, memberName?: string) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/badges/user?memberId=${memberId}&teamId=${teamId}`)
      const data = await res.json()
      if (data.success) {
        setSelectedBadges(data.badges || [])
        setSelectedMemberId(memberId)
        setSelectedMemberName(memberName || null)
      } else {
        setSelectedBadges([])
        setSelectedMemberId(memberId)
        setSelectedMemberName(memberName || null)
      }
    } catch (e) {
      console.error('Error loading member badges:', e)
      setSelectedBadges([])
    } finally {
      setIsLoading(false)
    }
  }

  const texts = {
    title: {
      en: "Team Badges",
      nl: "Team Badges",
      fr: "Badges d'Équipe",
    },
    myBadges: {
      en: "My Badges",
      nl: "Mijn Badges",
      fr: "Mes Badges",
    },
    leaderboard: {
      en: "Leaderboard",
      nl: "Ranglijst",
      fr: "Classement",
    },
    totalBadges: {
      en: "Total Badges",
      nl: "Totaal Badges",
      fr: "Total Badges",
    },
    timelyBadges: {
      en: "Timely",
      nl: "Tijdig",
      fr: "Ponctuel",
    },
    helperBadges: {
      en: "Helper",
      nl: "Helper",
      fr: "Aide",
    },
    streakBadges: {
      en: "Streaks",
      nl: "Streaks",
      fr: "Séries",
    },
    backToTeam: {
      en: "Back to Team",
      nl: "Terug naar Team",
      fr: "Retour à l'Équipe",
    },
    loading: {
      en: "Loading badges...",
      nl: "Badges laden...",
      fr: "Chargement des badges...",
    },
    noBadges: {
      en: "No badges earned yet. Complete your schedule on time to earn badges!",
      nl: "Nog geen badges verdiend. Vul je planning tijdig in om badges te verdienen!",
      fr: "Aucun badge gagné. Complétez votre horaire à temps pour gagner des badges!",
    },
    rank: {
      en: "Rank",
      nl: "Rang",
      fr: "Rang",
    },
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-pulse" />
            <p className="text-lg text-muted-foreground">{texts.loading[locale]}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {texts.backToTeam[locale]}
            </Button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {texts.title[locale]}
            </h1>
            <p className="text-muted-foreground">{teamName}</p>
          </div>
          <Trophy className="h-12 w-12 text-yellow-500" />
        </div>

        {/* My / Selected Member Badges Section */}
        {userEmail && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-blue-500" />
                {selectedMemberId ? `${selectedMemberName || 'Member'}'s Badges` : texts.myBadges[locale]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedBadges && selectedBadges.length > 0 ? (
                <BadgeList badges={selectedBadges} locale={locale} />
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  {texts.noBadges[locale]}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              {texts.leaderboard[locale]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboard.length > 0 ? (
              <div className="space-y-2">
                {leaderboard.map((entry, index) => (
                  <Card key={entry.member_id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Rank */}
                        <div className="flex-shrink-0 w-12 text-center">
                          {index === 0 && <span className="text-3xl">🥇</span>}
                          {index === 1 && <span className="text-3xl">🥈</span>}
                          {index === 2 && <span className="text-3xl">🥉</span>}
                          {index > 2 && (
                            <span className="text-xl font-bold text-muted-foreground">
                              #{index + 1}
                            </span>
                          )}
                        </div>

                        {/* Member Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-lg">{entry.member_name}</div>
                          <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                            <span>
                              🎯 {entry.timely_badges} {texts.timelyBadges[locale]}
                            </span>
                            <span>
                              🤝 {entry.helper_badges} {texts.helperBadges[locale]}
                            </span>
                            <span>
                              🔥 {entry.streak_badges} {texts.streakBadges[locale]}
                            </span>
                          </div>
                        </div>

                        {/* Total */}
                        <div className="flex-shrink-0 text-right">
                          <div className="text-3xl font-bold text-blue-500">
                            {entry.total_badges}
                          </div>
                          <div className="text-xs text-muted-foreground uppercase">
                            {texts.totalBadges[locale]}
                          </div>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <Button size="sm" onClick={() => loadBadgesForMember(entry.member_id, entry.member_name)}>
                            View Badges
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                {texts.noBadges[locale]}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
