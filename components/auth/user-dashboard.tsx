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
import { Loader2, Users, Calendar, Settings, LogOut, Crown, Shield, Home, Plus, UserPlus, RefreshCw } from "lucide-react"
import { User } from "@supabase/supabase-js"

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
  joined_at: string
  last_active: string | null
  is_current_user: boolean
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

  useEffect(() => {
    fetchUserTeams()
  }, [user, refreshKey])

  const refreshTeams = () => {
    setRefreshKey(prev => prev + 1)
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
              console.warn(`Failed to load members for team ${team.name}:`, membersError)
              return { ...team, members: [] }
            }
            
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
    <div className="w-full max-w-5xl space-y-8">
      {/* User Profile Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xl">
                  {user.user_metadata?.first_name?.[0] || user.email?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">
                  {user.user_metadata?.first_name || 'User'} {user.user_metadata?.last_name || ''}
                </h2>
                <p className="text-gray-600 text-lg">{user.email}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Member since {formatDate(user.created_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {onGoHome && (
                <Button
                  onClick={onGoHome}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Home
                </Button>
              )}
              <Button
                onClick={handleLogout}
                variant="outline"
                className="flex items-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Team Actions */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Team Management</CardTitle>
                <p className="text-sm text-gray-600 mt-1">Create new teams or join existing ones</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg">
                    <Plus className="h-4 w-4" />
                    Create Team
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <TeamForm locale="en" />
                </DialogContent>
              </Dialog>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2 border-purple-200 hover:bg-purple-50">
                    <UserPlus className="h-4 w-4" />
                    Join Team
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <JoinTeamForm locale="en" />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Teams Overview */}
      <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-xl">My Teams ({teams.length})</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {teams.length === 0 ? 'No teams yet' : `You're a member of ${teams.length} team${teams.length !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            <Button
              onClick={refreshTeams}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 border-green-200 hover:bg-green-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600 font-medium">Error loading teams:</p>
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}
          
          {teams.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No teams yet</h3>
              <p className="text-gray-600 mb-4">You're not a member of any teams yet.</p>
              <p className="text-sm text-gray-500">Create a new team or join an existing one using the buttons above.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {teams.map((team) => (
                <Card key={team.id} className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="font-semibold text-lg">{team.name}</h3>
                          {getRoleIcon(team.user_role, team.is_creator)}
                          {getRoleBadge(team.user_role, team.is_creator)}
                          {team.is_password_protected && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                              🔒 Protected
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700">Your Profile:</span>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={team.profile_image_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {user.user_metadata?.first_name?.[0] || user.email?.[0]?.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-gray-600 text-xs">
                                  {team.profile_image_url && team.profile_image_url.trim() !== '' ? 'Custom image' : 'Default avatar'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700">Team Name:</span>
                              <span className="text-gray-600">{team.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700">Invite Code:</span>
                              <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono select-all">
                                {team.invite_code}
                              </code>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700">Members:</span>
                              <Badge variant="secondary" className="text-xs">
                                {team.member_count} {team.member_count === 1 ? 'member' : 'members'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700">Security:</span>
                              <Badge variant={team.is_password_protected ? "destructive" : "secondary"}>
                                {team.is_password_protected ? 'Protected' : 'Open'}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700">Created:</span>
                              <span className="text-gray-600">{formatDate(team.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700">Team ID:</span>
                              <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono select-all">
                                {team.id.substring(0, 8)}...
                              </code>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700">Your Role:</span>
                              <Badge variant={team.is_creator ? "default" : "secondary"}>
                                {team.is_creator ? 'Creator' : team.user_role}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700">Slug:</span>
                              <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono select-all">
                                {team.slug || 'Not set'}
                              </code>
                            </div>
                          </div>
                        </div>

                        {/* Team Members Section */}
                        {team.members && team.members.length > 0 && (
                          <div className="mt-6 pt-4 border-t border-gray-200">
                            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Team Members ({team.members.length})
                            </h4>
                            <div className="grid gap-2">
                              {team.members.slice(0, 5).map((member) => (
                                <div key={member.member_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={member.profile_image_url || undefined} />
                                      <AvatarFallback className="text-xs">
                                        {getInitials(member.member_name, member.member_email)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-gray-900 truncate">
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
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={getMemberStatusColor(member.member_status)}>
                                      {member.member_status}
                                    </Badge>
                                    {getRoleIcon(member.member_role, false)}
                                    <Badge variant={member.member_role === 'admin' ? "default" : "secondary"} className="text-xs">
                                      {member.member_role}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                              {team.members.length > 5 && (
                                <div className="text-center py-2">
                                  <span className="text-sm text-gray-500">
                                    +{team.members.length - 5} more member{team.members.length - 5 !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const teamUrl = team.slug ? `/team/${team.slug}` : `/team/${team.id}`
                            window.open(teamUrl, '_blank')
                          }}
                          className="flex items-center gap-2 min-w-[140px] justify-start"
                        >
                          <Calendar className="h-4 w-4" />
                          View Calendar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const settingsUrl = team.slug ? `/team/${team.slug}/settings` : `/team/${team.id}/settings`
                            window.open(settingsUrl, '_blank')
                          }}
                          className="flex items-center gap-2 min-w-[140px] justify-start"
                        >
                          <Settings className="h-4 w-4" />
                          Settings
                        </Button>
                        {canManageTeam(team.user_role, team.is_creator) && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-2 min-w-[140px] justify-start border-purple-200 hover:bg-purple-50"
                              >
                                <Shield className="h-4 w-4" />
                                Manage Team
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-5xl">
                              <TeamAdminPanel
                                teamId={team.id}
                                teamName={team.name}
                                user={user}
                              />
                            </DialogContent>
                          </Dialog>
                        )}
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
