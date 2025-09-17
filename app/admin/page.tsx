'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AdminDashboard } from '@/components/admin/admin-dashboard'
import { AdminDatabaseOverview } from '@/components/admin/admin-database-overview'
import { LoginForm } from '@/components/auth/login-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { 
  Database, 
  Users, 
  Settings, 
  Shield, 
  Home,
  ArrowLeft
} from 'lucide-react'

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'dashboard' | 'database' | 'overview'>('overview')
  const router = useRouter()

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleGoHome = () => {
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-red-800">Admin Panel</h1>
            <p className="text-red-600 mt-2">Please log in to access the admin dashboard</p>
          </div>
          <LoginForm />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
                  <p className="text-sm text-gray-600">System Administration</p>
                </div>
              </div>
              <Badge variant="destructive" className="ml-2">
                Admin Access
              </Badge>
            </div>
            
            {/* Navigation */}
            <div className="flex items-center gap-2">
              {activeView !== 'overview' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveView('overview')}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Overview
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleGoHome}
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Home
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* Welcome Card */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-2xl text-blue-800">
                  Welcome to Admin Panel
                </CardTitle>
                <p className="text-blue-600">
                  Manage your application's teams, users, and system settings
                </p>
              </CardHeader>
            </Card>

            {/* Admin Tools Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Teams Management */}
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-300">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <Users className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Teams Management</CardTitle>
                      <p className="text-sm text-gray-600">View and manage all teams</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Access the original admin dashboard to manage teams, view admin users, and handle team operations.
                  </p>
                  <Button
                    onClick={() => setActiveView('dashboard')}
                    className="w-full"
                  >
                    Open Teams Dashboard
                  </Button>
                </CardContent>
              </Card>

              {/* Database Overview */}
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-300">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Database className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Database Overview</CardTitle>
                      <p className="text-sm text-gray-600">Complete system monitoring</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Comprehensive database overview with statistics, user management, team status controls, and activity monitoring.
                  </p>
                  <Button
                    onClick={() => setActiveView('database')}
                    className="w-full"
                    variant="outline"
                  >
                    Open Database Overview
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Settings className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium">Team Status Control</p>
                      <p className="text-sm text-gray-600">Active, Inactive, Archived</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">User Management</p>
                      <p className="text-sm text-gray-600">Profiles, Admin Access</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Database className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium">System Statistics</p>
                      <p className="text-sm text-gray-600">Real-time Monitoring</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeView === 'dashboard' && (
          <AdminDashboard user={user} />
        )}

        {activeView === 'database' && (
          <AdminDatabaseOverview user={user} />
        )}
      </div>
    </div>
  )
}
