"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Crown, Edit, User, Shield } from "lucide-react"
import { User as SupabaseUser } from "@supabase/supabase-js"

interface TeamMember {
  member_id: string
  member_name: string
  member_email: string
  member_role: string
  can_edit_availability: boolean
  joined_at: string
}

interface TeamAdminPanelProps {
  teamId: string
  teamName: string
  user: SupabaseUser
  onClose?: () => void
}

export function TeamAdminPanel({ teamId, teamName, user, onClose }: TeamAdminPanelProps) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchTeamMembers()
  }, [teamId])

  const fetchTeamMembers = async () => {
    try {
      setError("")
      const { data, error } = await supabase.rpc('get_team_members_with_roles', {
        team_id_param: teamId,
        user_email: user.email
      })

      if (error) throw error
      setMembers(data || [])
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const updateMemberRole = async (memberId: string, newRole: string) => {
    try {
      setUpdating(memberId)
      setError("")

      const { error } = await supabase
        .from('members')
        .update({ role: newRole })
        .eq('id', memberId)

      if (error) throw error

      // Refresh the list
      await fetchTeamMembers()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setUpdating(null)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-yellow-500" />
      case 'can_edit':
        return <Edit className="h-4 w-4 text-blue-500" />
      default:
        return <User className="h-4 w-4 text-gray-500" />
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="default" className="bg-yellow-500">Admin</Badge>
      case 'can_edit':
        return <Badge variant="secondary">Can Edit</Badge>
      default:
        return <Badge variant="outline">Member</Badge>
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
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Admin Panel - {teamName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Team Members ({members.length})</h3>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </div>

          <div className="grid gap-4">
            {members.map((member) => (
              <Card key={member.member_id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {member.member_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{member.member_name}</h4>
                          {getRoleIcon(member.member_role)}
                        </div>
                        <p className="text-sm text-gray-600">{member.member_email}</p>
                        <p className="text-xs text-gray-500">
                          Joined: {new Date(member.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getRoleBadge(member.member_role)}
                      <Select
                        value={member.member_role}
                        onValueChange={(value) => updateMemberRole(member.member_id, value)}
                        disabled={updating === member.member_id}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="can_edit">Can Edit</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      {updating === member.member_id && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium mb-2">Role Permissions:</h4>
          <ul className="text-sm space-y-1">
            <li><strong>Admin:</strong> Can edit all availability and manage member roles</li>
            <li><strong>Can Edit:</strong> Can edit availability for all team members</li>
            <li><strong>Member:</strong> Can only edit their own availability</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
