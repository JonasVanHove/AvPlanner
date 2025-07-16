"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Copy, Share2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useTranslation, type Locale } from "@/lib/i18n"
import { createConfetti } from "@/lib/confetti"
import { cn } from "@/lib/utils"

interface TeamFormProps {
  locale: Locale
}

export function TeamForm({ locale }: TeamFormProps) {
  const [teamName, setTeamName] = useState("")
  const [friendlyUrl, setFriendlyUrl] = useState("")
  const [useFriendlyUrl, setUseFriendlyUrl] = useState(false)
  const [urlCheckStatus, setUrlCheckStatus] = useState<"idle" | "checking" | "available" | "taken">("idle")
  const [password, setPassword] = useState("")
  const [isPasswordProtected, setIsPasswordProtected] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [createdTeam, setCreatedTeam] = useState<{
    inviteCode: string
    name: string
    isPasswordProtected: boolean
    friendlyUrl?: string
  } | null>(null)
  const router = useRouter()
  const { t } = useTranslation(locale)

  // Check URL availability with debouncing
  useEffect(() => {
    if (!useFriendlyUrl || !friendlyUrl.trim()) {
      setUrlCheckStatus("idle")
      return
    }

    const checkUrl = async () => {
      setUrlCheckStatus("checking")
      
      const cleanUrl = friendlyUrl.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      
      try {
        const { data: existingTeam, error } = await supabase
          .from("teams")
          .select("id")
          .eq("slug", cleanUrl)
          .single()
        
        if (existingTeam) {
          setUrlCheckStatus("taken")
        } else if (error && error.code === 'PGRST116') {
          setUrlCheckStatus("available")
        } else {
          setUrlCheckStatus("idle")
        }
      } catch (error) {
        console.error("Error checking URL:", error)
        setUrlCheckStatus("idle")
      }
    }

    // Debounce the check
    const timeoutId = setTimeout(checkUrl, 500)
    return () => clearTimeout(timeoutId)
  }, [friendlyUrl, useFriendlyUrl])

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamName.trim()) return
    if (isPasswordProtected && !password.trim()) return
    if (useFriendlyUrl && !friendlyUrl.trim()) return
    if (useFriendlyUrl && urlCheckStatus === "taken") {
      alert("The custom URL is already taken. Please choose a different one.")
      return
    }
    if (useFriendlyUrl && urlCheckStatus === "checking") {
      alert("Please wait while we check the URL availability.")
      return
    }

    setIsLoading(true)
    try {
      // Get current user to set as creator
      const { data: { user } } = await supabase.auth.getUser()
      
      // Generate a unique slug from the team name with timestamp as fallback
      const baseSlug = teamName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const timestamp = Date.now().toString(36) // Convert timestamp to base36 for shorter string
      const defaultSlug = `${baseSlug}-${timestamp}`
      
      // Use friendly URL if provided, otherwise use null (not the default slug)
      const finalSlug = useFriendlyUrl && friendlyUrl.trim() 
        ? friendlyUrl.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        : null
      
      // Check if custom slug already exists
      if (finalSlug) {
        const { data: existingTeam, error: checkError } = await supabase
          .from("teams")
          .select("id")
          .eq("slug", finalSlug)
          .single()
        
        if (existingTeam) {
          throw new Error(`The custom URL "${finalSlug}" is already taken. Please choose a different one.`)
        }
        
        // If checkError is not "not found", then there's a real error
        if (checkError && checkError.code !== 'PGRST116') {
          throw new Error(`Error checking custom URL: ${checkError.message}`)
        }
      }
      
      const teamData: any = {
        name: teamName,
        slug: finalSlug,
        is_password_protected: isPasswordProtected
      }

      // Add created_by only if user is authenticated and the column exists
      if (user) {
        teamData.created_by = user.id
      }

      // Hash password if provided
      if (isPasswordProtected && password.trim()) {
        // Simple hash - in production, use bcrypt or similar
        teamData.password_hash = btoa(password) // Base64 encoding for demo
      }

      let { data: team, error } = await supabase
        .from("teams")
        .insert([teamData])
        .select("id, name, slug, invite_code, is_password_protected")
        .single()

      if (error) {
        console.error("Supabase error details:", error)
        
        // Check if it's a duplicate slug error
        if (error.code === '23505' && (error.message.includes('teams_slug_unique') || error.message.includes('teams_slug_unique_idx'))) {
          throw new Error("This custom URL is already taken. Please choose a different one.")
        }
        
        // Check if it's a missing column error and retry without created_by
        if (error.code === 'PGRST204' && error.message.includes('created_by')) {
          console.log("created_by column not found, retrying without it...")
          const { created_by, ...teamDataWithoutCreatedBy } = teamData
          
          const { data: retryTeam, error: retryError } = await supabase
            .from("teams")
            .insert([teamDataWithoutCreatedBy])
            .select("id, name, slug, invite_code, is_password_protected")
            .single()
            
          if (retryError) {
            throw new Error(`Database error: ${retryError.message} (Code: ${retryError.code})`)
          }
          
          // Use the retry result
          team = retryTeam
        } else {
          throw new Error(`Database error: ${error.message} (Code: ${error.code})`)
        }
      }

      if (!team) {
        throw new Error("Failed to create team - no data returned")
      }

      setCreatedTeam({
        inviteCode: team.invite_code,
        name: team.name,
        isPasswordProtected: team.is_password_protected,
        friendlyUrl: useFriendlyUrl ? team.slug : undefined
      })
      
      // Trigger confetti animation
      createConfetti()
    } catch (error) {
      console.error("Error creating team:", error)
      // Show more detailed error message for debugging
      let errorMessage = "Unknown error"
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message)
      } else if (error && typeof error === 'object' && 'error' in error) {
        errorMessage = String(error.error)
      } else if (error && typeof error === 'object') {
        errorMessage = JSON.stringify(error, null, 2)
      }
      alert(`Error creating team: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const copyInviteCode = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert(locale === "en" ? "Copied to clipboard!" : 
            locale === "nl" ? "Gekopieerd naar klembord!" : 
            "Copié dans le presse-papiers!")
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  const goToTeam = () => {
    if (createdTeam) {
      const basePath = locale === "en" ? "" : `/${locale}`
      router.push(`${basePath}/team/${createdTeam.inviteCode}`)
    }
  }

  if (createdTeam) {
    const inviteUrl = `${window.location.origin}${locale === "en" ? "" : `/${locale}`}/team/${createdTeam.inviteCode}`
    const friendlyUrl = createdTeam.friendlyUrl 
      ? `${window.location.origin}${locale === "en" ? "" : `/${locale}`}/team/${createdTeam.friendlyUrl}`
      : null
    
    return (
      <Card className="w-full max-w-md mx-auto bg-white border-gray-200 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-green-600">✅ Team Created!</CardTitle>
          <CardDescription className="text-gray-600">
            Your team "{createdTeam.name}" has been created successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-gray-700">{t("team.inviteCode")}</Label>
            <div className="flex gap-2">
              <Input
                value={createdTeam.inviteCode}
                readOnly
                className="bg-gray-50 border-gray-300 text-gray-900"
              />
              <Button
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-white"
                onClick={() => copyInviteCode(createdTeam.inviteCode)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div>
            <Label className="text-gray-700">Invite Link (with code)</Label>
            <div className="flex gap-2">
              <Input
                value={inviteUrl}
                readOnly
                className="bg-gray-50 text-xs border-gray-300 text-gray-900"
              />
              <Button
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-white"
                onClick={() => copyInviteCode(inviteUrl)}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {friendlyUrl && (
            <div>
              <Label className="text-gray-700">Friendly URL</Label>
              <div className="flex gap-2">
                <Input
                  value={friendlyUrl}
                  readOnly
                  className="bg-green-50 text-xs font-medium border-green-300 text-gray-900"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-white"
                  onClick={() => copyInviteCode(friendlyUrl)}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <Alert>
            <AlertDescription>
              {friendlyUrl ? (
                <>
                  You can share either the <strong>invite code</strong> ({createdTeam.inviteCode}) or the <strong>friendly URL</strong> (/team/{createdTeam.friendlyUrl}). Both will work!
                </>
              ) : (
                <>
                  {t("team.shareInviteCode")}
                </>
              )}
              {createdTeam.isPasswordProtected && (
                <>
                  <br />
                  <strong>Note:</strong> This team is password protected. Share the password separately.
                </>
              )}
            </AlertDescription>
          </Alert>

          <Button onClick={goToTeam} className="w-full">
            Go to Team
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-white border-gray-200 shadow-lg">
      <CardHeader>
        <CardTitle className="text-gray-900">{t("team.create")}</CardTitle>
        <CardDescription className="text-gray-600">
          Create a new team and optionally protect it with a password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={createTeam} className="space-y-4">
          <div>
            <Label htmlFor="teamName" className="text-gray-700">{t("team.name")}</Label>
            <Input
              id="teamName"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder={t("team.name")}
              required
              className="bg-white border-gray-300 text-gray-900 placeholder-gray-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="friendly-url"
              checked={useFriendlyUrl}
              onCheckedChange={setUseFriendlyUrl}
              className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-200"
            />
            <Label htmlFor="friendly-url" className="text-sm text-gray-700">
              Create custom URL (optional)
            </Label>
          </div>

          {useFriendlyUrl && (
            <div>
              <Label htmlFor="friendlyUrl" className="text-gray-700">Custom URL</Label>
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    id="friendlyUrl"
                    value={friendlyUrl}
                    onChange={(e) => setFriendlyUrl(e.target.value)}
                    placeholder="e.g., efficiency-team"
                    pattern="[a-zA-Z0-9-]+"
                    title="Only letters, numbers, and hyphens allowed"
                    className={cn(
                      "pr-10 bg-white border-gray-300 text-gray-900 placeholder-gray-500",
                      urlCheckStatus === "available" && "border-green-500 focus:border-green-500",
                      urlCheckStatus === "taken" && "border-red-500 focus:border-red-500"
                    )}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {urlCheckStatus === "checking" && (
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    )}
                    {urlCheckStatus === "available" && (
                      <div className="w-4 h-4 text-green-500">✓</div>
                    )}
                    {urlCheckStatus === "taken" && (
                      <div className="w-4 h-4 text-red-500">✗</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Team will be accessible at: /team/{friendlyUrl || "your-custom-url"}
                  </p>
                  {urlCheckStatus === "available" && (
                    <p className="text-xs text-green-600 font-medium">✓ Available</p>
                  )}
                  {urlCheckStatus === "taken" && (
                    <p className="text-xs text-red-600 font-medium">✗ Already taken</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="password-protection"
              checked={isPasswordProtected}
              onCheckedChange={setIsPasswordProtected}
              className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-200"
            />
            <Label htmlFor="password-protection" className="text-sm text-gray-700">
              {t("team.makePasswordProtected")}
            </Label>
          </div>

          {isPasswordProtected && (
            <div>
              <Label htmlFor="password" className="text-gray-700">{t("team.password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("team.setPassword")}
                  required
                  className="pr-10 bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-gray-100 text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            disabled={
              isLoading || 
              (useFriendlyUrl && urlCheckStatus === "checking") ||
              (useFriendlyUrl && urlCheckStatus === "taken")
            } 
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          >
            {isLoading ? t("common.loading") : 
             urlCheckStatus === "checking" ? "Checking URL..." :
             urlCheckStatus === "taken" ? "URL Taken" :
             t("team.create")}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
