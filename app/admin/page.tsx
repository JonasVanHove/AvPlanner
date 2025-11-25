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
  ArrowLeft,
  User as UserIcon
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-50 animate-pulse"></div>
            <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-cyan-400 border-r-purple-500"></div>
          </div>
          <p className="mt-4 text-cyan-300 font-medium text-lg">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative h-20 w-20 bg-gradient-to-br from-cyan-500 via-purple-600 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Shield className="h-10 w-10 text-white" strokeWidth="2.5" />
                </div>
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
              Admin Panel
            </h1>
            <p className="text-cyan-300 text-lg">Please log in to access the admin dashboard</p>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-xl"></div>
            <div className="relative bg-gray-900/90 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6 shadow-2xl">
              <LoginForm />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
  <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-900">
      {/* Header */}
  <div className="bg-gray-950/80 backdrop-blur-xl shadow-xl border-b border-cyan-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="relative group cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
                  <div className="relative h-12 w-12 bg-gradient-to-br from-cyan-500 via-purple-600 to-pink-500 rounded-xl flex items-center justify-center shadow-2xl group-hover:shadow-cyan-500/50 transition-all duration-300 group-hover:scale-105">
                    <Shield className="h-7 w-7 text-white" strokeWidth="2.5" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent leading-none">Admin Panel</h1>
                  <p className="text-sm text-cyan-300/80 leading-none mt-0.5">System Administration</p>
                </div>
              </div>
              <Badge variant="outline" className="ml-2 shadow-lg bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 text-white border border-cyan-400/30 shadow-cyan-500/50">Admin Access</Badge>
            </div>
            
            {/* Navigation */}
            <div className="flex items-center gap-2">
              {activeView !== 'overview' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveView('overview')}
                  className="flex items-center gap-2 text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200 border border-transparent hover:border-cyan-500/30 transition-all"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Overview
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoHome}
                className="flex items-center gap-2 text-purple-300 hover:bg-purple-500/20 hover:text-purple-200 border border-transparent hover:border-purple-500/30 transition-all"
              >
                <Home className="h-4 w-4" />
                Home
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2 text-pink-300 hover:bg-pink-500/20 hover:text-pink-200 border border-transparent hover:border-pink-500/30 transition-all"
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
          <div className="space-y-8">
            {/* Welcome Card */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-gray-900/95 via-purple-900/60 to-gray-900/95 backdrop-blur-xl border-2 border-cyan-500/40 text-white shadow-2xl shadow-cyan-500/20">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-500/20 via-purple-500/10 to-transparent"></div>
              <CardHeader className="relative pb-8 pt-10">
                <div className="flex items-center justify-center mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-2xl blur-2xl opacity-40 animate-pulse"></div>
                    <div className="relative h-16 w-16 bg-gradient-to-br from-cyan-500 via-purple-600 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl">
                      <Shield className="h-8 w-8 text-white" strokeWidth="2.5" />
                    </div>
                  </div>
                </div>
                <CardTitle className="text-4xl text-center font-bold bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent mb-3">
                  Admin Control Center
                </CardTitle>
                <p className="text-center text-cyan-100/80 text-lg font-medium max-w-2xl mx-auto">
                  Complete system administration and monitoring dashboard
                </p>
              </CardHeader>
            </Card>

            {/* Quick Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gray-900/90 backdrop-blur-xl border border-cyan-500/30 text-white shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-cyan-500 blur-lg opacity-30"></div>
                      <div className="relative p-3 bg-gradient-to-br from-cyan-600 to-cyan-800 rounded-xl">
                        <Users className="h-6 w-6 text-cyan-100" />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-cyan-300">12</p>
                      <p className="text-xs text-cyan-400/70">Active</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-cyan-200">Total Teams</p>
                    <p className="text-sm text-gray-400">5 active, 2 inactive, 5 archived</p>
                  </div>
                  <Button
                    onClick={() => setActiveView('dashboard')}
                    variant="outline"
                    size="sm"
                    className="w-full mt-4 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-400/50"
                  >
                    Manage Teams
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/90 backdrop-blur-xl border border-purple-500/30 text-white shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-purple-500 blur-lg opacity-30"></div>
                      <div className="relative p-3 bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl">
                        <UserIcon className="h-6 w-6 text-purple-100" />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-purple-300">8</p>
                      <p className="text-xs text-purple-400/70">Registered</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-purple-200">Total Users</p>
                    <p className="text-sm text-gray-400">3 admins, 5 active members</p>
                  </div>
                  <Button
                    onClick={() => setActiveView('database')}
                    variant="outline"
                    size="sm"
                    className="w-full mt-4 border-purple-500/30 text-purple-300 hover:bg-purple-500/10 hover:border-purple-400/50"
                  >
                    View Users
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/90 backdrop-blur-xl border border-pink-500/30 text-white shadow-lg shadow-pink-500/10 hover:shadow-pink-500/20 transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-pink-500 blur-lg opacity-30"></div>
                      <div className="relative p-3 bg-gradient-to-br from-pink-600 to-pink-800 rounded-xl">
                        <Database className="h-6 w-6 text-pink-100" />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <div className="h-2 w-2 bg-pink-400 rounded-full animate-pulse"></div>
                        <p className="text-sm font-semibold text-pink-300">Live</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-pink-200">System Status</p>
                    <p className="text-sm text-gray-400">All services operational</p>
                  </div>
                  <Button
                    onClick={() => setActiveView('database')}
                    variant="outline"
                    size="sm"
                    className="w-full mt-4 border-pink-500/30 text-pink-300 hover:bg-pink-500/10 hover:border-pink-400/50"
                  >
                    Database Overview
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Admin Tools Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Teams Management */}
              <Card className="group relative cursor-pointer transition-all duration-300 border-2 border-cyan-500/30 hover:border-cyan-400/60 bg-gray-900/90 backdrop-blur-xl text-white overflow-hidden hover:shadow-2xl hover:shadow-cyan-500/30">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardHeader className="relative">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-cyan-500 blur-lg opacity-30 group-hover:opacity-50 transition-opacity"></div>
                      <div className="relative p-3 bg-gradient-to-br from-cyan-600 to-cyan-800 rounded-lg shadow-lg">
                        <Users className="h-6 w-6 text-cyan-100" />
                      </div>
                    </div>
                    <div>
                      <CardTitle className="text-lg text-cyan-200">Teams Management</CardTitle>
                      <p className="text-sm text-gray-400">View and manage all teams</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <p className="text-gray-300 mb-4">
                    Access the original admin dashboard to manage teams, view admin users, and handle team operations.
                  </p>
                  <Button
                    onClick={() => setActiveView('dashboard')}
                    className="w-full bg-gradient-to-r from-cyan-600 via-cyan-500 to-purple-600 hover:from-cyan-500 hover:via-cyan-400 hover:to-purple-500 text-white font-bold shadow-lg shadow-cyan-500/30 border-none transition-all"
                  >
                    Open Teams Dashboard
                  </Button>
                </CardContent>
              </Card>

              {/* Database Overview */}
              <Card className="group relative cursor-pointer transition-all duration-300 border-2 border-purple-500/30 hover:border-purple-400/60 bg-gray-900/90 backdrop-blur-xl text-white overflow-hidden hover:shadow-2xl hover:shadow-purple-500/30">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardHeader className="relative">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-purple-500 blur-lg opacity-30 group-hover:opacity-50 transition-opacity"></div>
                      <div className="relative p-3 bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg shadow-lg">
                        <Database className="h-6 w-6 text-purple-100" />
                      </div>
                    </div>
                    <div>
                      <CardTitle className="text-lg text-purple-200">Database Overview</CardTitle>
                      <p className="text-sm text-gray-400">Complete system monitoring</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <p className="text-gray-300 mb-4">
                    Comprehensive database overview with statistics, user management, team status controls, and activity monitoring.
                  </p>
                  <Button
                    onClick={() => setActiveView('database')}
                    className="w-full bg-gradient-to-r from-purple-600 via-purple-500 to-pink-600 hover:from-purple-500 hover:via-purple-400 hover:to-pink-500 text-white font-bold shadow-lg shadow-purple-500/30 border-none transition-all"
                    variant="outline"
                  >
                    Open Database Overview
                  </Button>
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
