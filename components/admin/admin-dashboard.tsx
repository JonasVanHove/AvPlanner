"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  Trash2, 
  Users, 
  Shield, 
  Calendar, 
  Settings, 
  RefreshCw,
  AlertTriangle,
  Search,
  Download
} from "lucide-react"
import { User } from "@supabase/supabase-js"

interface AdminTeam {
  team_id: string
  team_name: string
  team_slug: string
  team_invite_code: string
  team_is_password_protected: boolean
  team_created_at: string
  member_count: number
  creator_email: string
  creator_name: string
}

interface AdminUser {
  member_id: string
  admin_email: string
  admin_name: string
  granted_by: string
  granted_at: string
  is_active: boolean
}

interface AdminDashboardProps {
  user: User
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [teams, setTeams] = useState<AdminTeam[]>([])
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [deletingTeam, setDeletingTeam] = useState<string | null>(null)
  const [teamToDelete, setTeamToDelete] = useState<AdminTeam | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeTab, setActiveTab] = useState<'teams' | 'admins'>('teams')
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    checkAdminStatus()
  }, [user])

  useEffect(() => {
    if (isAdmin) {
      fetchAllTeams()
      fetchAdminUsers()
    }
  }, [isAdmin, refreshKey])

  const checkAdminStatus = async () => {
    try {
      // Use members table: check role field for 'admin'
      const { data, error } = await supabase
        .from('members')
        .select('email, role, status')
        .eq('email', user.email)
        .eq('role', 'admin')
        .eq('status', 'active')
        .limit(1)
        .single()

      if (error || !data) {
        setIsAdmin(false)
        setError('Access denied: You are not an admin')
        return
      }

      if (data.role === 'admin') {
        setIsAdmin(true)
      } else {
        setIsAdmin(false)
        setError('Access denied: You are not an admin')
      }
    } catch (error) {
      console.error('Error checking admin status:', error)
      setError('Failed to verify admin status')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllTeams = async () => {
    try {
      setLoading(true)
      
      // In admin mode, fetch ALL teams from the database
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          slug,
          invite_code,
          is_password_protected,
          created_at,
          created_by,
          status
        `)
        .order('created_at', { ascending: false })

      if (teamsError) throw teamsError

      // Get member counts for each team
      const teamsWithCounts = await Promise.all(
        (teams || []).map(async (team) => {
          const { count } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id)

          // Get creator email and name
          const { data: creator } = await supabase
            .from('users')
            .select('email, first_name, last_name')
            .eq('id', team.created_by)
            .single()

          return {
            team_id: team.id,
            team_name: team.name,
            team_slug: team.slug,
            team_invite_code: team.invite_code,
            team_is_password_protected: team.is_password_protected,
            team_created_at: team.created_at,
            member_count: count || 0,
            creator_email: creator?.email || 'Unknown',
            creator_name: creator?.first_name && creator?.last_name 
              ? `${creator.first_name} ${creator.last_name}` 
              : creator?.email || 'Unknown'
          }
        })
      )

      setTeams(teamsWithCounts)
    } catch (error: any) {
      console.error('Error fetching teams:', error)
      setError(error.message || 'Failed to fetch teams')
    } finally {
      setLoading(false)
    }
  }

  const fetchAdminUsers = async () => {
    try {
      // Haal alle users op met role 'admin'
      const { data, error } = await supabase
        .from('members')
        .select(`
          id,
          email,
          first_name,
          last_name,
          role,
          status,
          created_at
        `)
        .eq('role', 'admin')
        .eq('status', 'active')

      if (error) throw error

      const adminUsers = (data || []).map(member => ({
        member_id: member.id,
        admin_email: member.email,
        admin_name: member.first_name && member.last_name 
          ? `${member.first_name} ${member.last_name}` 
          : member.email,
        granted_by: 'System',
        granted_at: member.created_at,
        is_active: member.status === 'active'
      }))

      setAdminUsers(adminUsers)
    } catch (error: any) {
      console.error('Error fetching admin users:', error)
      setError(error.message || 'Failed to fetch admin users')
    }
  }

  const handleDeleteTeam = async (team: AdminTeam) => {
    setTeamToDelete(team)
  }

  const confirmDeleteTeam = async () => {
    if (!teamToDelete) return

    try {
      setDeletingTeam(teamToDelete.team_id)
      
      const { data, error } = await supabase.rpc('delete_team_admin', {
        team_id_param: teamToDelete.team_id,
        admin_email: user.email
      })

      if (error) {
        throw error
      }

      // Remove from local state
      setTeams(teams.filter(t => t.team_id !== teamToDelete.team_id))
      setTeamToDelete(null)
      
      // Show success message
      alert(`Team "${teamToDelete.team_name}" has been deleted successfully`)
    } catch (error: any) {
      console.error('Error deleting team:', error)
      alert(`Failed to delete team: ${error.message}`)
    } finally {
      setDeletingTeam(null)
    }
  }

  const formatDate = (dateString: string) => {
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

  const refreshTeams = () => {
    setRefreshKey(prev => prev + 1)
  }

  // Filter teams based on search term
  const filteredTeams = teams.filter(team => 
    (team.team_name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (team.team_invite_code ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (team.creator_email ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (team.creator_name ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Filter admin users based on search term
  const filteredAdminUsers = adminUsers.filter(admin =>
    (admin.admin_email ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (admin.admin_name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (admin.granted_by ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const exportTeamsData = () => {
    const csvData = [
      ['Team Name', 'Invite Code', 'Members', 'Creator Email', 'Creator Name', 'Created Date', 'Password Protected'],
      ...filteredTeams.map(team => [
        team.team_name,
        team.team_invite_code,
        team.member_count.toString(),
        team.creator_email,
        team.creator_name,
        formatDate(team.team_created_at),
        team.team_is_password_protected ? 'Yes' : 'No'
      ])
    ]
    
    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `teams-export-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading admin dashboard...</p>
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
            Access denied: You don't have administrator privileges. Admin access can only be granted by modifying the database directly.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-2xl text-red-800">Admin Dashboard</CardTitle>
                <p className="text-red-600 mt-1">Manage all teams across the application</p>
              </div>
            </div>
            <Button
              onClick={refreshTeams}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 border-red-200 hover:bg-red-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <Shield className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Protected Teams</p>
                <p className="text-2xl font-bold">
                  {teams.filter(t => t.team_is_password_protected).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Total Members</p>
                <p className="text-2xl font-bold">
                  {teams.reduce((sum, t) => sum + t.member_count, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Settings className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Admin Users</p>
                <p className="text-2xl font-bold">
                  {adminUsers.filter(u => u.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search teams or admin users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <Button
          variant={activeTab === 'teams' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('teams')}
          className="flex items-center gap-2"
        >
          <Users className="h-4 w-4" />
          Teams
        </Button>
        <Button
          variant={activeTab === 'admins' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('admins')}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Admin Users
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'teams' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Teams ({filteredTeams.length}{filteredTeams.length !== teams.length ? ` of ${teams.length}` : ''})
              </CardTitle>
              {filteredTeams.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportTeamsData}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              )}
            </div>
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
                    <TableHead>Invite Code</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Creator</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Security</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeams.map((team) => (
                    <TableRow key={team.team_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{team.team_name}</p>
                          {team.team_slug && (
                            <p className="text-xs text-gray-500">/{team.team_slug}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {team.team_invite_code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {team.member_count}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{team.creator_name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{team.creator_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{formatDate(team.team_created_at)}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={team.team_is_password_protected ? "destructive" : "secondary"}>
                          {team.team_is_password_protected ? "Protected" : "Open"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
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
                            <Calendar className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteTeam(team)}
                            disabled={deletingTeam === team.team_id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            {deletingTeam === team.team_id ? (
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
      )}

      {/* Admin Users Tab */}
      {activeTab === 'admins' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Admin Users ({filteredAdminUsers.filter(u => u.is_active).length}{filteredAdminUsers.filter(u => u.is_active).length !== adminUsers.filter(u => u.is_active).length ? ` of ${adminUsers.filter(u => u.is_active).length}` : ''})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {filteredAdminUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Settings className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>{searchTerm ? `No admin users found matching "${searchTerm}"` : 'No admin users found'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Granted By</TableHead>
                      <TableHead>Granted At</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAdminUsers.map((admin) => (
                      <TableRow key={admin.member_id}>
                        <TableCell className="font-medium">
                          {admin.admin_email}
                        </TableCell>
                        <TableCell>
                          {admin.admin_name}
                        </TableCell>
                        <TableCell>
                          {admin.granted_by || 'System'}
                        </TableCell>
                        <TableCell>
                          {formatDate(admin.granted_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={admin.is_active ? 'default' : 'secondary'}>
                            {admin.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!teamToDelete} onOpenChange={() => setTeamToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the team "{teamToDelete?.team_name}" and all associated data including:
              <ul className="list-disc ml-6 mt-2">
                <li>{teamToDelete?.member_count} team members</li>
                <li>All availability data</li>
                <li>Team settings and configuration</li>
              </ul>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTeam}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
