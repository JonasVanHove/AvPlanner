"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { 
  Loader2, 
  Trash2, 
  Users, 
  Shield, 
  Calendar, 
  Settings, 
  RefreshCw,
  AlertTriangle,
  Search,
  Download,
  Database,
  Activity,
  Archive,
  Pause,
  Play,
  BarChart3,
  User as UserIcon,
  Eye,
  Edit
} from "lucide-react"
import { User } from "@supabase/supabase-js"
import { MemberAvatar } from "@/components/member-avatar"
import { useTodayAvailability } from "@/hooks/use-today-availability"

interface DatabaseStats {
  total_users: number
  total_teams: number
  active_teams: number
  inactive_teams: number
  archived_teams: number
  total_members: number
  active_members: number
  inactive_members: number
  left_members: number
  total_admins: number
  recent_signups: number
  recent_teams: number
  password_protected_teams: number
  teams_with_availability: number
}

interface DetailedTeam {
  team_id: string
  team_name: string
  team_slug: string
  team_invite_code: string
  team_status: string
  team_is_password_protected: boolean
  team_created_at: string
  team_archived_at: string
  team_archived_by: string
  member_count: number
  active_member_count: number
  inactive_member_count: number
  left_member_count: number
  admin_count: number
  creator_email: string
  creator_name: string
  last_activity: string
  availability_count: number
}

interface AdminUser {
  user_id: string
  user_email: string
  user_name: string
  user_created_at: string
  user_last_sign_in: string
  last_activity_date: string
  total_teams: number
  active_teams: number
  is_admin: boolean
  profile_image_url: string
  email_confirmed: boolean
}

interface RecentActivity {
  activity_type: string
  activity_description: string
  activity_timestamp: string
  related_user_email: string
  related_team_name: string
}

interface AdminDatabaseOverviewProps {
  user: User
}

