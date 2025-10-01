"use client"

import { useState, useEffect, use } from "react"
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { useVersion } from "@/hooks/use-version"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ArrowLeft, Users, Settings, Eye, EyeOff, Crown, Shield, Mail, Save, AlertCircle, UserCheck, UserX, Trash2, CheckSquare, Square, MinusSquare, Calendar, CalendarDays } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MemberAvatar } from "@/components/member-avatar"
import { useTodayAvailability } from "@/hooks/use-today-availability"
import { HolidayManagement } from "@/components/holiday-management"

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
  params: Promise<{
    slug: string
  }>
}

export default function TeamSettingsPage({ params }: TeamSettingsPageProps) {
  const resolvedParams = use(params)
  const [teamSettings, setTeamSettings] = useState<TeamSettings | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  
  // Bulk operations state
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [bulkAction, setBulkAction] = useState<'hide' | 'show' | 'activate' | 'deactivate' | 'set_availability' | null>(null)
  const [isBulkOperating, setIsBulkOperating] = useState(false)
  
  // Date range state for bulk availability operations
  const [dateRange, setDateRange] = useState({
    from: new Date().toISOString().split('T')[0], // Today as default
    to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Next week as default
  })
  const [bulkAvailabilityStatus, setBulkAvailabilityStatus] = useState<'available' | 'unavailable' | 'maybe'>('available')

  // Date preset helper functions
  const getDatePresets = () => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    
    const thisWeekStart = new Date(today)
    thisWeekStart.setDate(today.getDate() - today.getDay() + 1) // Monday
    const thisWeekEnd = new Date(thisWeekStart)
    thisWeekEnd.setDate(thisWeekStart.getDate() + 6) // Sunday
    
    const nextWeekStart = new Date(thisWeekStart)
    nextWeekStart.setDate(thisWeekStart.getDate() + 7)
    const nextWeekEnd = new Date(nextWeekStart)
    nextWeekEnd.setDate(nextWeekStart.getDate() + 6)
    
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    
    const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0)

    return [
      {
        label: "Vandaag",
        from: today.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0],
        icon: "📅"
      },
      {
        label: "Morgen", 
        from: tomorrow.toISOString().split('T')[0],
        to: tomorrow.toISOString().split('T')[0],
        icon: "📆"
      },
      {
        label: "Deze Week",
        from: thisWeekStart.toISOString().split('T')[0],
        to: thisWeekEnd.toISOString().split('T')[0],
        icon: "📋"
      },
      {
        label: "Volgende Week",
        from: nextWeekStart.toISOString().split('T')[0], 
        to: nextWeekEnd.toISOString().split('T')[0],
        icon: "📊"
      },
      {
        label: "Deze Maand",
        from: thisMonthStart.toISOString().split('T')[0],
        to: thisMonthEnd.toISOString().split('T')[0],
        icon: "🗓️"
      },
      {
        label: "Volgende Maand",
        from: nextMonthStart.toISOString().split('T')[0],
        to: nextMonthEnd.toISOString().split('T')[0],
        icon: "📈"
      }
    ]
  }

  const applyDatePreset = (preset: { from: string, to: string }) => {
    setDateRange(preset)
  }

  const getDayCount = (from: string, to: string) => {
    const fromDate = new Date(from)
    const toDate = new Date(to)
    return Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }

  const formatDateRange = (from: string, to: string) => {
    const fromDate = new Date(from)
    const toDate = new Date(to)
    const dayCount = getDayCount(from, to)
    
    if (from === to) {
      return `${fromDate.toLocaleDateString('nl-NL')} (1 dag)`
    }
    return `${fromDate.toLocaleDateString('nl-NL')} - ${toDate.toLocaleDateString('nl-NL')} (${dayCount} dagen)`
  }
  
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

  // Get member IDs for today's availability
  const memberIds = members.map(member => member.member_id)
  const { todayAvailability } = useTodayAvailability(memberIds)

  useEffect(() => {
    if (user?.email) {
      fetchTeamSettings()
    }
  }, [resolvedParams.slug, user])

  // Clear selection when members change
  useEffect(() => {
    setSelectedMembers(prev => 
      prev.filter(id => members.some(m => m.member_id === id && !m.is_current_user))
    )
  }, [members])

  const fetchTeamSettings = async () => {
    if (!user?.email) return

    try {
      setIsLoading(true)

      // First get team by slug or invite code
      let { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("id")
        .eq("invite_code", resolvedParams.slug)
        .single()

      if (teamError && teamError.code === 'PGRST116') {
        const { data: teamBySlug, error: slugError } = await supabase
          .from("teams")
          .select("id")
          .eq("slug", resolvedParams.slug)
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

  // Bulk operations functions
  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
  }

  const selectAllMembers = () => {
    const eligibleMembers = members.filter(m => !m.is_current_user)
    setSelectedMembers(eligibleMembers.map(m => m.member_id))
  }

  const clearSelection = () => {
    setSelectedMembers([])
  }

  const getSelectedMembers = () => {
    return members.filter(m => selectedMembers.includes(m.member_id))
  }

  const handleBulkAction = (action: 'hide' | 'show' | 'activate' | 'deactivate' | 'set_availability') => {
    if (selectedMembers.length === 0) return
    
    setBulkAction(action)
    setShowBulkDialog(true)
  }

  const executeBulkAction = async () => {
    if (!bulkAction || selectedMembers.length === 0 || !teamSettings || !user?.email) return

    try {
      setIsBulkOperating(true)
      
      const selectedMembersList = getSelectedMembers()
      let successCount = 0
      let errorCount = 0

      for (const member of selectedMembersList) {
        try {
          if (bulkAction === 'hide' || bulkAction === 'show') {
            const { error } = await supabase.rpc('toggle_member_visibility', {
              team_id_param: teamSettings.team_id,
              member_id_param: member.member_id,
              is_hidden_param: bulkAction === 'hide',
              user_email: user.email
            })
            if (error) throw error
          } else if (bulkAction === 'activate' || bulkAction === 'deactivate') {
            const newStatus = bulkAction === 'activate' ? 'active' : 'inactive'
            const { error } = await supabase
              .from('members')
              .update({ status: newStatus })
              .eq('id', member.member_id)
              .eq('team_id', teamSettings.team_id)
            if (error) throw error
          } else if (bulkAction === 'set_availability') {
            // Set availability for date range
            const fromDate = new Date(dateRange.from)
            const toDate = new Date(dateRange.to)
            
            for (let currentDate = new Date(fromDate); currentDate <= toDate; currentDate.setDate(currentDate.getDate() + 1)) {
              const dateStr = currentDate.toISOString().split('T')[0]
              
              const { error } = await supabase
                .from('availability')
                .upsert({
                  member_id: member.member_id,
                  team_id: teamSettings.team_id,
                  date: dateStr,
                  status: bulkAvailabilityStatus,
                  updated_at: new Date().toISOString()
                }, {
                  onConflict: 'member_id,team_id,date'
                })
              
              if (error) throw error
            }
          }
          successCount++
        } catch (error) {
          console.error(`Error processing member ${member.member_email}:`, error)
          errorCount++
        }
      }

      // Refresh data and show results
      await fetchTeamSettings()
      setSelectedMembers([])
      
      const actionText = {
        hide: 'verborgen',
        show: 'getoond',
        activate: 'geactiveerd',
        deactivate: 'gedeactiveerd',
        set_availability: `beschikbaarheid ingesteld op ${bulkAvailabilityStatus === 'available' ? 'beschikbaar' : bulkAvailabilityStatus === 'unavailable' ? 'niet beschikbaar' : 'misschien'}`
      }[bulkAction]

      if (errorCount === 0) {
        setSuccessMessage(`${successCount} teamleden succesvol ${actionText}!`)
      } else {
        setError(`${successCount} teamleden ${actionText}, ${errorCount} fouten opgetreden.`)
      }
      
      setTimeout(() => {
        setSuccessMessage('')
        setError('')
      }, 5000)

    } catch (error: any) {
      console.error("Bulk operation error:", error)
      setError(`Fout bij bulk operatie: ${error.message}`)
      setTimeout(() => setError(''), 5000)
    } finally {
      setIsBulkOperating(false)
      setShowBulkDialog(false)
      setBulkAction(null)
    }
  }

  const deleteTeam = async () => {
    if (!teamSettings || !user?.email || !teamSettings.user_is_admin) {
      alert('Alleen team admins kunnen het team verwijderen.')
      return
    }

    if (deleteConfirmText !== teamSettings.team_name) {
      alert('De team naam moet exact overeenkomen om het team te verwijderen.')
      return
    }

    try {
      setIsDeleting(true)

      // Delete team (this will cascade delete all related data like members, availability, etc.)
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamSettings.team_id)

      if (error) throw error

      // Redirect to my-teams page
      router.push('/my-teams')
    } catch (error: any) {
      console.error("Error deleting team:", error)
      alert(`Er is een fout opgetreden bij het verwijderen van het team: ${error.message}`)
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
      setDeleteConfirmText('')
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
                          <p className="font-medium">AvPlanner {buildInfo || version}</p>
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

                    {/* Selection Controls */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedMembers.length === members.filter(m => !m.is_current_user).length && members.filter(m => !m.is_current_user).length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                selectAllMembers()
                              } else {
                                clearSelection()
                              }
                            }}
                            className="h-5 w-5 border-2 border-blue-400"
                          />
                          <div>
                            <p className="font-medium text-blue-900">
                              {selectedMembers.length > 0 
                                ? `${selectedMembers.length} teamleden geselecteerd`
                                : "🎯 Selecteer teamleden voor bulk acties"
                              }
                            </p>
                            <p className="text-sm text-blue-700">
                              💡 Tip: Je eigen account kan niet worden bewerkt via bulk acties
                            </p>
                          </div>
                        </div>
                        {selectedMembers.length > 0 && (
                          <Button variant="outline" size="sm" onClick={clearSelection}>
                            Deselecteer Alles
                          </Button>
                        )}
                      </div>
                      
                      {/* Bulk Action Buttons */}
                      {selectedMembers.length > 0 && (
                        <div className="border-t border-blue-200 pt-3 space-y-4">
                          <div className="text-sm font-medium text-blue-900">
                            Bulk Acties ({selectedMembers.length} geselecteerd):
                          </div>
                          
                          {/* Member Management Actions */}
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-blue-800 mb-2">Teamlid Beheer:</p>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline" 
                                size="sm"
                                onClick={() => handleBulkAction('hide')}
                                disabled={isBulkOperating}
                                className="bg-white hover:bg-gray-50"
                              >
                                {isBulkOperating && bulkAction === 'hide' ? (
                                  <div className="animate-spin h-4 w-4 mr-1 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                                ) : (
                                  <EyeOff className="h-4 w-4 mr-1" />
                                )}
                                Verberg Geselecteerd
                              </Button>
                              <Button
                                variant="outline" 
                                size="sm"
                                onClick={() => handleBulkAction('show')}
                                disabled={isBulkOperating}
                                className="bg-white hover:bg-gray-50"
                              >
                                {isBulkOperating && bulkAction === 'show' ? (
                                  <div className="animate-spin h-4 w-4 mr-1 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                                ) : (
                                  <Eye className="h-4 w-4 mr-1" />
                                )}
                                Toon Geselecteerd
                              </Button>
                              <Button
                                variant="outline" 
                                size="sm"
                                onClick={() => handleBulkAction('deactivate')}
                                disabled={isBulkOperating}
                                className="bg-white hover:bg-gray-50 text-orange-600 hover:text-orange-700"
                              >
                                {isBulkOperating && bulkAction === 'deactivate' ? (
                                  <div className="animate-spin h-4 w-4 mr-1 border-2 border-orange-400 border-t-transparent rounded-full"></div>
                                ) : (
                                  <UserX className="h-4 w-4 mr-1" />
                                )}
                                Deactiveer Geselecteerd
                              </Button>
                              <Button
                                variant="outline" 
                                size="sm"
                                onClick={() => handleBulkAction('activate')}
                                disabled={isBulkOperating}
                                className="bg-white hover:bg-gray-50 text-green-600 hover:text-green-700"
                              >
                                {isBulkOperating && bulkAction === 'activate' ? (
                                  <div className="animate-spin h-4 w-4 mr-1 border-2 border-green-400 border-t-transparent rounded-full"></div>
                                ) : (
                                  <UserCheck className="h-4 w-4 mr-1" />
                                )}
                                Activeer Geselecteerd
                              </Button>
                            </div>
                          </div>

                          {/* Availability Management - Enhanced */}
                          <div className="space-y-4 bg-gradient-to-br from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 mb-3">
                              <CalendarDays className="h-5 w-5 text-green-700" />
                              <h4 className="font-semibold text-green-800">📅 Beschikbaarheid Bulk Update</h4>
                            </div>
                            
                            {/* Quick Date Presets */}
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-green-700">⚡ Snelle Selectie:</Label>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {getDatePresets().map((preset, index) => (
                                  <Button
                                    key={index}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => applyDatePreset(preset)}
                                    className="text-xs bg-white hover:bg-green-50 border-green-300 hover:border-green-400 justify-start"
                                  >
                                    <span className="mr-1">{preset.icon}</span>
                                    {preset.label}
                                  </Button>
                                ))}
                              </div>
                            </div>

                            {/* Custom Date Range Selection */}
                            <div className="space-y-3 bg-white p-3 rounded-lg border border-green-200">
                              <Label className="text-sm font-medium text-green-700 flex items-center gap-1">
                                🎯 Aangepaste Datum Periode:
                              </Label>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <Label htmlFor="date-from" className="text-xs text-green-600 flex items-center gap-1">
                                    📅 Van:
                                  </Label>
                                  <Input
                                    id="date-from"
                                    type="date"
                                    value={dateRange.from}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                                    className="text-sm border-green-300 focus:border-green-500 focus:ring-green-500"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="date-to" className="text-xs text-green-600 flex items-center gap-1">
                                    📅 Tot:
                                  </Label>
                                  <Input
                                    id="date-to"
                                    type="date"
                                    value={dateRange.to}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                                    min={dateRange.from}
                                    className="text-sm border-green-300 focus:border-green-500 focus:ring-green-500"
                                  />
                                </div>
                              </div>

                              {/* Date Range Preview */}
                              <div className="bg-blue-50 border border-blue-200 rounded p-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-blue-700 font-medium">🗓️ Geselecteerde Periode:</span>
                                  <span className="text-blue-800 font-semibold">
                                    {formatDateRange(dateRange.from, dateRange.to)}
                                  </span>
                                </div>
                                {getDayCount(dateRange.from, dateRange.to) > 30 && (
                                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                    ⚠️ Let op: Dit is een lange periode ({getDayCount(dateRange.from, dateRange.to)} dagen)
                                  </p>
                                )}
                                {new Date(dateRange.from) > new Date(dateRange.to) && (
                                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                    ❌ Einddatum moet na begindatum liggen
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Availability Status Selection */}
                            <div className="space-y-3">
                              <Label className="text-sm font-medium text-green-700">🎯 Beschikbaarheid Status:</Label>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <Button
                                  variant={bulkAvailabilityStatus === 'available' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setBulkAvailabilityStatus('available')}
                                  className={`text-sm flex items-center gap-2 justify-center p-3 h-auto ${
                                    bulkAvailabilityStatus === 'available' 
                                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                                      : 'bg-white hover:bg-green-50 border-green-300 text-green-700'
                                  }`}
                                >
                                  <span className="text-lg">✅</span>
                                  <div className="text-center">
                                    <div className="font-medium">Beschikbaar</div>
                                    <div className="text-xs opacity-75">Kan deelnemen</div>
                                  </div>
                                </Button>
                                <Button
                                  variant={bulkAvailabilityStatus === 'unavailable' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setBulkAvailabilityStatus('unavailable')}
                                  className={`text-sm flex items-center gap-2 justify-center p-3 h-auto ${
                                    bulkAvailabilityStatus === 'unavailable' 
                                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                                      : 'bg-white hover:bg-red-50 border-red-300 text-red-700'
                                  }`}
                                >
                                  <span className="text-lg">❌</span>
                                  <div className="text-center">
                                    <div className="font-medium">Niet Beschikbaar</div>
                                    <div className="text-xs opacity-75">Kan niet deelnemen</div>
                                  </div>
                                </Button>
                                <Button
                                  variant={bulkAvailabilityStatus === 'maybe' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setBulkAvailabilityStatus('maybe')}
                                  className={`text-sm flex items-center gap-2 justify-center p-3 h-auto ${
                                    bulkAvailabilityStatus === 'maybe' 
                                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                                      : 'bg-white hover:bg-yellow-50 border-yellow-300 text-yellow-700'
                                  }`}
                                >
                                  <span className="text-lg">❓</span>
                                  <div className="text-center">
                                    <div className="font-medium">Misschien</div>
                                    <div className="text-xs opacity-75">Onzeker</div>
                                  </div>
                                </Button>
                              </div>
                            </div>

                            {/* Apply Availability Button */}
                            <Button
                              onClick={() => handleBulkAction('set_availability')}
                              disabled={isBulkOperating || new Date(dateRange.from) > new Date(dateRange.to)}
                              className={`w-full text-sm font-medium py-3 h-auto transition-all ${
                                bulkAvailabilityStatus === 'available' ? 'bg-green-600 hover:bg-green-700' :
                                bulkAvailabilityStatus === 'unavailable' ? 'bg-red-600 hover:bg-red-700' :
                                'bg-yellow-600 hover:bg-yellow-700'
                              }`}
                            >
                              {isBulkOperating && bulkAction === 'set_availability' ? (
                                <>
                                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                                  Beschikbaarheid Instellen...
                                </>
                              ) : (
                                <>
                                  <Calendar className="h-4 w-4 mr-2" />
                                  Zet {selectedMembers.length} Teamleden op "
                                  {bulkAvailabilityStatus === 'available' ? '✅ Beschikbaar' : 
                                   bulkAvailabilityStatus === 'unavailable' ? '❌ Niet Beschikbaar' : 
                                   '❓ Misschien'}" 
                                  <span className="ml-1">
                                    ({getDayCount(dateRange.from, dateRange.to)} dagen)
                                  </span>
                                </>
                              )}
                            </Button>
                            
                            {/* Helpful Tips */}
                            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs">
                              <div className="font-medium text-blue-800 mb-1">💡 Tips:</div>
                              <ul className="text-blue-700 space-y-1">
                                <li>• Gebruik snelle selectie voor veelgebruikte periodes</li>
                                <li>• Bestaande beschikbaarheid wordt overschreven voor geselecteerde dagen</li>
                                <li>• Je kunt individuele dagen later nog aanpassen indien nodig</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Members List */}
                    {members.map((member) => (
                      <div key={member.member_id} className={`flex items-center justify-between p-4 border rounded-lg transition-all ${
                        member.is_hidden ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
                      } ${selectedMembers.includes(member.member_id) ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}>
                        <div className="flex items-center gap-3">
                          {/* Selection Checkbox - only for non-current users */}
                          {!member.is_current_user && (
                            <Checkbox
                              checked={selectedMembers.includes(member.member_id)}
                              onCheckedChange={() => toggleMemberSelection(member.member_id)}
                              className="h-5 w-5 border-2 border-gray-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                            />
                          )}
                          {member.is_current_user && (
                            <div className="w-5 h-5" /> // Spacer for alignment
                          )}
                          <MemberAvatar
                            firstName={member.member_name.trim() ? member.member_name.split(' ')[0] : member.member_email.split('@')[0]}
                            lastName={member.member_name.trim() ? member.member_name.split(' ').slice(1).join(' ') : ''}
                            profileImage={member.profile_image_url || undefined}
                            size="lg"
                            statusIndicator={{
                              show: true,
                              status: todayAvailability[member.member_id]
                            }}
                          />
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
                            {/* Visibility Toggle Button */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-3 text-xs"
                                  onClick={() => toggleMemberVisibility(member.member_id, member.is_hidden)}
                                >
                                  {member.is_hidden ? (
                                    <>
                                      <Eye className="h-4 w-4 mr-1" />
                                      Tonen
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="h-4 w-4 mr-1" />
                                      Verbergen
                                    </>
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

                            {/* Status Toggle Button */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={`h-8 px-3 text-xs ${
                                    member.member_status === 'active' ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'
                                  }`}
                                  onClick={() => toggleMemberStatus(member.member_id, member.member_status)}
                                >
                                  {member.member_status === 'active' ? (
                                    <>
                                      <UserX className="h-4 w-4 mr-1" />
                                      Inactief
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="h-4 w-4 mr-1" />
                                      Actief
                                    </>
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-medium">
                                  {member.member_status === 'active' ? 'Zet op Inactief' : 'Zet op Actief'}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  {member.member_status === 'active' 
                                    ? 'Lid wordt inactief maar blijft in het team'
                                    : 'Lid wordt weer actief en krijgt toegang'
                                  }
                                </p>
                              </TooltipContent>
                            </Tooltip>
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

        {/* Holiday Management - Only for team admins */}
        {teamSettings?.user_is_admin && (
          <HolidayManagement teamId={teamSettings.team_id} locale="en" />
        )}

        {/* Danger Zone - Only for team admins */}
        {teamSettings.user_is_admin && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border border-red-200 rounded-lg bg-white">
                <h4 className="font-semibold text-red-800 mb-2">Team Verwijderen</h4>
                <p className="text-sm text-red-600 mb-4">
                  Dit verwijdert permanent het volledige team inclusief alle leden, beschikbaarheid data, 
                  en andere gerelateerde informatie. Deze actie kan niet ongedaan worden gemaakt.
                </p>
                
                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="bg-red-600 hover:bg-red-700">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Verwijder Team
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle className="text-red-800">Team Verwijderen</DialogTitle>
                      <DialogDescription className="text-gray-600">
                        Deze actie kan niet ongedaan worden gemaakt. Dit zal permanent het team "{teamSettings.team_name}" 
                        verwijderen inclusief alle leden, beschikbaarheid data, en andere gerelateerde informatie.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="confirm-text" className="text-sm font-medium">
                          Type de team naam om te bevestigen:
                        </Label>
                        <Input
                          id="confirm-text"
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          placeholder={teamSettings.team_name}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowDeleteDialog(false)
                          setDeleteConfirmText('')
                        }}
                        disabled={isDeleting}
                      >
                        Annuleren
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={deleteTeam}
                        disabled={deleteConfirmText !== teamSettings.team_name || isDeleting}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {isDeleting ? 'Verwijderen...' : 'Definitief Verwijderen'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bulk Action Confirmation Dialog */}
        <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-gray-900">
                Bulk Actie Bevestigen
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                {bulkAction && selectedMembers.length > 0 && (
                  <div className="space-y-3">
                    <p>
                      Je staat op het punt om <strong>{selectedMembers.length} teamleden</strong> te{' '}
                      <strong>
                        {bulkAction === 'hide' && 'verbergen'}
                        {bulkAction === 'show' && 'tonen'}
                        {bulkAction === 'activate' && 'activeren'}
                        {bulkAction === 'deactivate' && 'deactiveren'}
                        {bulkAction === 'set_availability' && `beschikbaarheid instellen op "${bulkAvailabilityStatus === 'available' ? 'beschikbaar' : bulkAvailabilityStatus === 'unavailable' ? 'niet beschikbaar' : 'misschien'}"`}
                      </strong>
                      {bulkAction === 'set_availability' && (
                        <span> voor de periode van <strong>{new Date(dateRange.from).toLocaleDateString('nl-NL')} tot {new Date(dateRange.to).toLocaleDateString('nl-NL')}</strong></span>
                      )}.
                    </p>
                    
                    <div className="bg-gray-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                      <p className="text-sm font-medium text-gray-700 mb-2">Betrokken teamleden:</p>
                      <ul className="text-sm space-y-1">
                        {getSelectedMembers().map((member) => (
                          <li key={member.member_id} className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 bg-gray-400 rounded-full"></span>
                            {member.member_name.trim() !== '' && member.member_name.trim() !== ' '
                              ? `${member.member_name} (${member.member_email})`
                              : member.member_email
                            }
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Resultaat:</strong>{' '}
                        {bulkAction === 'hide' && 'Deze teamleden worden verborgen uit overzichten en analytics, maar blijven lid van het team.'}
                        {bulkAction === 'show' && 'Deze teamleden worden weer zichtbaar in overzichten en analytics.'}
                        {bulkAction === 'activate' && 'Deze teamleden krijgen weer toegang tot het systeem.'}
                        {bulkAction === 'deactivate' && 'Deze teamleden kunnen niet meer inloggen, maar hun data blijft bewaard.'}
                        {bulkAction === 'set_availability' && (
                          <span>
                            Voor elke dag van {new Date(dateRange.from).toLocaleDateString('nl-NL')} tot{' '}
                            {new Date(dateRange.to).toLocaleDateString('nl-NL')} ({Math.ceil((new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime()) / (1000 * 60 * 60 * 24)) + 1} dagen totaal){' '}
                            wordt de beschikbaarheid van de geselecteerde teamleden ingesteld op{' '}
                            <strong className={`${bulkAvailabilityStatus === 'available' ? 'text-green-700' : bulkAvailabilityStatus === 'unavailable' ? 'text-red-700' : 'text-yellow-700'}`}>
                              {bulkAvailabilityStatus === 'available' ? 'beschikbaar' : bulkAvailabilityStatus === 'unavailable' ? 'niet beschikbaar' : 'misschien'}
                            </strong>. Bestaande beschikbaarheid voor deze dagen wordt overschreven.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowBulkDialog(false)
                  setBulkAction(null)
                }}
                disabled={isBulkOperating}
              >
                Annuleren
              </Button>
              <Button 
                onClick={executeBulkAction}
                disabled={isBulkOperating}
                className={`${
                  bulkAction === 'deactivate' ? 'bg-orange-600 hover:bg-orange-700' :
                  bulkAction === 'hide' ? 'bg-gray-600 hover:bg-gray-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isBulkOperating ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                    Verwerken...
                  </>
                ) : (
                  <>
                    Ja, {bulkAction === 'hide' && 'Verberg'}
                    {bulkAction === 'show' && 'Toon'}
                    {bulkAction === 'activate' && 'Activeer'}
                    {bulkAction === 'deactivate' && 'Deactiveer'}
                    {bulkAction === 'set_availability' && 'Stel Beschikbaarheid In voor'} {selectedMembers.length} Teamleden
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
            AvPlanner {buildInfo || version} 
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
