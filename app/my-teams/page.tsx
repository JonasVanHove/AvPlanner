'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTranslation, type Locale } from "@/lib/i18n"
import { UserDashboard } from '@/components/auth/user-dashboard'
import { LoginForm } from '@/components/auth/login-form'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { LogOut, UserIcon, ChevronDown, Shield, Home } from "lucide-react"
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'


export default function MyTeamsPage() {
  const { t } = useTranslation("en") // TODO: Make locale dynamic
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userProfileImage, setUserProfileImage] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Check admin status if user is logged in
      if (session?.user) {
        checkAdminStatus(session.user.email!)
        fetchUserProfileImage(session.user.email!)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Check admin status if user is logged in
      if (session?.user) {
        checkAdminStatus(session.user.email!)
        fetchUserProfileImage(session.user.email!)
      } else {
        setIsAdmin(false)
        setUserProfileImage(null)
      }
    })

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
          console.log('🖼️ Found my-teams user profile image:', profileImg.substring(0, 50) + '...')
          setUserProfileImage(profileImg)
        }
      }
    } catch (error) {
      console.log('Error fetching my-teams user profile image:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleGoHome = (e?: React.MouseEvent) => {
    if (e && (e.ctrlKey || e.metaKey)) {
      window.open('/', '_blank')
    } else {
      router.push('/')
    }
  }

  const handleAdminNavigation = (e?: React.MouseEvent) => {
    if (e && (e.ctrlKey || e.metaKey)) {
      window.open('/admin', '_blank')
    } else {
      router.push('/admin')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">{t('myTeams.loading')}</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">{t('myTeams.title')}</h1>
            <p className="text-muted-foreground mt-2">{t('myTeams.pleaseLogin')}</p>
          </div>
          <LoginForm />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header - Consistent with Landing Page */}
  <header className="sticky top-0 z-50 will-change-transform backdrop-blur supports-[backdrop-filter]:bg-white/40 dark:supports-[backdrop-filter]:bg-black/20 bg-white/70 dark:bg-black/30 border-b border-black/5 dark:border-cyan-500/20 shadow-sm dark:shadow-[0_0_24px_-8px_rgba(34,211,238,0.6)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img src="/favicon.svg" alt="Availability Planner Logo" className="h-8 w-8" />
              <h1 className="text-xl font-bold hidden sm:block">{t('myTeams.title')}</h1>
              <h1 className="text-lg font-bold sm:hidden">{t('myTeams.title')}</h1>
            </div>
            <div className="flex items-center gap-4">
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-2 px-3 transition-all duration-200 hover:bg-accent/60 hover:border-border hover:shadow-md focus:ring-2 focus:ring-ring focus:ring-offset-1"
                    >
                      <Avatar className="h-6 w-6">
                        {(userProfileImage || user?.user_metadata?.avatar_url) && (
                          <AvatarImage 
                            src={userProfileImage || user?.user_metadata?.avatar_url} 
                            onLoad={() => console.log('✅ My-teams avatar loaded')}
                            onError={() => console.log('❌ My-teams avatar failed')}
                          />
                        )}
                        <AvatarFallback className="text-xs">
                          {user?.user_metadata?.first_name?.[0] || user?.email?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium max-w-[100px] truncate">
                        {user?.user_metadata?.first_name || user?.email?.split('@')[0]}
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem 
                      onClick={handleGoHome}
                      className="cursor-pointer transition-all duration-200 hover:bg-accent focus:bg-accent"
                    >
                      <Home className="h-4 w-4 mr-2 transition-colors duration-200" />
                      {t('myTeams.backToHome')}
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem 
                        onClick={handleAdminNavigation}
                        className="cursor-pointer transition-all duration-200 hover:bg-accent focus:bg-accent"
                      >
                        <Shield className="h-4 w-4 mr-2 transition-colors duration-200" />
                        {t('myTeams.adminPanel')}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleLogout}
                      className="cursor-pointer transition-all duration-200 hover:bg-accent focus:bg-accent"
                    >
                      <LogOut className="h-4 w-4 mr-2 transition-colors duration-200" />
                      {t('myTeams.logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              

            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex justify-center">
          <UserDashboard 
            user={user} 
            onLogout={handleLogout}
            onGoHome={handleGoHome}
          />
        </div>
      </div>
    </div>
  )
}
