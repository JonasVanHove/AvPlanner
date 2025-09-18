"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MemberAvatar } from "@/components/member-avatar"
import { useTodayAvailability } from "@/hooks/use-today-availability"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Loader2, 
  Users, 
  Calendar, 
  Settings, 
  LogOut,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
  RefreshCw,
  Shield,
  User
} from "lucide-react"
import { User as SupabaseUser } from "@supabase/supabase-js"

interface UserTeam {
  team_id: string
  team_name: string
  team_slug: string
  team_invite_code: string
  team_is_password_protected: boolean
  team_created_at: string
  user_role: string
  user_status: string
  member_count: number
  is_creator: boolean
  can_leave: boolean
  last_active: string
}

interface UserProfile {
  user_id: string
  email: string
  first_name: string
  last_name: string
  profile_image_url: string
  total_teams: number
  active_teams: number
  created_at: string
}

interface UserTeamsOverviewProps {
  user: SupabaseUser
}

export function UserTeamsOverview({ user }: UserTeamsOverviewProps) {
  const [teams, setTeams] = useState<UserTeam[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [teamToLeave, setTeamToLeave] = useState<UserTeam | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    fetchUserTeams()
    fetchUserProfile()
  }, [user, refreshKey])

  const fetchUserTeams = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_user_teams_with_status', {
        user_email: user.email
      })

      if (error) {
        throw error
      }

      setTeams(data || [])
    } catch (error: any) {
      console.error('Error fetching user teams:', error)
      setError(error.message || 'Failed to fetch teams')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_profile', {
        user_email: user.email
      })

      if (error) {
        throw error
      }

      setUserProfile(data?.[0] || null)
    } catch (error: any) {
      console.error('Error fetching user profile:', error)
    }
  }

  const handleLeaveTeam = async (team: UserTeam) => {
    setTeamToLeave(team)
  }

  const confirmLeaveTeam = async () => {
    if (!teamToLeave) return

    try {
      setActionLoading(teamToLeave.team_id)
      
      const { error } = await supabase.rpc('leave_team', {
        team_id_param: teamToLeave.team_id,
        user_email: user.email
      })

      if (error) {
        throw error
      }

      // Update local state
      setTeams(teams.map(t => 
        t.team_id === teamToLeave.team_id 
          ? { ...t, user_status: 'left', can_leave: false }
          : t
      ))
      setTeamToLeave(null)
      
      // Show success message
      alert(`You have left the team "${teamToLeave.team_name}"`)
    } catch (error: any) {
      console.error('Error leaving team:', error)
      alert(`Failed to leave team: ${error.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleStatus = async (team: UserTeam) => {
    if (team.user_status === 'left') return

    try {
      setActionLoading(team.team_id)
      
      const { data, error } = await supabase.rpc('toggle_team_status', {
        team_id_param: team.team_id,
        user_email: user.email
      })

      if (error) {
        throw error
      }

      // Update local state
      setTeams(teams.map(t => 
        t.team_id === team.team_id 
          ? { ...t, user_status: data }
          : t
      ))
      
      const statusText = data === 'active' ? 'activated' : 'deactivated'
      alert(`Team "${team.team_name}" has been ${statusText}`)
    } catch (error: any) {
      console.error('Error toggling team status:', error)
      alert(`Failed to update team status: ${error.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'Invalid date'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'inactive': return 'secondary'
      case 'left': return 'destructive'
      default: return 'secondary'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive'
      case 'can_edit': return 'default'
      default: return 'secondary'
    }
  }

  const refreshData = () => {
    setRefreshKey(prev => prev + 1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your teams...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* User Profile Header */}
      {userProfile && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={userProfile.profile_image_url} />
                <AvatarFallback>
                  {userProfile.first_name?.[0]}{userProfile.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">
                  {userProfile.first_name} {userProfile.last_name}
                </CardTitle>
                <p className="text-gray-600">{userProfile.email}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Member since {formatDate(userProfile.created_at)}
                </p>
              </div>
              <div className="ml-auto">
                <Button
                  onClick={refreshData}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Teams</p>
                <p className="text-2xl font-bold">{teams.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <PlayCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Active Teams</p>
                <p className="text-2xl font-bold">
                  {teams.filter(t => t.user_status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Admin Roles</p>
                <p className="text-2xl font-bold">
                  {teams.filter(t => t.user_role === 'admin').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teams Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            My Teams ({teams.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {teams.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>You haven't joined any teams yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Security</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((team) => (
                    <TableRow key={team.team_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{team.team_name}</p>
                          {team.team_slug && (
                            <p className="text-xs text-gray-500">/{team.team_slug}</p>
                          )}
                          {team.is_creator && (
                            <Badge variant="outline" className="mt-1">
                              Creator
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleColor(team.user_role)}>
                          {team.user_role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(team.user_status)}>
                          {team.user_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {team.member_count}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={team.team_is_password_protected ? "destructive" : "secondary"}>
                          {team.team_is_password_protected ? "Protected" : "Open"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{formatDate(team.team_created_at)}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {/* View Team */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const teamUrl = team.team_slug 
                                ? `/team/${team.team_slug}` 
                                : `/team/${team.team_invite_code}`
                              window.open(teamUrl, '_blank')
                            }}
                            disabled={team.user_status === 'left'}
                          >
                            <Calendar className="h-4 w-4" />
                          </Button>
                          
                          {/* Toggle Status */}
                          {team.user_status !== 'left' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleStatus(team)}
                              disabled={actionLoading === team.team_id}
                            >
                              {actionLoading === team.team_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : team.user_status === 'active' ? (
                                <PauseCircle className="h-4 w-4" />
                              ) : (
                                <PlayCircle className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          
                          {/* Leave Team */}
                          {team.can_leave && team.user_status !== 'left' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleLeaveTeam(team)}
                              disabled={actionLoading === team.team_id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {actionLoading === team.team_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <LogOut className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leave Team Confirmation Dialog */}
      <AlertDialog open={!!teamToLeave} onOpenChange={() => setTeamToLeave(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave the team "{teamToLeave?.team_name}"?
              <br /><br />
              This action will:
              <ul className="list-disc ml-6 mt-2">
                <li>Remove you from the team</li>
                <li>Remove your availability data</li>
                <li>You won't be able to rejoin without a new invitation</li>
              </ul>
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmLeaveTeam}
              className="bg-red-600 hover:bg-red-700"
            >
              Leave Team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
