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
  // Determine if a theme is one of the app's advanced theme names
  const themeClasses = ['autumn', 'winter', 'spring', 'summer', 'cozy', 'blackwhite', 'bythestove', 'testdev']

  React.useEffect(() => {
    const htmlElement = document.documentElement

    // Always remove previous advanced theme classes to avoid duplicates
    themeClasses.forEach(cls => htmlElement.classList.remove(cls))

    // If a named theme is selected, apply it consistently across routes.
    // Team-specific restrictions can be handled elsewhere; for now we preserve user's choice.
    if (theme && themeClasses.includes(theme)) {
      htmlElement.classList.add(theme)
      // For 'testdev', also ensure dark mode class is present for previewing dark variants
      if (theme === 'testdev') {
        htmlElement.classList.add('dark')
      } else {
        // Remove explicit dark when switching away from testdev to avoid surprises
        htmlElement.classList.remove('dark')
      }
    } else {
      // Not an advanced theme - ensure no leftover advanced class remains
      themeClasses.forEach(cls => htmlElement.classList.remove(cls))
      // Don't meddle with system/light/dark handling from next-themes; let it handle 'dark' class
    }
  }, [theme])
  
  return <>{children}</>
}