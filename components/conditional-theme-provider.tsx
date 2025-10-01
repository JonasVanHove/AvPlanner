'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { usePathname } from 'next/navigation'

interface ConditionalThemeProviderProps {
  children: React.ReactNode
  teamSlug?: string
}

export function ConditionalThemeProvider({ children, teamSlug }: ConditionalThemeProviderProps) {
  const { theme } = useTheme()
  const pathname = usePathname()
  
  // Only apply advanced themes on efficiency-team page
  const shouldApplyAdvancedThemes = teamSlug === 'efficiency-team' || pathname.includes('/team/efficiency-team')
  
  React.useEffect(() => {
    const htmlElement = document.documentElement
    
    // Remove all theme classes first
    const themeClasses = ['autumn', 'winter', 'spring', 'summer', 'cozy', 'blackwhite', 'bythestove']
    themeClasses.forEach(cls => htmlElement.classList.remove(cls))
    
    // Only apply advanced themes if on efficiency-team page
    if (shouldApplyAdvancedThemes && theme && themeClasses.includes(theme)) {
      htmlElement.classList.add(theme)
    } else if (!shouldApplyAdvancedThemes && theme && themeClasses.includes(theme)) {
      // If not on efficiency-team page and an advanced theme is selected, 
      // fall back to system theme
      htmlElement.classList.remove(theme)
    }
  }, [theme, shouldApplyAdvancedThemes])
  
  return <>{children}</>
}