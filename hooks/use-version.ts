"use client"

import { useState, useEffect } from 'react'

interface ClientVersionInfo {
  version: string
  buildInfo?: string
  commitMessage?: string
  isLoading: boolean
}

export function useVersion(): ClientVersionInfo {
  const [versionInfo, setVersionInfo] = useState<ClientVersionInfo>({
    version: 'Loading...',
    isLoading: true
  })

  useEffect(() => {
    // Fetch version info from API route
    fetch('/api/version')
      .then(res => res.json())
      .then(data => {
        setVersionInfo({
          version: data.version || 'Git not available',
          buildInfo: data.buildInfo,
          commitMessage: data.commitMessage,
          isLoading: false
        })
      })
      .catch(() => {
        setVersionInfo({
          version: 'Git not available',
          isLoading: false
        })
      })
  }, [])

  return versionInfo
}

// Static version for immediate use
export const APP_VERSION = 'Git not available'
