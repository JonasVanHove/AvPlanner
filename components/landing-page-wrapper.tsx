"use client"

interface LandingPageWrapperProps {
  children: React.ReactNode
}

export function LandingPageWrapper({ children }: LandingPageWrapperProps) {
  return <>{children}</>
}
