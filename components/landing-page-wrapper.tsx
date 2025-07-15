"use client"

import { useEffect } from "react"

interface LandingPageWrapperProps {
  children: React.ReactNode
}

export function LandingPageWrapper({ children }: LandingPageWrapperProps) {
  useEffect(() => {
    // Force light mode for landing page
    document.documentElement.classList.remove('dark')
    document.documentElement.setAttribute('data-theme', 'light')
    
    // Cleanup on unmount - restore to system theme
    return () => {
      document.documentElement.removeAttribute('data-theme')
      // Let the system theme take over when leaving the landing page
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      if (systemTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [])

  return <>{children}</>
}
