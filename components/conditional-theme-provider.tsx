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
  
  // Apply advanced themes on all team pages
  const shouldApplyAdvancedThemes = pathname.includes('/team/')
  
  React.useEffect(() => {
    const htmlElement = document.documentElement
    
    // Remove all theme classes first
  const themeClasses = ['autumn', 'winter', 'spring', 'summer', 'cozy', 'blackwhite', 'bythestove', 'testdev']
    themeClasses.forEach(cls => htmlElement.classList.remove(cls))
    
    // Only apply advanced themes if on efficiency-team page
    if (shouldApplyAdvancedThemes && theme && themeClasses.includes(theme)) {
      htmlElement.classList.add(theme)
      // For testdev (Development), also add dark class for Tailwind dark: variants
      if (theme === 'testdev') {
        htmlElement.classList.add('dark')
      }
    } else if (!shouldApplyAdvancedThemes && theme && themeClasses.includes(theme)) {
      // If not on efficiency-team page and an advanced theme is selected, 
      // fall back to system theme
      htmlElement.classList.remove(theme)
    }
  }, [theme, shouldApplyAdvancedThemes])
  
  return <>{children}</>
}