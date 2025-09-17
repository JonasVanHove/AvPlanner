"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { useVersion } from "@/hooks/use-version"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ArrowLeft, Users, Settings, Eye, EyeOff, Crown, Shield, Mail, Save, AlertCircle, UserCheck, UserX, MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface TeamSettings {
  team_id: string
  team_name: string
  team_slug: string
  team_invite_code: string
  team_is_password_protected: boolean
  team_created_at: string
  member_count: number
  hidden_member_count: number
  user_is_admin: boolean
  user_is_creator: boolean
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
  is_hidden: boolean
}

interface TeamSettingsPageProps {
  params: {
    slug: string
  }
}

export default function TeamSettingsPage({ params }: TeamSettingsPageProps) {
  const [teamSettings, setTeamSettings] = useState<TeamSettings | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  
  // Editable settings state
  const [editableSettings, setEditableSettings] = useState({
    team_name: "",
    team_description: "",
    team_is_password_protected: false,
    team_password: ""
  })
  
  const { user } = useAuth()
  const { version, buildInfo, commitMessage } = useVersion()
  const router = useRouter()

  useEffect(() => {
    if (user?.email) {
      fetchTeamSettings()
    }
  }, [params.slug, user])

  const fetchTeamSettings = async () => {
    if (!user?.email) return

    try {
      setIsLoading(true)

      // First get team by slug or invite code
      let { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("id")
        .eq("invite_code", params.slug)
        .single()

      if (teamError && teamError.code === 'PGRST116') {
        const { data: teamBySlug, error: slugError } = await supabase
          .from("teams")
          .select("id")
          .eq("slug", params.slug)
          .single()

        teamData = teamBySlug
        teamError = slugError
      }

      if (teamError || !teamData) throw teamError || new Error("Team niet gevonden")

      // Get team settings
      const { data: settingsData, error: settingsError } = await supabase.rpc('get_team_settings', {
        team_id_param: teamData.id,
        user_email: user.email
      })

      if (settingsError) throw settingsError
      setTeamSettings(settingsData[0] || null)
      
      // Initialize editable settings
      if (settingsData[0]) {
        setEditableSettings({
          team_name: settingsData[0].team_name || "",
          team_description: "", // Add this field to database if needed
          team_is_password_protected: settingsData[0].team_is_password_protected || false,
          team_password: ""
        })
      }

      // Get team members
      const { data: membersData, error: membersError } = await supabase.rpc('get_team_members', {
        team_id_param: teamData.id,
        user_email: user.email
      })

      if (membersError) throw membersError
      setMembers(membersData || [])

    } catch (error: any) {
      console.error("Error fetching team settings:", error)
      setError(error.message || "Er is een fout opgetreden")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSettingChange = (field: string, value: any) => {
    setEditableSettings(prev => ({
      ...prev,
      [field]: value
    }))
    setHasChanges(true)
  }

  const saveTeamSettings = async () => {
    if (!teamSettings || !user?.email) return

    try {
      setIsSaving(true)

      // Update basic team info
      const { error: updateError } = await supabase
        .from('teams')
        .update({
          name: editableSettings.team_name,
          is_password_protected: editableSettings.team_is_password_protected,
          ...(editableSettings.team_password && { password: editableSettings.team_password })
        })
        .eq('id', teamSettings.team_id)

      if (updateError) throw updateError

      // Refresh data
      await fetchTeamSettings()
      setHasChanges(false)
      setSuccessMessage('Team instellingen succesvol opgeslagen!')
      setTimeout(() => setSuccessMessage(''), 3000)

    } catch (error: any) {
      console.error("Error saving team settings:", error)
      setError(`Fout bij opslaan: ${error.message}`)
      setTimeout(() => setError(''), 5000)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleMemberVisibility = async (memberId: string, isHidden: boolean) => {
    if (!teamSettings || !user?.email) return

    try {
      const { error } = await supabase.rpc('toggle_member_visibility', {
        team_id_param: teamSettings.team_id,
        member_id_param: memberId,
        is_hidden_param: !isHidden,
        user_email: user.email
      })

      if (error) throw error

      // Refresh members list
      fetchTeamSettings()
    } catch (error: any) {
      console.error("Error toggling member visibility:", error)
      alert(`Er is een fout opgetreden: ${error.message}`)
    }
  }

  const toggleMemberStatus = async (memberId: string, currentStatus: string) => {
    if (!teamSettings || !user?.email) return

    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
      
      const { error } = await supabase
        .from('members')
        .update({ status: newStatus })
        .eq('id', memberId)
        .eq('team_id', teamSettings.team_id)

      if (error) throw error

      // Refresh members list
      fetchTeamSettings()
    } catch (error: any) {
      console.error("Error updating member status:", error)
      alert(`Er is een fout opgetreden: ${error.message}`)
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

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('nl-NL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return 'Onbekend'
    }
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

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <LoadingSpinner size="lg" text="Team instellingen laden..." showText />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-red-600 mb-2">Fout</h2>
              <p className="text-gray-600">{error}</p>
              <Button onClick={() => router.push('/my-teams')} className="mt-4">
                Ga Terug naar My Teams
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!teamSettings) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Team niet gevonden</h2>
              <p className="text-gray-600">Dit team bestaat niet of je hebt geen toegang.</p>
              <Button onClick={() => router.push('/my-teams')} className="mt-4">
                Ga Terug naar My Teams
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/my-teams">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Terug naar My Teams
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Settings</h1>
            <p className="text-gray-600">{teamSettings.team_name}</p>
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-800">
              <div className="h-4 w-4 rounded-full bg-green-500"></div>
              <p className="font-medium">{successMessage}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <p className="font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Team Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Team Instellingen
              {hasChanges && (
                <Badge variant="secondary" className="ml-2">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Niet opgeslagen
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Settings */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="team-name">Team Naam</Label>
                  <Input
                    id="team-name"
                    value={editableSettings.team_name}
                    onChange={(e) => handleSettingChange('team_name', e.target.value)}
                    disabled={!teamSettings?.user_is_admin}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Invite Code</Label>
                  <div className="flex items-center gap-2">
                    <code className="bg-gray-100 px-3 py-2 rounded text-sm font-mono flex-1">
                      {teamSettings.team_invite_code}
                    </code>
                    <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(teamSettings.team_invite_code)}>
                      Copy
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="team-description">Team Beschrijving</Label>
                <Textarea
                  id="team-description"
                  placeholder="Voeg een beschrijving toe voor je team..."
                  value={editableSettings.team_description}
                  onChange={(e) => handleSettingChange('team_description', e.target.value)}
                  disabled={!teamSettings?.user_is_admin}
                  rows={3}
                />
              </div>
            </div>

            {/* Security Settings */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Beveiliging</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Wachtwoord Beveiliging</Label>
                    <p className="text-sm text-gray-600">
                      Vereist een wachtwoord om lid te worden van dit team
                    </p>
                  </div>
                  <Switch
                    checked={editableSettings.team_is_password_protected}
                    onCheckedChange={(checked) => handleSettingChange('team_is_password_protected', checked)}
                    disabled={!teamSettings?.user_is_admin}
                  />
                </div>

                {editableSettings.team_is_password_protected && (
                  <div className="space-y-2">
                    <Label htmlFor="team-password">Team Wachtwoord</Label>
                    <Input
                      id="team-password"
                      type="password"
                      placeholder="Voer nieuw wachtwoord in (laat leeg om niet te wijzigen)"
                      value={editableSettings.team_password}
                      onChange={(e) => handleSettingChange('team_password', e.target.value)}
                      disabled={!teamSettings?.user_is_admin}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Info Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Team Informatie</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium text-gray-700">Aangemaakt op</label>
                  <p className="text-gray-900">{formatDate(teamSettings.team_created_at)}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Totaal leden</label>
                  <p className="text-gray-900">{members.length}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Team ID</label>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-600">
                    {teamSettings.team_id}
                  </code>
                </div>
                <div>
                  <label className="font-medium text-gray-700">App Versie</label>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-blue-50 px-2 py-1 rounded font-mono text-blue-700">
                      {buildInfo || version}
                    </code>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="h-3 w-3 rounded-full bg-green-400 cursor-help"></div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs space-y-1">
                          <p className="font-medium">Availability Planner {buildInfo || version}</p>
                          {commitMessage && (
                            <p className="text-gray-600 max-w-xs">Laatste commit: {commitMessage}</p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            {teamSettings?.user_is_admin && (
              <div className="border-t pt-6">
                <Button 
                  onClick={saveTeamSettings}
                  disabled={!hasChanges || isSaving}
                  className="w-full sm:w-auto"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Opslaan...' : 'Instellingen Opslaan'}
                </Button>
                {hasChanges && (
                  <p className="text-sm text-amber-600 mt-2">
                    Je hebt niet-opgeslagen wijzigingen
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Members Management */}
        {teamSettings.user_is_admin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Teamleden Beheer ({members.length} leden)
                {teamSettings.hidden_member_count > 0 && (
                  <Badge variant="outline" className="ml-2">
                    {teamSettings.hidden_member_count} verborgen
                  </Badge>
                )}
              </CardTitle>
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <p className="font-medium mb-1">💡 Member Visibility Management</p>
                <ul className="space-y-1 text-xs">
                  <li><strong>Zichtbaar:</strong> Teamlid wordt getoond in overzichten en meegenomen in analytics</li>
                  <li><strong>Verborgen:</strong> Teamlid wordt niet getoond maar blijft lid van het team</li>
                  <li><strong>Actief:</strong> Teamlid kan inloggen en gebruik maken van het systeem</li>
                  <li><strong>Inactief:</strong> Teamlid kan niet inloggen maar data blijft bewaard</li>
                </ul>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {members.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Geen teamleden gevonden</p>
                  </div>
                ) : (
                  <>
                    {/* Summary */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <label className="font-medium text-gray-700">Totaal leden</label>
                          <p className="text-lg font-semibold text-gray-900">{members.length}</p>
                        </div>
                        <div>
                          <label className="font-medium text-gray-700">Zichtbare leden</label>
                          <p className="text-lg font-semibold text-green-600">
                            {members.filter(m => !m.is_hidden).length}
                          </p>
                        </div>
                        <div>
                          <label className="font-medium text-gray-700">Verborgen leden</label>
                          <p className="text-lg font-semibold text-orange-600">
                            {members.filter(m => m.is_hidden).length}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Filter Options */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const visibleMembers = members.filter(m => !m.is_hidden && !m.is_current_user)
                          if (visibleMembers.length > 0 && confirm(`Weet je zeker dat je ${visibleMembers.length} teamleden wilt verbergen?`)) {
                            visibleMembers.forEach(m => toggleMemberVisibility(m.member_id, false))
                          }
                        }}
                        disabled={members.filter(m => !m.is_hidden && !m.is_current_user).length === 0}
                      >
                        <EyeOff className="h-4 w-4 mr-1" />
                        Verberg Alle Anderen ({members.filter(m => !m.is_hidden && !m.is_current_user).length})
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const hiddenMembers = members.filter(m => m.is_hidden)
                          if (hiddenMembers.length > 0 && confirm(`Weet je zeker dat je ${hiddenMembers.length} teamleden wilt tonen?`)) {
                            hiddenMembers.forEach(m => toggleMemberVisibility(m.member_id, true))
                          }
                        }}
                        disabled={members.filter(m => m.is_hidden).length === 0}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Toon Alle Verborgen ({members.filter(m => m.is_hidden).length})
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const inactiveMembers = members.filter(m => m.member_status === 'inactive' && !m.is_current_user)
                          if (inactiveMembers.length > 0 && confirm(`Weet je zeker dat je ${inactiveMembers.length} inactieve teamleden wilt activeren?`)) {
                            inactiveMembers.forEach(m => toggleMemberStatus(m.member_id, m.member_status))
                          }
                        }}
                        disabled={members.filter(m => m.member_status === 'inactive' && !m.is_current_user).length === 0}
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Activeer Alle Inactieve ({members.filter(m => m.member_status === 'inactive' && !m.is_current_user).length})
                      </Button>
                    </div>

                    {/* Members List */}
                    {members.map((member) => (
                      <div key={member.member_id} className={`flex items-center justify-between p-4 border rounded-lg transition-all ${
                        member.is_hidden ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
                      }`}>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.profile_image_url || undefined} />
                            <AvatarFallback>
                              {getInitials(member.member_name, member.member_email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className={`font-medium ${member.is_hidden ? 'text-gray-500' : 'text-gray-900'}`}>
                                {member.member_name.trim() !== '' && member.member_name.trim() !== ' '
                                  ? member.member_name
                                  : member.member_email.split('@')[0]}
                              </p>
                              {member.is_current_user && (
                                <Badge variant="outline" className="text-xs">Jij</Badge>
                              )}
                              {member.is_hidden && (
                                <Badge variant="secondary" className="text-xs bg-gray-200">Verborgen</Badge>
                              )}
                              {getRoleIcon(member.member_role, teamSettings.user_is_creator && member.is_current_user)}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="h-3 w-3" />
                              {member.member_email}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {getRoleBadge(member.member_role, teamSettings.user_is_creator && member.is_current_user)}
                              <Badge variant={member.member_status === 'active' ? 'default' : 'outline'} 
                                className={member.member_status === 'active' ? 'bg-green-500' : 'bg-gray-400'}>
                                {member.member_status === 'active' ? 'Actief' : 'Inactief'}
                              </Badge>
                              {member.last_active && (
                                <Badge variant="outline" className="text-xs">
                                  Laatst: {formatDate(member.last_active)}
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                Lid sinds: {formatDate(member.joined_at)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        {/* Actions - only for non-current user and admin permissions */}
                        {!member.is_current_user && !(teamSettings.user_is_creator && member.member_role === 'admin') && (
                          <div className="flex items-center gap-2">
                            {/* Quick Visibility Toggle */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => toggleMemberVisibility(member.member_id, member.is_hidden)}
                                >
                                  {member.is_hidden ? (
                                    <EyeOff className="h-4 w-4 text-gray-400" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-green-500" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-center">
                                  <p className="font-medium">
                                    {member.is_hidden ? 'Toon dit teamlid' : 'Verberg dit teamlid'}
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1">
                                    {member.is_hidden 
                                      ? 'Wordt getoond in overzichten en analytics'
                                      : 'Wordt verborgen uit overzichten en analytics'
                                    }
                                  </p>
                                </div>
                              </TooltipContent>
                            </Tooltip>

                            {/* More Actions Dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => toggleMemberVisibility(member.member_id, member.is_hidden)}
                                >
                                  {member.is_hidden ? (
                                    <>
                                      <Eye className="h-4 w-4 mr-2" />
                                      Toon in overzicht
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="h-4 w-4 mr-2" />
                                      Verberg uit overzicht
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => toggleMemberStatus(member.member_id, member.member_status)}
                                  className={member.member_status === 'active' ? 'text-orange-600' : 'text-green-600'}
                                >
                                  {member.member_status === 'active' ? (
                                    <>
                                      <UserX className="h-4 w-4 mr-2" />
                                      Zet op Inactief
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="h-4 w-4 mr-2" />
                                      Zet op Actief
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Non-admin view */}
        {!teamSettings.user_is_admin && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Beperkte Toegang</h3>
                <p className="text-gray-600">
                  Je hebt geen beheerder rechten voor dit team. Alleen beheerders kunnen team settings bekijken en wijzigen.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subtle footer with version info */}
        <div className="text-center pt-8 pb-4">
          <p className="text-xs text-gray-400">
            Availability Planner {buildInfo || version} 
            {process.env.NODE_ENV === 'development' && (
              <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-600 rounded text-xs">DEV</span>
            )}
          </p>
          {commitMessage && (
            <p className="text-xs text-gray-300 mt-1 max-w-md mx-auto truncate">
              {commitMessage}
            </p>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
