"use client"

import { useState, useEffect, useCallback, createContext, useContext } from 'react'

interface AccessibilitySettings {
  highContrast: boolean
  reducedMotion: boolean
}

interface AccessibilityContextType extends AccessibilitySettings {
  setHighContrast: (enabled: boolean) => void
  setReducedMotion: (enabled: boolean) => void
}

const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  reducedMotion: false
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null)

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings)
  const [mounted, setMounted] = useState(false)

  // Load settings from localStorage on mount
  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('accessibility-settings')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setSettings(parsed)
      } catch (e) {
        console.warn('Failed to parse accessibility settings')
      }
    }
    
    // Also check system preference for reduced motion
    if (typeof window !== 'undefined') {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (prefersReducedMotion && !stored) {
        setSettings(prev => ({ ...prev, reducedMotion: true }))
      }
    }
  }, [])

  // Apply settings to document
  useEffect(() => {
    if (!mounted) return
    
    const html = document.documentElement
    
    if (settings.highContrast) {
      html.classList.add('high-contrast')
    } else {
      html.classList.remove('high-contrast')
    }
    
    if (settings.reducedMotion) {
      html.classList.add('reduced-motion')
    } else {
      html.classList.remove('reduced-motion')
    }
    
    // Save to localStorage
    localStorage.setItem('accessibility-settings', JSON.stringify(settings))
  }, [settings, mounted])

  const setHighContrast = useCallback((enabled: boolean) => {
    setSettings(prev => ({ ...prev, highContrast: enabled }))
  }, [])

  const setReducedMotion = useCallback((enabled: boolean) => {
    setSettings(prev => ({ ...prev, reducedMotion: enabled }))
  }, [])

  return (
    <AccessibilityContext.Provider value={{
      ...settings,
      setHighContrast,
      setReducedMotion
    }}>
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  
  // Fallback for when not wrapped in provider (SSR or testing)
  if (!context) {
    return {
      highContrast: false,
      reducedMotion: false,
      setHighContrast: () => {},
      setReducedMotion: () => {}
    }
  }
  
  return context
}