export function AdminDatabaseOverview({ user }: AdminDatabaseOverviewProps) {
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [teams, setTeams] = useState<DetailedTeam[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [activity, setActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'users' | 'activity'>('overview')
  const [searchTerm, setSearchTerm] = useState("")
  const [teamStatusFilter, setTeamStatusFilter] = useState("all")
  const [userSortBy, setUserSortBy] = useState<'name' | 'email' | 'created' | 'activity'>('activity')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [teamToUpdate, setTeamToUpdate] = useState<{team: DetailedTeam, newStatus: string} | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Get user IDs for today's availability (from the users list)
  const userIds = users.map(user => user.user_id)
  const { todayAvailability } = useTodayAvailability(userIds)

  useEffect(() => {
    checkAdminStatus()
  }, [user])

  useEffect(() => {
    if (isAdmin) {
      fetchAllData()
    }
  }, [isAdmin, refreshKey])

  const checkAdminStatus = async () => {
    try {
      // Check if user has at least one admin role in any active team
      const { data, error } = await supabase
        .from('members')
        .select('role, status')
        .eq('email', user.email)
        .eq('role', 'admin')
        .eq('status', 'active')

      if (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
        setError('Failed to verify admin status')
        return
      }

      // User is admin if they have at least one active admin membership
      if (data && data.length > 0) {
        setIsAdmin(true)
      } else {
        setIsAdmin(false)
        setError('Access denied: You need admin privileges to access this panel')
      }
    } catch (error) {
      console.error('Error checking admin status:', error)
      setError('Failed to verify admin status')
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllData = async () => {
    try {
      setLoading(true)
      
      // Fetch all statistics in parallel
      const [
        usersCount,
        teamsCount,
        activeTeamsCount,
        inactiveTeamsCount,
        archivedTeamsCount,
        membersCount,
        activeMembersCount,
        inactiveMembersCount,
        leftMembersCount,
        adminsCount,
        passwordProtectedCount,
        teamsData,
        usersData
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('teams').select('*', { count: 'exact', head: true }),
        supabase.from('teams').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('teams').select('*', { count: 'exact', head: true }).eq('status', 'inactive'),
        supabase.from('teams').select('*', { count: 'exact', head: true }).eq('status', 'archived'),
        supabase.from('members').select('*', { count: 'exact', head: true }),
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'inactive'),
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'left'),
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('role', 'admin').eq('status', 'active'),
        supabase.from('teams').select('*', { count: 'exact', head: true }).eq('is_password_protected', true),
        // Fetch all teams with member counts
        supabase.from('teams').select(`
          id,
          name,
          slug,
          invite_code,
          status,
          is_password_protected,
          created_at,
          archived_at,
          archived_by,
          auto_holidays_enabled,
          created_by
        `).order('created_at', { ascending: false }),
        // Fetch all users with basic info
        supabase.from('users').select('*').order('created_at', { ascending: false })
      ])

      // Set statistics
      setStats({
        total_users: usersCount.count || 0,
        total_teams: teamsCount.count || 0,
        active_teams: activeTeamsCount.count || 0,
        inactive_teams: inactiveTeamsCount.count || 0,
        archived_teams: archivedTeamsCount.count || 0,
        total_members: membersCount.count || 0,
        active_members: activeMembersCount.count || 0,
        inactive_members: inactiveMembersCount.count || 0,
        left_members: leftMembersCount.count || 0,
        total_admins: adminsCount.count || 0,
        recent_signups: 0, // Can be calculated if needed
        recent_teams: 0, // Can be calculated if needed
        password_protected_teams: passwordProtectedCount.count || 0,
        teams_with_availability: 0 // Can be calculated if needed
      })

      // Process teams data with member counts
      if (teamsData.data) {
        const teamsWithCounts = await Promise.all(
          teamsData.data.map(async (team: any) => {
            const [
              { count: totalMembers },
              { count: activeMembers },
              { count: inactiveMembers },
              { count: leftMembers },
              { count: admins },
              { count: availabilityCount }
            ] = await Promise.all([
              supabase.from('members').select('*', { count: 'exact', head: true }).eq('team_id', team.id),
              supabase.from('members').select('*', { count: 'exact', head: true }).eq('team_id', team.id).eq('status', 'active'),
              supabase.from('members').select('*', { count: 'exact', head: true }).eq('team_id', team.id).eq('status', 'inactive'),
              supabase.from('members').select('*', { count: 'exact', head: true }).eq('team_id', team.id).eq('status', 'left'),
              supabase.from('members').select('*', { count: 'exact', head: true }).eq('team_id', team.id).eq('role', 'admin'),
              supabase.from('availability').select('*', { count: 'exact', head: true }).in('member_id', 
                (await supabase.from('members').select('id').eq('team_id', team.id)).data?.map(m => m.id) || []
              )
            ])

            // Get creator info
            let creatorEmail = ''
            let creatorName = ''
            if (team.created_by) {
              const { data: creator } = await supabase
                .from('users')
                .select('email, first_name, last_name')
                .eq('id', team.created_by)
                .single()
              
              if (creator) {
                creatorEmail = creator.email
                creatorName = `${creator.first_name || ''} ${creator.last_name || ''}`.trim()
              }
            }

            return {
              team_id: team.id,
              team_name: team.name,
              team_slug: team.slug || '',
              team_invite_code: team.invite_code,
              team_status: team.status,
              team_is_password_protected: team.is_password_protected,
              team_created_at: team.created_at,
              team_archived_at: team.archived_at || '',
              team_archived_by: team.archived_by || '',
              member_count: totalMembers || 0,
              active_member_count: activeMembers || 0,
              inactive_member_count: inactiveMembers || 0,
              left_member_count: leftMembers || 0,
              admin_count: admins || 0,
              creator_email: creatorEmail,
              creator_name: creatorName,
              last_activity: '', // Can be calculated if needed
              availability_count: availabilityCount || 0
            }
          })
        )
        setTeams(teamsWithCounts as DetailedTeam[])
      }

      // Process users data
      if (usersData.data) {
        const usersWithCounts = await Promise.all(
          usersData.data.map(async (userData: any) => {
            const [
              { count: teamCount },
              { count: activeTeamCount }
            ] = await Promise.all([
              supabase.from('members').select('*', { count: 'exact', head: true }).eq('auth_user_id', userData.id),
              supabase.from('members').select('*', { count: 'exact', head: true }).eq('auth_user_id', userData.id).eq('status', 'active')
            ])

            // Check if user is admin in any team
            const { data: adminCheck } = await supabase
              .from('members')
              .select('role')
              .eq('auth_user_id', userData.id)
              .eq('role', 'admin')
              .eq('status', 'active')

            // Get last activity from availability table via member_id
            // First get all member_ids for this user
            const { data: memberIds } = await supabase
              .from('members')
              .select('id')
              .eq('auth_user_id', userData.id)

            let lastActivityDate = ''
            if (memberIds && memberIds.length > 0) {
              const memberIdList = memberIds.map(m => m.id)
              
              // Get the most recent availability record based on updated_at timestamp
              const { data: lastActivity } = await supabase
                .from('availability')
                .select('updated_at')
                .in('member_id', memberIdList)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single()

              lastActivityDate = lastActivity?.updated_at || ''
            }

            const isUserAdmin = adminCheck && adminCheck.length > 0

            return {
              user_id: userData.id,
              user_email: userData.email,
              user_name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
              user_created_at: userData.created_at,
              user_last_sign_in: '', // Not available in users table
              last_activity_date: lastActivityDate,
              total_teams: teamCount || 0,
              active_teams: activeTeamCount || 0,
              is_admin: isUserAdmin,
              profile_image_url: userData.profile_image_url || '',
              email_confirmed: true // Assume true if in users table
            }
          })
        )
        setUsers(usersWithCounts as AdminUser[])
      }

    } catch (error: any) {
      console.error('Error fetching data:', error)
      setError(error.message || 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateTeamStatus = async (team: DetailedTeam, newStatus: string) => {
    setTeamToUpdate({ team, newStatus })
  }

  const confirmUpdateTeamStatus = async () => {
    if (!teamToUpdate) return

    try {
      setActionLoading(teamToUpdate.team.team_id)
      
      const updateData: any = { 
        status: teamToUpdate.newStatus
      }
      
      // Add archived info if archiving
      if (teamToUpdate.newStatus === 'archived') {
        updateData.archived_at = new Date().toISOString()
        updateData.archived_by = user.email
      }
      
      const { error } = await supabase
        .from('teams')
        .update(updateData)
        .eq('id', teamToUpdate.team.team_id)

      if (error) throw error

      // Refresh data to get updated counts
      await fetchAllData()
      
      setTeamToUpdate(null)
      setError('')
      alert(`Team "${teamToUpdate.team.team_name}" status updated to ${teamToUpdate.newStatus}`)
    } catch (error: any) {
      console.error('Error updating team status:', error)
      setError(`Failed to update team status: ${error.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteTeam = async (team: DetailedTeam) => {
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE the team "${team.team_name}"? This action cannot be undone.`)) {
      return
    }

    try {
      setActionLoading(team.team_id)
      
      const { error } = await supabase.rpc('delete_team_admin', {
        team_id_param: team.team_id,
        admin_email: user.email
      })

      if (error) throw error

      // Remove from local state
      setTeams(teams.filter(t => t.team_id !== team.team_id))
      
      alert(`Team "${team.team_name}" has been permanently deleted`)
    } catch (error: any) {
      console.error('Error deleting team:', error)
      alert(`Failed to delete team: ${error.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Invalid date'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'inactive': return 'secondary'
      case 'archived': return 'destructive'
      default: return 'secondary'
    }
  }

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'user_signup': return 'default'
      case 'team_created': return 'default'
      case 'member_joined': return 'secondary'
      default: return 'secondary'
    }
  }

  const filteredTeams = teams.filter(team => {
  const matchesSearch = (team.team_name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
             (team.team_invite_code ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  const matchesStatus = teamStatusFilter === 'all' || team.team_status === teamStatusFilter
  return matchesSearch && matchesStatus
  })

  const filteredUsers = users
    .filter(user => 
      (user.user_email ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.user_name ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (userSortBy) {
        case 'name':
          return (a.user_name || a.user_email).localeCompare(b.user_name || b.user_email)
        case 'email':
          return a.user_email.localeCompare(b.user_email)
        case 'created':
          return new Date(b.user_created_at).getTime() - new Date(a.user_created_at).getTime()
        case 'activity':
          // Sort by last activity, most recent first (empty dates last)
          if (!a.last_activity_date && !b.last_activity_date) return 0
          if (!a.last_activity_date) return 1
          if (!b.last_activity_date) return -1
          return new Date(b.last_activity_date).getTime() - new Date(a.last_activity_date).getTime()
        default:
          return 0
      }
    })

  const refreshData = () => {
    setRefreshKey(prev => prev + 1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading database overview...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Access denied: You don't have administrator privileges.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-2xl text-blue-800">Database Overview</CardTitle>
                <p className="text-blue-600 mt-1">Complete system administration & monitoring</p>
              </div>
            </div>
            <Button
              onClick={refreshData}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 border-blue-200 hover:bg-blue-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search teams, users, or activities..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Teams
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {stats && (
            <>
              {/* System Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{stats.total_users}</p>
                      <p className="text-sm text-gray-600">Total Users</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{stats.total_teams}</p>
                      <p className="text-sm text-gray-600">Total Teams</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-600">{stats.active_teams}</p>
                      <p className="text-sm text-gray-600">Active Teams</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-600">{stats.inactive_teams}</p>
                      <p className="text-sm text-gray-600">Inactive Teams</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{stats.archived_teams}</p>
                      <p className="text-sm text-gray-600">Archived Teams</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">{stats.total_admins}</p>
                      <p className="text-sm text-gray-600">Admin Users</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">{stats.recent_signups}</p>
                      <p className="text-sm text-gray-600">Recent Signups</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Member Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Member Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-600">{stats.active_members}</p>
                      <p className="text-sm text-gray-600">Active Members</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-yellow-600">{stats.inactive_members}</p>
                      <p className="text-sm text-gray-600">Inactive Members</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-red-600">{stats.left_members}</p>
                      <p className="text-sm text-gray-600">Left Members</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-blue-600">{stats.total_members}</p>
                      <p className="text-sm text-gray-600">Total Members</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-indigo-600">{stats.password_protected_teams}</p>
                      <p className="text-sm text-gray-600">Password Protected Teams</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-teal-600">{stats.teams_with_availability}</p>
                      <p className="text-sm text-gray-600">Teams with Availability</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-pink-600">{stats.recent_teams}</p>
                      <p className="text-sm text-gray-600">Recent Teams (7 days)</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={teamStatusFilter} onValueChange={setTeamStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Teams Management ({filteredTeams.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {filteredTeams.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>{searchTerm ? `No teams found matching "${searchTerm}"` : 'No teams found'}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Team Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Creator</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Last Activity</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTeams.map((team) => (
                        <TableRow key={team.team_id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{team.team_name}</p>
                              <p className="text-xs text-gray-500">{team.team_invite_code}</p>
                              {team.team_is_password_protected && (
                                <Badge variant="outline" className="mt-1">
                                  <Shield className="h-3 w-3 mr-1" />
                                  Protected
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(team.team_status)}>
                              {team.team_status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-sm">
                                <span className="font-medium text-green-600">{team.active_member_count}</span> active
                              </p>
                              <p className="text-xs text-gray-500">
                                {team.inactive_member_count} inactive, {team.left_member_count} left
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{team.creator_name}</p>
                              <p className="text-xs text-gray-500">{team.creator_email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{formatDate(team.team_created_at)}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{formatDate(team.last_activity)}</p>
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
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              
                              {/* Status Actions */}
                              {team.team_status === 'active' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateTeamStatus(team, 'inactive')}
                                  disabled={actionLoading === team.team_id}
                                >
                                  {actionLoading === team.team_id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Pause className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              
                              {team.team_status === 'inactive' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUpdateTeamStatus(team, 'active')}
                                    disabled={actionLoading === team.team_id}
                                  >
                                    {actionLoading === team.team_id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Play className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUpdateTeamStatus(team, 'archived')}
                                    disabled={actionLoading === team.team_id}
                                  >
                                    {actionLoading === team.team_id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Archive className="h-4 w-4" />
                                    )}
                                  </Button>
                                </>
                              )}
                              
                              {team.team_status === 'archived' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateTeamStatus(team, 'active')}
                                  disabled={actionLoading === team.team_id}
                                >
                                  {actionLoading === team.team_id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Play className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              
                              {/* Delete Team */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteTeam(team)}
                                disabled={actionLoading === team.team_id}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                {actionLoading === team.team_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
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
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Users Management ({filteredUsers.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={userSortBy} onValueChange={(value: any) => setUserSortBy(value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sort by..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activity">Recent Activity</SelectItem>
                      <SelectItem value="created">Recently Joined</SelectItem>
                      <SelectItem value="name">Name (A-Z)</SelectItem>
                      <SelectItem value="email">Email (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <UserIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>{searchTerm ? `No users found matching "${searchTerm}"` : 'No users found'}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email Status</TableHead>
                        <TableHead>Teams</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Last Activity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((userData) => (
                        <TableRow key={userData.user_id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <MemberAvatar
                                firstName={userData.user_name.split(' ')[0] || userData.user_email.split('@')[0]}
                                lastName={userData.user_name.split(' ').slice(1).join(' ') || ''}
                                profileImage={userData.profile_image_url || undefined}
                                size="md"
                                statusIndicator={{
                                  show: true,
                                  status: todayAvailability[userData.user_id]
                                }}
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{userData.user_name || userData.user_email}</p>
                                  {user.id === userData.user_id && (
                                    <Badge variant="outline" className="text-xs">Me</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">{userData.user_email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={userData.email_confirmed ? 'default' : 'secondary'}>
                              {userData.email_confirmed ? 'Confirmed' : 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{userData.active_teams} active</p>
                              <p className="text-xs text-gray-500">{userData.total_teams} total</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={userData.is_admin ? 'destructive' : 'secondary'}>
                              {userData.is_admin ? 'Admin' : 'User'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{formatDate(userData.user_created_at)}</p>
                          </TableCell>
                          <TableCell>
                            {userData.last_activity_date ? (
                              <div>
                                <p className="text-sm font-medium">{formatDate(userData.last_activity_date)}</p>
                                <p className="text-xs text-gray-500">
                                  {(() => {
                                    const days = Math.floor((new Date().getTime() - new Date(userData.last_activity_date).getTime()) / (1000 * 60 * 60 * 24))
                                    if (days === 0) return 'Today'
                                    if (days === 1) return 'Yesterday'
                                    if (days < 7) return `${days} days ago`
                                    if (days < 30) return `${Math.floor(days / 7)} weeks ago`
                                    return `${Math.floor(days / 30)} months ago`
                                  })()}
                                </p>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400">No activity yet</p>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity ({activity.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No recent activity found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activity.map((item, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="flex-shrink-0">
                        <Badge variant={getActivityTypeColor(item.activity_type)}>
                          {item.activity_type}
                        </Badge>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.activity_description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{formatDate(item.activity_timestamp)}</span>
                          {item.related_user_email && (
                            <span>User: {item.related_user_email}</span>
                          )}
                          {item.related_team_name && (
                            <span>Team: {item.related_team_name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status Update Confirmation Dialog */}
      <AlertDialog open={!!teamToUpdate} onOpenChange={() => setTeamToUpdate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Team Status</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change the status of "{teamToUpdate?.team.team_name}" to {teamToUpdate?.newStatus}?
              
              {teamToUpdate?.newStatus === 'archived' && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800">Warning:</p>
                  <p className="text-sm text-yellow-700">
                    Archiving a team will also set all active members to inactive status.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUpdateTeamStatus}>
              Update Status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
