"use client"

import { TeamForm } from "@/components/team-form"
import { JoinTeamForm } from "@/components/join-team-form"
// Navigation on home should be minimal
// Removed Language selector and extra theme/auth items from header menu
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { HamburgerMenu } from "@/components/ui/hamburger-menu"
import { LogOut, UserIcon, ChevronDown, Shield, Users } from "lucide-react"
import { useTranslation } from "@/lib/i18n"
import { supabase } from "@/lib/supabase"
import { useEffect, useState } from "react"
import { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import { LoginButton, RegisterButton } from "@/components/auth/auth-dialog"


export default function HomePage() {
  const { t } = useTranslation("en")
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userProfileImage, setUserProfileImage] = useState<string | null>(null)
  const [userTeams, setUserTeams] = useState<any[]>([])

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Check admin status if user is logged in
      if (session?.user) {
        checkAdminStatus(session.user.email!)
        fetchUserProfileImage(session.user.email!)
        fetchUserTeams(session.user.email!)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
        
        // Check admin status if user is logged in
        if (session?.user) {
          checkAdminStatus(session.user.email!)
          fetchUserProfileImage(session.user.email!)
          fetchUserTeams(session.user.email!)
        } else {
          setIsAdmin(false)
          setUserTeams([])
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const checkAdminStatus = async (email: string) => {
    try {
      const { data, error } = await supabase.rpc('is_user_admin', {
        user_email: email
      })
      
      if (!error && data) {
        setIsAdmin(true)
      } else {
        setIsAdmin(false)
      }
    } catch (error) {
      // Gracefully handle if the function doesn't exist in the database
      console.warn('Admin function not available - this is normal for basic setups:', error)
      setIsAdmin(false)
    }
  }

  const fetchUserProfileImage = async (email: string) => {
    try {
      // Haal de eerste profielfoto op uit de members table voor deze gebruiker
      const { data, error } = await supabase
        .from('members')
        .select('profile_image, profile_image_url')
        .eq('email', email)
        .eq('status', 'active')
        .limit(1)
        .single()

      if (error) {
        console.log('No profile image found in members table:', error.message)
        return
      }

      if (data) {
        // Gebruik profile_image_url eerst, dan profile_image als fallback
        const profileImg = data.profile_image_url || data.profile_image
        if (profileImg) {
          console.log('🖼️ Found homepage user profile image:', profileImg.substring(0, 50) + '...')
          setUserProfileImage(profileImg)
        }
      }
    } catch (error) {
      console.log('Error fetching homepage user profile image:', error)
    }
  }

  const fetchUserTeams = async (email: string) => {
    try {
      const { data, error } = await supabase.rpc('get_user_teams_with_status', {
        user_email: email
      })

      if (error) {
        console.log('Error fetching user teams:', error.message)
        return
      }

      // Filter only active teams
      const activeTeams = (data || []).filter((team: any) => team.user_status === 'active')
      setUserTeams(activeTeams)
    } catch (error) {
      console.log('Error fetching user teams:', error)
    }
  }

  // Force dark mode for landing page (modern, state-of-the-art marketing design)
  useEffect(() => {
    document.documentElement.classList.add('dark')
    document.documentElement.setAttribute('data-theme', 'dark')
    
    // Clean up on unmount
    return () => {
      document.documentElement.removeAttribute('data-theme')
      // Restore user's preferred theme when leaving
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme !== 'dark' && (savedTheme === 'light' || (!savedTheme && !window.matchMedia('(prefers-color-scheme: dark)').matches))) {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handleGoHome = () => {
    // Not needed anymore since we're on the main page
  }

  const handleViewDashboard = (e?: React.MouseEvent) => {
    if (e && (e.ctrlKey || e.metaKey)) {
      window.open('/my-teams', '_blank')
    } else {
      router.push('/my-teams')
    }
  }

  const handleAdminNavigation = (e?: React.MouseEvent) => {
    const adminUrl = '/admin'
    if (e && (e.ctrlKey || e.metaKey)) {
      window.open(adminUrl, '_blank', 'noopener,noreferrer')
    } else {
      window.location.href = adminUrl
    }
  }

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      // Use a more stable scroll method that doesn't affect layout
      const elementRect = element.getBoundingClientRect()
      const absoluteElementTop = elementRect.top + window.pageYOffset
      const middle = absoluteElementTop - (window.innerHeight / 2) + (elementRect.height / 2)
      
      window.scrollTo({
        top: middle,
        behavior: 'smooth'
      })
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 overflow-x-hidden">
        {/* Header */}
        <header className="bg-gray-950/80 backdrop-blur-md shadow-sm border-b border-gray-800/50 sticky top-0 z-50 will-change-transform">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img src="/favicon.svg" alt="Availability Planner Logo" className="h-8 w-8 filter brightness-200" />
              <h1 className="text-xl font-bold text-white hidden sm:block">Availability Planner</h1>
              <h1 className="text-lg font-bold text-white sm:hidden">AvPlanner</h1>
            </div>
            <div className="flex items-center gap-4">
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-4">
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="flex items-center gap-2 px-3 border-gray-700 bg-gray-800/50 text-white hover:bg-gray-700/50 hover:border-gray-600 hover:shadow-md transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-gray-950"
                      >
                        <Avatar className="h-6 w-6">
                          {(userProfileImage || user.user_metadata?.avatar_url) && (
                            <AvatarImage 
                              src={userProfileImage || user.user_metadata?.avatar_url} 
                              onLoad={() => console.log('✅ Homepage avatar loaded')}
                              onError={() => console.log('❌ Homepage avatar failed')}
                            />
                          )}
                          <AvatarFallback className="text-xs bg-gray-700 text-white">
                            {user.user_metadata?.first_name?.[0] || user.email?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium max-w-[100px] truncate">
                          {user.user_metadata?.first_name || user.email?.split('@')[0]}
                        </span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-gray-900 border-gray-800">
                      <DropdownMenuItem 
                        onClick={handleViewDashboard}
                        className="cursor-pointer text-gray-200 transition-all duration-200 hover:bg-gray-800 hover:text-blue-400 focus:bg-gray-800 focus:text-blue-400"
                      >
                        <UserIcon className="h-4 w-4 mr-2 transition-colors duration-200" />
                        My Teams & Me
                      </DropdownMenuItem>
                      
                      {userTeams.length > 0 && (
                        <>
                          <DropdownMenuSeparator className="bg-gray-800" />
                          <div className="px-2 py-1.5 text-xs font-semibold text-gray-400">
                            My Teams
                          </div>
                          {userTeams.map((team: any) => (
                            <DropdownMenuItem 
                              key={team.team_id}
                              onClick={() => {
                                const teamPath = `/team/${team.team_slug || team.team_invite_code}`
                                router.push(teamPath)
                              }}
                              className="cursor-pointer text-gray-200 transition-all duration-200 hover:bg-gray-800 hover:text-blue-400 focus:bg-gray-800 focus:text-blue-400"
                            >
                              <Users className="h-4 w-4 mr-2 transition-colors duration-200" />
                              <span className="truncate">{team.team_name}</span>
                            </DropdownMenuItem>
                          ))}
                        </>
                      )}
                      
                      {isAdmin && (
                        <>
                          <DropdownMenuSeparator className="bg-gray-800" />
                          <DropdownMenuItem 
                            onClick={handleAdminNavigation}
                            className="cursor-pointer text-gray-200 transition-all duration-200 hover:bg-gray-800 hover:text-purple-400 focus:bg-gray-800 focus:text-purple-400"
                          >
                            <Shield className="h-4 w-4 mr-2 transition-colors duration-200" />
                            Admin Panel
                          </DropdownMenuItem>
                        </>
                      )}
                      
                      <DropdownMenuSeparator className="bg-gray-800" />
                      <DropdownMenuItem 
                        onClick={handleLogout}
                        className="cursor-pointer text-gray-200 transition-all duration-200 hover:bg-gray-800 hover:text-red-400 focus:bg-gray-800 focus:text-red-400"
                      >
                        <LogOut className="h-4 w-4 mr-2 transition-colors duration-200" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  // If not logged in, show Login and Sign Up buttons
                  <>
                    <LoginButton />
                    <RegisterButton />
                  </>
                )}
              </div>
              
              {/* Mobile Navigation */}
              <HamburgerMenu 
                title="Availability Planner" 
                appName="AvPlanner"
              >
                <div className="p-4 space-y-2">
                  {user ? (
                    <>
                      <Button
                        variant="ghost"
                        onClick={handleViewDashboard}
                        className="w-full justify-start text-left h-auto py-3 px-3"
                      >
                        <UserIcon className="h-4 w-4 mr-3" />
                        <span>My Teams & Me</span>
                      </Button>
                      
                      {userTeams.length > 0 && (
                        <>
                          <div className="border-t border-gray-200 pt-2 mt-2">
                            <div className="px-3 py-2 text-xs font-semibold text-gray-600">
                              My Teams
                            </div>
                            {userTeams.map((team: any) => (
                              <Button
                                key={team.team_id}
                                variant="ghost"
                                onClick={() => {
                                  const teamPath = `/team/${team.team_slug || team.team_invite_code}`
                                  router.push(teamPath)
                                }}
                                className="w-full justify-start text-left h-auto py-3 px-3"
                              >
                                <Users className="h-4 w-4 mr-3" />
                                <span className="truncate">{team.team_name}</span>
                              </Button>
                            ))}
                          </div>
                        </>
                      )}
                      
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          onClick={handleAdminNavigation}
                          className="w-full justify-start text-left h-auto py-3 px-3 text-purple-700 hover:bg-purple-50"
                        >
                          <Shield className="h-4 w-4 mr-3" />
                          <span>Admin Panel</span>
                        </Button>
                      )}
                      <div className="border-t border-gray-200 pt-2">
                        <Button
                          variant="ghost"
                          onClick={handleLogout}
                          className="w-full justify-start text-left h-auto py-3 px-3 text-red-700 hover:bg-red-50"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          <span>Logout</span>
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-full px-3 py-2">
                        <LoginButton />
                      </div>
                      <div className="w-full px-3 py-2">
                        <RegisterButton />
                      </div>
                    </>
                  )}
                </div>
              </HamburgerMenu>

            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:py-32 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-blue-500/20 rounded-full mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-sm font-medium text-gray-300">Transform Your Team Coordination</span>
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 sm:mb-8">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Plan Together,
            </span>
            <br />
            <span className="text-white">Succeed Together</span>
          </h2>
          
          <p className="text-lg sm:text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-8 sm:mb-12 leading-relaxed">
            The modern team availability platform that brings clarity to coordination.
            <span className="block mt-2 text-blue-400 font-semibold">Real-time visibility. Effortless planning.</span>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <button
              onClick={() => scrollToSection('create-team')}
              className="group relative w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-500 hover:to-purple-500 transform hover:scale-105 transition-all duration-200 shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/40"
            >
              <span className="relative z-10">Create Your Team</span>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-100 blur transition-opacity duration-200"></div>
            </button>
            <button
              onClick={() => scrollToSection('join-team')}
              className="w-full sm:w-auto bg-gray-800/50 backdrop-blur-sm text-white border-2 border-gray-700 hover:border-gray-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-700/50 transform hover:scale-105 transition-all duration-200"
            >
              Join Existing Team
            </button>
          </div>

          {/* Stats / Social Proof */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-12 border-t border-gray-800">
            <div>
              <div className="text-3xl font-bold text-white mb-1">99.9%</div>
              <div className="text-sm text-gray-400">Uptime</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">{'<'} 100ms</div>
              <div className="text-sm text-gray-400">Response Time</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">24/7</div>
              <div className="text-sm text-gray-400">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything you need for
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> seamless coordination</span>
            </h3>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Built for modern teams who value clarity and efficiency
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="group bg-gray-900/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-800 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10">
              <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">Real-Time Calendar</h4>
              <p className="text-gray-400">Instant availability updates that keep everyone in sync</p>
            </div>

            <div className="group bg-gray-900/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-800 hover:border-purple-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10">
              <div className="h-12 w-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">Visual Analytics</h4>
              <p className="text-gray-400">Beautiful insights that make team planning effortless</p>
            </div>

            <div className="group bg-gray-900/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-800 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10">
              <div className="h-12 w-12 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">Lightning Fast</h4>
              <p className="text-gray-400">Blazing performance that respects your time</p>
            </div>

            <div className="group bg-gray-900/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-800 hover:border-green-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/10">
              <div className="h-12 w-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">Multi-Language</h4>
              <p className="text-gray-400">Global teams, local experience - support for all languages</p>
            </div>

            <div className="group bg-gray-900/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-800 hover:border-orange-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/10">
              <div className="h-12 w-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">Smart Export</h4>
              <p className="text-gray-400">Export to Excel, PDF, or any format you need</p>
            </div>

            <div className="group bg-gray-900/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-800 hover:border-pink-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/10">
              <div className="h-12 w-12 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">Custom Themes</h4>
              <p className="text-gray-400">Personalize your workspace with beautiful themes</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h3 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Why teams love
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> AvPlanner</span>
            </h3>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Join thousands of teams who have transformed their coordination
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center group">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
                <div className="relative h-20 w-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                  <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <h4 className="text-2xl font-semibold text-white mb-3">Save 10+ Hours Weekly</h4>
              <p className="text-gray-400 leading-relaxed">Stop the endless back-and-forth emails. Know who's available instantly.</p>
            </div>

            <div className="text-center group">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-blue-600 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
                <div className="relative h-20 w-20 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto">
                  <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h4 className="text-2xl font-semibold text-white mb-3">Real-Time Sync</h4>
              <p className="text-gray-400 leading-relaxed">Changes reflect instantly. No more outdated spreadsheets or miscommunication.</p>
            </div>

            <div className="text-center group">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
                <div className="relative h-20 w-20 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto">
                  <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <h4 className="text-2xl font-semibold text-white mb-3">Crystal Clear Insights</h4>
              <p className="text-gray-400 leading-relaxed">Beautiful analytics that help you make better planning decisions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Get started in
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> 3 simple steps</span>
            </h3>
            <p className="text-gray-400 text-lg">No credit card required. Start coordinating in minutes.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Connection lines for desktop */}
            <div className="hidden md:block absolute top-12 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
            
            <div className="relative">
              <div className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-50"></div>
                  <div className="relative h-24 w-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                    <span className="text-4xl font-bold text-white">1</span>
                  </div>
                </div>
                <h4 className="text-2xl font-semibold text-white mb-3">Create Your Team</h4>
                <p className="text-gray-400 leading-relaxed">Set up your team in seconds. Customize it to match your workflow.</p>
              </div>
            </div>

            <div className="relative">
              <div className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-purple-500 rounded-full blur-xl opacity-50"></div>
                  <div className="relative h-24 w-24 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                    <span className="text-4xl font-bold text-white">2</span>
                  </div>
                </div>
                <h4 className="text-2xl font-semibold text-white mb-3">Invite Team Members</h4>
                <p className="text-gray-400 leading-relaxed">Share your unique team code. Members join instantly, no sign-up friction.</p>
              </div>
            </div>

            <div className="text-center">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-pink-500 rounded-full blur-xl opacity-50"></div>
                <div className="relative h-24 w-24 bg-gradient-to-br from-pink-500 to-pink-600 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                  <span className="text-4xl font-bold text-white">3</span>
                </div>
              </div>
              <h4 className="text-2xl font-semibold text-white mb-3">Start Planning</h4>
              <p className="text-gray-400 leading-relaxed">Track availability, spot conflicts, and coordinate like never before.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Animated background gradients */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 shadow-2xl">
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to transform your team coordination?
            </h3>
            <p className="text-xl text-blue-100 mb-10 leading-relaxed">
              Join teams worldwide who have eliminated scheduling chaos and saved countless hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => scrollToSection('create-team')}
                className="group relative bg-white text-blue-600 px-10 py-4 rounded-xl font-semibold hover:bg-gray-50 transform hover:scale-105 transition-all duration-200 shadow-xl"
              >
                <span className="relative z-10">Start Free Today</span>
              </button>
              <button
                onClick={() => scrollToSection('join-team')}
                className="bg-transparent border-2 border-white text-white px-10 py-4 rounded-xl font-semibold hover:bg-white/10 transform hover:scale-105 transition-all duration-200"
              >
                Join a Team
              </button>
            </div>
            <p className="text-sm text-blue-200 mt-6">No credit card required • Free forever • Setup in 2 minutes</p>
          </div>
        </div>
      </section>

      {/* Team Management Section */}
      <section id="team-management" className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        
        {/* Extra spacing to prevent scroll interference */}
        <div className="h-8" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Create Team Section */}
            <div id="create-team" className="scroll-mt-24 relative bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-500/10 p-8 border border-gray-800 hover:border-blue-500/50 hover:shadow-blue-500/20 transition-all duration-300 group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/50 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h4 className="text-3xl font-bold text-white mb-3">Create Your Team</h4>
                  <p className="text-gray-400">Start your journey by creating a new team and inviting your colleagues</p>
                </div>
                <TeamForm locale="en" />
              </div>
            </div>
            
            {/* Join Team Section */}
            <div id="join-team" className="scroll-mt-24 relative bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-purple-500/10 p-8 border border-gray-800 hover:border-purple-500/50 hover:shadow-purple-500/20 transition-all duration-300 group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl mb-4 shadow-lg shadow-purple-500/50 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <h4 className="text-3xl font-bold text-white mb-3">Join a Team</h4>
                  <p className="text-gray-400">Already have an invite code? Join your team and start collaborating</p>
                </div>
                <JoinTeamForm locale="en" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom spacing to prevent scroll interference */}
        <div className="h-8" />
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 border-t border-gray-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="relative group cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                <div className="relative h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110">
                  <img src="/favicon.svg" alt="AvPlanner Logo" className="h-10 w-10 filter brightness-200" />
                </div>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-white font-bold text-2xl leading-none bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">AvPlanner</span>
                <span className="text-gray-500 text-sm leading-none mt-1">Team Planning Made Simple</span>
              </div>
            </div>
            
            <div className="h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent mb-6"></div>
            
            <p className="text-gray-400 mb-2">
              Made with <span className="text-red-500">❤️</span> for teams everywhere
            </p>
            <p className="text-gray-500 text-sm">
              Created by <span className="font-semibold text-gray-400">Jonas Van Hove</span>
            </p>
            
            <div className="mt-8 text-xs text-gray-600">
              © 2025 AvPlanner. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
