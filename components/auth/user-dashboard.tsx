"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { TeamAdminPanel } from "@/components/admin/team-admin-panel"
import { TeamForm } from "@/components/team-form"
import { JoinTeamForm } from "@/components/join-team-form"
import { Loader2, Users, Calendar, Settings, LogOut, Crown, Shield, Home, Plus, UserPlus, RefreshCw, Eye, EyeOff } from "lucide-react"
import { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import { MemberAvatar } from "@/components/member-avatar"
import { useTodayAvailability } from "@/hooks/use-today-availability"

interface Team {
  id: string
  name: string
  slug: string
  invite_code: string
  is_password_protected: boolean
  created_at: string
  member_count: number
  user_role: string
  is_creator: boolean
  profile_image_url: string | null
  members?: TeamMember[]
}

interface TeamMember {
  member_id: string
  member_email: string
  member_name: string
  member_role: string
  member_status: string
  profile_image_url: string | null
  profile_image: string | null
  joined_at: string
  last_active: string | null
  is_current_user: boolean
  is_hidden?: boolean
}

// Database return type (from get_user_teams function)
interface DbTeam {
  team_id: string
  team_name: string
  team_slug: string
  team_invite_code: string
  team_is_password_protected: boolean
  team_created_at: string
  user_role: string
  member_count: number
  is_creator?: boolean // Optional until database function is updated
  profile_image_url: string | null
}

interface UserDashboardProps {
  user: User
  onLogout: () => void
  onGoHome?: () => void
}

export function UserDashboard({ user, onLogout, onGoHome }: UserDashboardProps) {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [userProfileImage, setUserProfileImage] = useState<string | null>(null)
  const router = useRouter()

  // Get all member IDs from all teams for today's availability
  const allMemberIds = teams.flatMap(team => 
    team.members?.map(member => member.member_id) || []
  )
  const { todayAvailability } = useTodayAvailability(allMemberIds)

  useEffect(() => {
    fetchUserTeams()
    fetchUserProfileImage()
  }, [user, refreshKey])

  const fetchUserProfileImage = async () => {
    try {
      // Haal de eerste profielfoto op uit de members table voor deze gebruiker
      const { data, error } = await supabase
        .from('members')
        .select('profile_image, profile_image_url')
        .eq('email', user.email)
        .eq('status', 'active')
        .limit(1)
        .single()

      if (error) {
        console.log('No profile image found in members table:', error.message)
        return
      }

      if (data) {
        // Gebruik profile_image_url eerst, dan profile_image als fallback
        const profileImg = data.profile_image_url || data.profile_image
        if (profileImg) {
          console.log('🖼️ Found user profile image:', profileImg.substring(0, 50) + '...')
          setUserProfileImage(profileImg)
        }
      }
    } catch (error) {
      console.log('Error fetching user profile image:', error)
    }
  }

  const refreshTeams = async () => {
    setIsRefreshing(true)
    try {
      await fetchUserTeams()
    } finally {
      setIsRefreshing(false)
    }
  }

  const fetchUserTeams = async () => {
    try {
      // Eerst proberen om auth_user_id te linken als dat nog niet gebeurd is
      try {
        await supabase.rpc('manual_link_auth_user', {
          user_email: user.email
        })
      } catch (linkError) {
        // Ignore error if already linked or other issues
        console.log('Link error (can be ignored):', linkError)
      }

      // Use the database function to get teams with roles
      const { data, error } = await supabase.rpc('get_user_teams', {
        user_email: user.email
      })

      if (error) throw error
      
      // Debug: Log the raw data to see what's returned
      console.log('Raw teams data:', data)
      
      // Map database result to Team interface
      const mappedTeams: Team[] = (data as DbTeam[] || []).map(dbTeam => ({
        id: dbTeam.team_id,
        name: dbTeam.team_name,
        slug: dbTeam.team_slug,
        invite_code: dbTeam.team_invite_code,
        is_password_protected: dbTeam.team_is_password_protected,
        created_at: dbTeam.team_created_at,
        member_count: dbTeam.member_count,
        user_role: dbTeam.user_role,
        is_creator: dbTeam.is_creator || false, // Fallback to false if undefined
        profile_image_url: dbTeam.profile_image_url
      }))
      
      // Debug: Log the mapped teams
      console.log('Mapped teams:', mappedTeams)
      
      // Fetch team members for each team
      const teamsWithMembers = await Promise.all(
        mappedTeams.map(async (team) => {
          try {
            const { data: membersData, error: membersError } = await supabase.rpc('get_team_members', {
              team_id_param: team.id,
              user_email: user.email
            })
            
            if (membersError) {
              console.error(`❌ Failed to load members for team ${team.name}:`, membersError)
              return { ...team, members: [] }
            }
            
            if (!membersData || membersData.length === 0) {
              console.warn(`⚠️ No members data returned for team ${team.name}`)
              return { ...team, members: [] }
            }
            
            // Debug: Log profile image data and visibility for each member
            console.log(`🔍 Team "${team.name}" member data debug:`)
            membersData.forEach((member: any, index: number) => {
              console.log(`  [${index}] ${member.member_name} (${member.member_email}):`)
              console.log(`    profile_image_url: ${member.profile_image_url ? 'YES' : 'NO'} (${typeof member.profile_image_url})`)
              console.log(`    profile_image: ${member.profile_image ? 'YES' : 'NO'} (${typeof member.profile_image})`)
              console.log(`    is_hidden: ${member.is_hidden} (${typeof member.is_hidden})`)
              if (member.profile_image) {
                console.log(`    profile_image length: ${member.profile_image.length}`)
                console.log(`    profile_image preview: ${member.profile_image.substring(0, 50)}...`)
              }
            })
            
            return { ...team, members: membersData || [] }
          } catch (err) {
            console.warn(`Error loading members for team ${team.name}:`, err)
            return { ...team, members: [] }
          }
        })
      )
      
      setTeams(teamsWithMembers)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onLogout()
  }

  const getRoleIcon = (role: string, isCreator: boolean) => {
    if (isCreator) return <Crown className="h-4 w-4 text-yellow-500" />
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-yellow-500" />
      case 'can_edit':
        return <Shield className="h-4 w-4 text-blue-500" />
      default:
        return null
    }
  }

  const getRoleBadge = (role: string, isCreator: boolean) => {
    if (isCreator) return <Badge variant="default" className="bg-yellow-500">Creator</Badge>
    switch (role) {
      case 'admin':
        return <Badge variant="default" className="bg-yellow-500">Admin</Badge>
      case 'can_edit':
        return <Badge variant="secondary">Can Edit</Badge>
      default:
        return <Badge variant="outline">Member</Badge>
    }
  }

  const canManageTeam = (role: string, isCreator: boolean) => {
    return isCreator || role === 'admin'
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Unknown'
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch (error) {
      return 'Unknown'
    }
  }

  const getInitials = (name: string, email: string) => {
    if (name && name.trim() !== '' && name.trim() !== ' ') {
      const parts = name.trim().split(' ')
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      }
      return parts[0][0].toUpperCase()
    }
    return email[0]?.toUpperCase() || '?'
  }

  const getMemberStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <Card className="w-full max-w-4xl">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-5xl space-y-4 sm:space-y-8">
      {/* User Profile Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="p-4 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-6">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-4 border-white shadow-lg flex-shrink-0">
                {(userProfileImage || user.user_metadata?.avatar_url) && (
                  <AvatarImage 
                    src={userProfileImage || user.user_metadata?.avatar_url} 
                    onLoad={() => console.log('✅ User profile image loaded')}
                    onError={() => console.log('❌ User profile image failed to load')}
                  />
                )}
                <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg sm:text-xl">
                  {user.user_metadata?.first_name?.[0] || user.email?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl sm:text-3xl font-bold text-gray-900 truncate">
                  {user.user_metadata?.first_name || 'User'} {user.user_metadata?.last_name || ''}
                </h2>
                <p className="text-gray-600 text-sm sm:text-lg truncate">{user.email}</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Member since {formatDate(user.created_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-auto">
              {onGoHome && (
                <Button
                  onClick={onGoHome}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                >
                  <Home className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Home</span>
                  <span className="sm:hidden">Home</span>
                </Button>
              )}
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="flex items-center gap-1 sm:gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-300 text-xs sm:text-sm"
              >
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">Logout</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Team Actions */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardHeader className="p-4 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg sm:text-xl">Team Management</CardTitle>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Create new teams or join existing ones</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg text-sm w-full sm:w-auto">
                    <Plus className="h-4 w-4" />
                    <span className="sm:hidden">Create Team</span>
                    <span className="hidden sm:inline">Create Team</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="mx-2 sm:mx-0 sm:max-w-md">
                  <TeamForm locale="en" />
                </DialogContent>
              </Dialog>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center justify-center gap-2 border-purple-200 hover:bg-purple-50 text-sm w-full sm:w-auto">
                    <UserPlus className="h-4 w-4" />
                    <span className="sm:hidden">Join Team</span>
                    <span className="hidden sm:inline">Join Team</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="mx-2 sm:mx-0 sm:max-w-md">
                  <JoinTeamForm locale="en" />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Teams Overview */}
      <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader className="p-4 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg sm:text-xl">My Teams ({teams.length})</CardTitle>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  {teams.length === 0 ? 'No teams yet' : `You're a member of ${teams.length} team${teams.length !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            <Button
              onClick={refreshTeams}
              variant="outline"
              size="sm"
              disabled={isRefreshing}
              className="flex items-center gap-1 sm:gap-2 border-green-200 hover:bg-green-50 disabled:opacity-50 text-xs sm:text-sm self-start sm:self-auto"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
              <p className="text-red-600 font-medium text-sm">Error loading teams:</p>
              <p className="text-red-500 text-xs sm:text-sm">{error}</p>
            </div>
          )}
          
          {teams.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="bg-gray-100 rounded-full p-4 sm:p-6 w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No teams yet</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">You're not a member of any teams yet.</p>
              <p className="text-xs sm:text-sm text-gray-500">Create a new team or join an existing one using the buttons above.</p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {teams.map((team) => (
                <Card key={team.id} className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <h3 className="font-semibold text-base sm:text-lg truncate">{team.name}</h3>
                          {getRoleIcon(team.user_role, team.is_creator)}
                          {getRoleBadge(team.user_role, team.is_creator)}
                          {team.is_password_protected && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                              🔒 Protected
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700 text-xs sm:text-sm">Your Profile:</span>
                              <div className="flex items-center gap-2">
                                {(() => {
                                  // Zoek de huidige gebruiker in de team members
                                  const currentUserInTeam = team.members?.find(member => member.is_current_user)
                                  const profileImage = currentUserInTeam?.profile_image_url || currentUserInTeam?.profile_image || userProfileImage
                                  
                                  return (
                                    <Avatar className="h-5 w-5 sm:h-6 sm:w-6">
                                      {profileImage && (
                                        <AvatarImage 
                                          src={profileImage} 
                                          onLoad={() => console.log('✅ Team profile image loaded')}
                                          onError={() => console.log('❌ Team profile image failed')}
                                        />
                                      )}
                                      <AvatarFallback className="text-xs">
                                        {user.user_metadata?.first_name?.[0] || user.email?.[0]?.toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  )
                                })()}
                                <span className="text-gray-600 text-xs">
                                  {(() => {
                                    const currentUserInTeam = team.members?.find(member => member.is_current_user)
                                    const hasProfileImage = currentUserInTeam?.profile_image_url || currentUserInTeam?.profile_image || userProfileImage
                                    return hasProfileImage ? 'Profile image' : 'Default avatar'
                                  })()}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700 text-xs sm:text-sm">Team Name:</span>
                              <span className="text-gray-600 text-xs sm:text-sm truncate">{team.name}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="font-medium text-gray-700 text-xs sm:text-sm flex-shrink-0">Invite Code:</span>
                              <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                                <code className="bg-gray-100 px-1 sm:px-2 py-1 rounded text-xs font-mono select-all truncate">
                                  {team.invite_code}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 sm:h-6 sm:w-6 p-0 flex-shrink-0"
                                  onClick={() => navigator.clipboard.writeText(team.invite_code)}
                                  title="Copy Invite Code"
                                >
                                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </Button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700 text-xs sm:text-sm">Members:</span>
                              <Badge variant="secondary" className="text-xs">
                                {team.member_count} {team.member_count === 1 ? 'member' : 'members'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700 text-xs sm:text-sm">Security:</span>
                              <Badge variant={team.is_password_protected ? "destructive" : "secondary"} className="text-xs">
                                {team.is_password_protected ? 'Protected' : 'Open'}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700 text-xs sm:text-sm">Created:</span>
                              <span className="text-gray-600 text-xs sm:text-sm">{formatDate(team.created_at)}</span>
                            </div>
                              <div className="flex items-start gap-2">
                                <span className="font-medium text-gray-700 mt-1 text-xs sm:text-sm flex-shrink-0">Team ID:</span>
                                <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                                  <code className="bg-gray-100 px-1 sm:px-2 py-1 rounded text-xs font-mono select-all break-all flex-1">
                                    {team.id}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 sm:h-6 sm:w-6 p-0 flex-shrink-0"
                                    onClick={() => navigator.clipboard.writeText(team.id)}
                                    title="Copy Team ID"
                                  >
                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </Button>
                                </div>
                              </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700 text-xs sm:text-sm">Your Role:</span>
                              <Badge variant={team.is_creator ? "default" : "secondary"} className="text-xs">
                                {team.is_creator ? 'Creator' : team.user_role}
                              </Badge>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="font-medium text-gray-700 text-xs sm:text-sm flex-shrink-0">Slug:</span>
                              <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                                <code className="bg-gray-100 px-1 sm:px-2 py-1 rounded text-xs font-mono select-all truncate">
                                  {team.slug || 'Not set'}
                                </code>
                                {team.slug && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 sm:h-6 sm:w-6 p-0 flex-shrink-0"
                                    onClick={() => navigator.clipboard.writeText(team.slug)}
                                    title="Copy Team Slug"
                                  >
                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Team Members Section */}
                        {team.members && team.members.length > 0 && (
                          <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200">
                            <div className="flex items-center justify-between mb-2 sm:mb-3">
                              <h4 className="font-medium text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                                Team Members ({team.members.length})
                              </h4>
                              <div className="flex items-center gap-2 text-xs">
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                                  <Eye className="h-3 w-3 mr-1" />
                                  {team.members.filter(m => !m.is_hidden).length} Visible
                                </Badge>
                                {team.members.some(m => m.is_hidden) && (
                                  <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">
                                    <EyeOff className="h-3 w-3 mr-1" />
                                    {team.members.filter(m => m.is_hidden).length} Hidden
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              {team.members.slice(0, 8).map((member) => (
                                <div key={member.member_id} className={`flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg ${member.is_hidden ? 'opacity-60 bg-gray-100' : ''}`}>
                                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                    <MemberAvatar
                                      firstName={member.member_name.trim() ? member.member_name.split(' ')[0] : member.member_email.split('@')[0]}
                                      lastName={member.member_name.trim() ? member.member_name.split(' ').slice(1).join(' ') : ''}
                                      profileImage={member.profile_image_url || member.profile_image || undefined}
                                      size="sm"
                                      statusIndicator={{
                                        show: true,
                                        status: todayAvailability[member.member_id]
                                      }}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1 sm:gap-2">
                                        <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                                          {member.member_name.trim() !== '' && member.member_name.trim() !== ' ' 
                                            ? member.member_name 
                                            : member.member_email.split('@')[0]}
                                        </p>
                                        {member.is_current_user && (
                                          <Badge variant="outline" className="text-xs">You</Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-500 truncate">{member.member_email}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                    <Badge variant="outline" className={`${getMemberStatusColor(member.member_status)} text-xs`}>
                                      {member.member_status}
                                    </Badge>
                                    {/* Visibility indicator */}
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs flex items-center gap-1 ${member.is_hidden ? 'bg-gray-100 text-gray-600 border-gray-300' : 'bg-green-50 text-green-700 border-green-300'}`}
                                      title={member.is_hidden ? 'This member is hidden from the calendar' : 'This member is visible on the calendar'}
                                    >
                                      {member.is_hidden ? (
                                        <>
                                          <EyeOff className="h-3 w-3" />
                                          <span className="hidden sm:inline">Hidden</span>
                                        </>
                                      ) : (
                                        <>
                                          <Eye className="h-3 w-3" />
                                          <span className="hidden sm:inline">Visible</span>
                                        </>
                                      )}
                                    </Badge>
                                    <div className="hidden sm:flex items-center gap-1">
                                      {getRoleIcon(member.member_role, false)}
                                      <Badge variant={member.member_role === 'admin' ? "default" : "secondary"} className="text-xs">
                                        {member.member_role}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {team.members.length > 8 && (
                                <div className="text-center py-2">
                                  <span className="text-xs sm:text-sm text-gray-500">
                                    +{team.members.length - 8} more member{team.members.length - 8 !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-row lg:flex-col gap-2 lg:ml-4 w-full lg:w-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            const teamUrl = `/team/${team.invite_code}`
                            if (e.ctrlKey || e.metaKey) {
                              window.open(teamUrl, '_blank')
                            } else {
                              router.push(teamUrl)
                            }
                          }}
                          className="flex items-center justify-center gap-1 sm:gap-2 flex-1 lg:flex-none lg:min-w-[140px] lg:justify-start text-xs sm:text-sm"
                        >
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">View Calendar</span>
                          <span className="sm:hidden">Calendar</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            const settingsUrl = `/team/${team.invite_code}/settings`
                            if (e.ctrlKey || e.metaKey) {
                              window.open(settingsUrl, '_blank')
                            } else {
                              router.push(settingsUrl)
                            }
                          }}
                          className="flex items-center justify-center gap-1 sm:gap-2 flex-1 lg:flex-none lg:min-w-[140px] lg:justify-start text-xs sm:text-sm"
                        >
                          <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Manage Team</span>
                          <span className="sm:hidden">Manage</span>
                        </Button>

                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
