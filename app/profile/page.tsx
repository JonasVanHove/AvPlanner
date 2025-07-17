"use client"

import { useState } from "react"
import { useUser } from "@/hooks/use-user" // Assuming you have this hook
import { UserTeamsOverview } from "@/components/user-teams-overview"
import { UserProfileForm } from "@/components/user-profile-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  User, 
  Users, 
  Loader2,
  AlertTriangle
} from "lucide-react"

export default function ProfilePage() {
  const { user, loading } = useUser()
  const [refreshKey, setRefreshKey] = useState(0)

  const handleProfileUpdate = () => {
    setRefreshKey(prev => prev + 1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              You need to be logged in to view this page.
            </p>
            <Button onClick={() => window.location.href = '/login'}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile & Teams</h1>
          <p className="text-gray-600 mt-2">
            Manage your profile and team memberships
          </p>
        </div>

        <Tabs defaultValue="teams" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              My Teams
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="teams" className="mt-6">
            <UserTeamsOverview 
              user={user} 
              key={`teams-${refreshKey}`}
            />
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <UserProfileForm 
              user={user} 
              onProfileUpdate={handleProfileUpdate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
