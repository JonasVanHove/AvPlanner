"use client"

import { TeamForm } from "@/components/team-form"
import { JoinTeamForm } from "@/components/join-team-form"
import { LanguageSelector } from "@/components/language-selector"
import { LoginButton, RegisterButton } from "@/components/auth/auth-dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { LogOut, UserIcon, ChevronDown, Shield } from "lucide-react"
import { useTranslation } from "@/lib/i18n"
import { supabase } from "@/lib/supabase"
import { useEffect, useState } from "react"
import { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"


export default function HomePage() {
  const { t } = useTranslation("en")
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userProfileImage, setUserProfileImage] = useState<string | null>(null)

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
        } else {
          setIsAdmin(false)
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

  // Force light mode for landing page (better for sales/marketing)
  useEffect(() => {
    document.documentElement.classList.remove('dark')
    document.documentElement.setAttribute('data-theme', 'light')
    
    // Clean up on unmount
    return () => {
      document.documentElement.removeAttribute('data-theme')
      // Restore user's preferred theme when leaving
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark')
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
    if (e && (e.ctrlKey || e.metaKey)) {
      window.open('/admin', '_blank')
    } else {
      router.push('/admin')
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 overflow-x-hidden">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-white/20 sticky top-0 z-50 will-change-transform">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img src="/favicon.svg" alt="Availability Planner Logo" className="h-8 w-8" />
              <h1 className="text-xl font-bold text-black hidden sm:block">Availability Planner</h1>
              <h1 className="text-lg font-bold text-black sm:hidden">AvPlanner</h1>
            </div>
            <div className="flex items-center gap-4">
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-4">
                <LanguageSelector currentLocale="en" />
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="flex items-center gap-2 px-3 transition-all duration-200 hover:bg-blue-50 hover:border-blue-200 hover:shadow-md focus:ring-2 focus:ring-blue-200 focus:ring-offset-1"
                      >
                        <Avatar className="h-6 w-6">
                          {(userProfileImage || user.user_metadata?.avatar_url) && (
                            <AvatarImage 
                              src={userProfileImage || user.user_metadata?.avatar_url} 
                              onLoad={() => console.log('✅ Homepage avatar loaded')}
                              onError={() => console.log('❌ Homepage avatar failed')}
                            />
                          )}
                          <AvatarFallback className="text-xs">
                            {user.user_metadata?.first_name?.[0] || user.email?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium max-w-[100px] truncate">
                          {user.user_metadata?.first_name || user.email?.split('@')[0]}
                        </span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem 
                        onClick={handleViewDashboard}
                        className="cursor-pointer transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 focus:bg-blue-50 focus:text-blue-700"
                      >
                        <UserIcon className="h-4 w-4 mr-2 transition-colors duration-200" />
                        My Teams
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem 
                          onClick={handleAdminNavigation}
                          className="cursor-pointer transition-all duration-200 hover:bg-purple-50 hover:text-purple-700 focus:bg-purple-50 focus:text-purple-700"
                        >
                          <Shield className="h-4 w-4 mr-2 transition-colors duration-200" />
                          Admin Panel
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={handleLogout}
                        className="cursor-pointer transition-all duration-200 hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700"
                      >
                        <LogOut className="h-4 w-4 mr-2 transition-colors duration-200" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="flex items-center gap-2">
                    <LoginButton />
                    <RegisterButton />
                  </div>
                )}
              </div>
              

            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-12 px-4 sm:py-20 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4 sm:mb-6">
            {t("landing.subtitle")}
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-6 sm:mb-8 leading-relaxed">
            {t("landing.description")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => scrollToSection('create-team')}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Create Team
            </button>
            <button
              onClick={() => scrollToSection('join-team')}
              className="w-full sm:w-auto bg-white text-blue-600 px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold hover:bg-blue-50 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl border-2 border-blue-600"
            >
              Join Team
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">{t("landing.features")}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-white/20">
              <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">{t("landing.feature1.title")}</h4>
              <p className="text-gray-600">{t("landing.feature1.description")}</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-white/20">
              <div className="h-12 w-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">{t("landing.feature2.title")}</h4>
              <p className="text-gray-600">{t("landing.feature2.description")}</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-white/20">
              <div className="h-12 w-12 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">{t("landing.feature3.title")}</h4>
              <p className="text-gray-600">{t("landing.feature3.description")}</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-white/20">
              <div className="h-12 w-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">{t("landing.feature4.title")}</h4>
              <p className="text-gray-600">{t("landing.feature4.description")}</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-white/20">
              <div className="h-12 w-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">{t("landing.feature5.title")}</h4>
              <p className="text-gray-600">{t("landing.feature5.description")}</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-white/20">
              <div className="h-12 w-12 bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">{t("landing.feature6.title")}</h4>
              <p className="text-gray-600">{t("landing.feature6.description")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">{t("landing.benefits")}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-16 w-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">{t("landing.benefit1.title")}</h4>
              <p className="text-gray-600">{t("landing.benefit1.description")}</p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">{t("landing.benefit2.title")}</h4>
              <p className="text-gray-600">{t("landing.benefit2.description")}</p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">{t("landing.benefit3.title")}</h4>
              <p className="text-gray-600">{t("landing.benefit3.description")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">{t("landing.howItWorks")}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="text-center">
                <div className="h-16 w-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">1</span>
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">{t("landing.step1.title")}</h4>
                <p className="text-gray-600">{t("landing.step1.description")}</p>
              </div>
              <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 -z-10"></div>
            </div>

            <div className="relative">
              <div className="text-center">
                <div className="h-16 w-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">2</span>
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">{t("landing.step2.title")}</h4>
                <p className="text-gray-600">{t("landing.step2.description")}</p>
              </div>
              <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 -z-10"></div>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 bg-gradient-to-r from-pink-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">{t("landing.step3.title")}</h4>
              <p className="text-gray-600">{t("landing.step3.description")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-white mb-4">{t("landing.cta")}</h3>
          <p className="text-xl text-blue-100 mb-8">{t("landing.ctaDescription")}</p>
          {/* <button
            onClick={() => scrollToSection('create-team')}
            className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-blue-50 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Get Started
          </button> */}
        </div>
      </section>

      {/* Team Management Section */}
      <section id="team-management" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5"></div>
        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        
        {/* Extra spacing to prevent scroll interference */}
        <div className="h-8" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Create Team Section */}
            <div id="create-team" className="scroll-mt-24 relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/30 hover:shadow-3xl transition-all duration-300 hover:scale-[1.02] group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-4 shadow-lg">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">Create Team</h4>
                  <p className="text-gray-600">Start your journey by creating a new team and inviting your colleagues</p>
                </div>
                <TeamForm locale="en" />
              </div>
            </div>
            
            {/* Join Team Section */}
            <div id="join-team" className="scroll-mt-24 relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/30 hover:shadow-3xl transition-all duration-300 hover:scale-[1.02] group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full mb-4 shadow-lg">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">Join Team</h4>
                  <p className="text-gray-600">Already have an invite code? Join your team and start collaborating</p>
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
      <footer className="bg-gray-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="border-t border-gray-800 pt-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="relative group cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-r from-white-500 to-gray-600 rounded-xl blur-md opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                <div className="relative h-10 w-10 bg-gradient-to-r from-white-500 to-gray-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                  <img src="/favicon.svg" alt="AvPlanner Logo" className="h-8 w-8" />
                </div>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-white font-semibold text-lg leading-none">AvPlanner</span>
                <span className="text-gray-400 text-sm leading-none mt-1">Team Planning Made Simple</span>
              </div>
            </div>
            <p className="text-gray-400">
              {t("landing.madeWith")} ❤️ {t("landing.forTeams")}
            </p>
            <p className="text-gray-500 text-sm mt-2">
              by <span className="font-semibold text-gray-300">Jonas Van Hove</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
