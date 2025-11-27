"use client"

import { useState, useEffect, useCallback } from 'react'

interface NotificationSettings {
  pushEnabled: boolean
  emailDigestEnabled: boolean
  teamsWebhookUrl: string | null
  teamsEnabled: boolean
  reminderTime: string // HH:mm format
}

const defaultSettings: NotificationSettings = {
  pushEnabled: false,
  emailDigestEnabled: false,
  teamsWebhookUrl: null,
  teamsEnabled: false,
  reminderTime: '18:00' // 6 PM default
}

export function useNotificationSettings(teamId?: string, userId?: string) {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [synced, setSynced] = useState(false)

  const storageKey = teamId ? `notification-settings-${teamId}` : 'notification-settings-global'

  // Load settings from localStorage first, then sync with backend
  useEffect(() => {
    setMounted(true)
    
    // Load from localStorage for immediate display
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setSettings({ ...defaultSettings, ...parsed })
      } catch (e) {
        console.warn('Failed to parse notification settings')
      }
    }
    
    // Sync with backend if we have userId and teamId
    if (userId && teamId) {
      fetchSettingsFromBackend(userId, teamId)
    }
  }, [storageKey, userId, teamId])

  // Fetch settings from backend API
  const fetchSettingsFromBackend = async (uid: string, tid: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/notifications/preferences?userId=${uid}&teamId=${tid}`)
      if (response.ok) {
        const data = await response.json()
        if (data.preferences) {
          const backendSettings: NotificationSettings = {
            pushEnabled: data.preferences.push_enabled ?? false,
            emailDigestEnabled: data.preferences.email_digest_enabled ?? false,
            teamsWebhookUrl: data.preferences.teams_webhook_url ?? null,
            teamsEnabled: data.preferences.teams_enabled ?? false,
            reminderTime: data.preferences.reminder_time ?? '18:00'
          }
          setSettings(backendSettings)
          localStorage.setItem(storageKey, JSON.stringify(backendSettings))
          setSynced(true)
        }
      }
    } catch (e) {
      console.warn('Failed to fetch settings from backend, using local cache')
    } finally {
      setLoading(false)
    }
  }

  // Save settings to localStorage AND backend
  const saveSettings = useCallback(async (newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings }
      localStorage.setItem(storageKey, JSON.stringify(updated))
      return updated
    })
    
    // Sync to backend if we have userId and teamId
    if (userId && teamId) {
      try {
        const current = { ...settings, ...newSettings }
        await fetch('/api/notifications/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            teamId,
            pushEnabled: current.pushEnabled,
            emailDigestEnabled: current.emailDigestEnabled,
            teamsWebhookUrl: current.teamsWebhookUrl,
            teamsEnabled: current.teamsEnabled,
            reminderTime: current.reminderTime
          })
        })
      } catch (e) {
        console.warn('Failed to sync settings to backend')
      }
    }
  }, [storageKey, userId, teamId, settings])

  // Request push notification permission
  const requestPushPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('Push notifications not supported')
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission === 'denied') {
      return false
    }

    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }, [])

  // Enable push notifications
  const enablePush = useCallback(async (): Promise<boolean> => {
    const granted = await requestPushPermission()
    if (granted) {
      saveSettings({ pushEnabled: true })
      // Schedule the reminder check
      scheduleDailyReminder()
    }
    return granted
  }, [requestPushPermission, saveSettings])

  // Disable push notifications
  const disablePush = useCallback(() => {
    saveSettings({ pushEnabled: false })
  }, [saveSettings])

  // Toggle email digest
  const toggleEmailDigest = useCallback((enabled: boolean) => {
    saveSettings({ emailDigestEnabled: enabled })
  }, [saveSettings])

  // Set Teams webhook URL
  const setTeamsWebhook = useCallback((url: string | null) => {
    saveSettings({ 
      teamsWebhookUrl: url,
      teamsEnabled: !!url 
    })
  }, [saveSettings])

  // Toggle Teams integration
  const toggleTeams = useCallback((enabled: boolean) => {
    saveSettings({ teamsEnabled: enabled })
  }, [saveSettings])

  // Set reminder time
  const setReminderTime = useCallback((time: string) => {
    saveSettings({ reminderTime: time })
  }, [saveSettings])

  // Test Teams webhook connection
  const testTeamsWebhook = useCallback(async (webhookUrl: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/notifications/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          webhookUrl,
          messageType: 'test',
          data: {
            title: 'AvPlanner Test',
            message: 'Teams integration is working! 🎉'
          }
        })
      })
      return response.ok
    } catch (e) {
      console.error('Failed to test Teams webhook:', e)
      return false
    }
  }, [teamId])

  // Request weekly digest email
  const requestWeeklyDigest = useCallback(async (locale: string = 'en'): Promise<boolean> => {
    if (!teamId) return false
    try {
      const response = await fetch('/api/notifications/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, userId, locale })
      })
      return response.ok
    } catch (e) {
      console.error('Failed to request digest:', e)
      return false
    }
  }, [teamId, userId])

  return {
    settings,
    mounted,
    loading,
    synced,
    enablePush,
    disablePush,
    toggleEmailDigest,
    setTeamsWebhook,
    toggleTeams,
    setReminderTime,
    requestPushPermission,
    testTeamsWebhook,
    requestWeeklyDigest
  }
}

// Schedule daily reminder check
function scheduleDailyReminder() {
  // This will be called by the service worker or a background task
  // For now, we'll check when the app is open
  if (typeof window !== 'undefined') {
    // Register for background sync if available
    if ('serviceWorker' in navigator && 'sync' in (navigator.serviceWorker as any)) {
      navigator.serviceWorker.ready.then(registration => {
        (registration as any).sync?.register('check-availability-reminder')
      }).catch(console.warn)
    }
  }
}

// Check if user needs a reminder (called from service worker or on app load)
export async function checkAvailabilityReminder(
  teamId: string,
  memberId: string,
  memberName: string,
  checkTomorrow: () => Promise<boolean>
): Promise<void> {
  const storageKey = `notification-settings-${teamId}`
  const stored = localStorage.getItem(storageKey)
  
  if (!stored) return
  
  const settings: NotificationSettings = JSON.parse(stored)
  
  if (!settings.pushEnabled) return
  
  // Check if tomorrow's availability is filled
  const isFilled = await checkTomorrow()
  
  if (!isFilled && Notification.permission === 'granted') {
    new Notification('AvPlanner Reminder', {
      body: `Hey ${memberName}, je hebt morgen nog geen beschikbaarheid ingevuld!`,
      icon: '/favicon.svg',
      tag: 'availability-reminder',
      requireInteraction: true
    })
  }
}

// Send notification to Teams channel via webhook
export async function sendTeamsNotification(
  webhookUrl: string,
  title: string,
  message: string,
  teamName?: string
): Promise<boolean> {
  try {
    const card = {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      "themeColor": "0076D7",
      "summary": title,
      "sections": [{
        "activityTitle": title,
        "activitySubtitle": teamName ? `Team: ${teamName}` : undefined,
        "activityImage": "https://avplanner.app/favicon.svg",
        "facts": [],
        "markdown": true,
        "text": message
      }]
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(card)
    })

    return response.ok
  } catch (error) {
    console.error('Failed to send Teams notification:', error)
    return false
  }
}
