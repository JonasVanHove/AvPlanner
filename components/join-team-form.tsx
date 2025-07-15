"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface JoinTeamFormProps {
  locale: string
}

export function JoinTeamForm({ locale }: JoinTeamFormProps) {
  const [inviteCode, setInviteCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inviteCode.trim()) {
      setError("Please enter an invite code")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      // Check if team exists with this invite code
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .select("id, name, slug")
        .eq("invite_code", inviteCode.trim())
        .single()

      if (teamError || !team) {
        setError("Invalid invite code. Please check and try again.")
        setIsLoading(false)
        return
      }

      // Redirect to team page using slug if available, otherwise use invite code
      const teamPath = team.slug ? `/team/${team.slug}` : `/team/${inviteCode.trim()}`
      
      if (locale !== "en") {
        router.push(`/${locale}${teamPath}`)
      } else {
        router.push(teamPath)
      }
    } catch (err) {
      console.error("Error joining team:", err)
      setError("Something went wrong. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Join Team</CardTitle>
        <CardDescription>
          Enter your team's invite code to join
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inviteCode">Invite Code</Label>
            <Input
              id="inviteCode"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter invite code"
              className="text-center font-mono"
              disabled={isLoading}
            />
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              "Join Team"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
