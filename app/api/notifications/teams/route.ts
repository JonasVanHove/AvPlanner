import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface TeamsMessage {
  "@type": "MessageCard"
  "@context": "http://schema.org/extensions"
  themeColor: string
  summary: string
  sections: Array<{
    activityTitle: string
    activitySubtitle?: string
    activityImage?: string
    facts?: Array<{ name: string; value: string }>
    markdown: boolean
  }>
  potentialAction?: Array<{
    "@type": "OpenUri"
    name: string
    targets: Array<{ os: string; uri: string }>
  }>
}

// POST - Send notification to Microsoft Teams channel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      teamId, 
      webhookUrl, 
      messageType, 
      data 
    } = body
    
    if (!webhookUrl) {
      return NextResponse.json({ error: 'webhookUrl is required' }, { status: 400 })
    }
    
    // Build the Teams message based on type
    let message: TeamsMessage
    
    switch (messageType) {
      case 'availability_reminder':
        message = buildReminderMessage(data)
        break
      case 'weekly_summary':
        message = buildWeeklySummaryMessage(data)
        break
      case 'member_update':
        message = buildMemberUpdateMessage(data)
        break
      case 'meeting_suggestion':
        message = buildMeetingSuggestionMessage(data)
        break
      case 'test':
        message = buildTestMessage(data)
        break
      default:
        message = buildGenericMessage(data)
    }
    
    // Send to Teams webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Teams webhook failed: ${response.status} - ${errorText}`)
    }
    
    // Log the notification (optional - if team is authenticated)
    if (teamId) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey)
        await supabase.from('teams_notification_log').insert({
          team_id: teamId,
          message_type: messageType,
          message_content: data,
          status: 'sent'
        })
      } catch (logError) {
        console.warn('Failed to log notification:', logError)
      }
    }
    
    return NextResponse.json({ success: true, message: 'Notification sent to Teams' })
  } catch (error) {
    console.error('Error sending Teams notification:', error)
    return NextResponse.json(
      { error: 'Failed to send Teams notification', details: (error as Error).message },
      { status: 500 }
    )
  }
}

// Test webhook endpoint
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const webhookUrl = searchParams.get('webhookUrl')
  
  if (!webhookUrl) {
    return NextResponse.json({ error: 'webhookUrl is required' }, { status: 400 })
  }
  
  try {
    // Send a test message
    const testMessage: TeamsMessage = {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      themeColor: "0076D7",
      summary: "AvPlanner Test",
      sections: [{
        activityTitle: "✅ AvPlanner Connection Test",
        activitySubtitle: "Your Teams webhook is working correctly!",
        markdown: true
      }]
    }
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testMessage),
    })
    
    if (!response.ok) {
      throw new Error(`Webhook test failed: ${response.status}`)
    }
    
    return NextResponse.json({ success: true, message: 'Test message sent successfully' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Webhook test failed', details: (error as Error).message },
      { status: 400 }
    )
  }
}

// Message builders
function buildReminderMessage(data: { memberName: string; teamName: string; date: string }): TeamsMessage {
  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    themeColor: "FFA500", // Orange
    summary: `Availability reminder for ${data.memberName}`,
    sections: [{
      activityTitle: "📅 Availability Reminder",
      activitySubtitle: `${data.memberName} hasn't filled in availability for ${data.date}`,
      facts: [
        { name: "Team", value: data.teamName },
        { name: "Date", value: data.date }
      ],
      markdown: true
    }]
  }
}

function buildWeeklySummaryMessage(data: { teamName: string; weekStart: string; summary: string }): TeamsMessage {
  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    themeColor: "0076D7", // Blue
    summary: `Weekly summary for ${data.teamName}`,
    sections: [{
      activityTitle: "📊 Weekly Availability Summary",
      activitySubtitle: `Week of ${data.weekStart}`,
      facts: [
        { name: "Team", value: data.teamName }
      ],
      markdown: true
    }, {
      activityTitle: "Summary",
      activitySubtitle: data.summary,
      markdown: true
    }]
  }
}

function buildMemberUpdateMessage(data: { memberName: string; teamName: string; status: string; date: string }): TeamsMessage {
  const statusColors: Record<string, string> = {
    available: "00FF00",
    unavailable: "FF0000",
    remote: "0000FF",
    vacation: "800080",
    unknown: "808080"
  }
  
  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    themeColor: statusColors[data.status] || "808080",
    summary: `${data.memberName} updated availability`,
    sections: [{
      activityTitle: "🔄 Availability Update",
      activitySubtitle: `${data.memberName} is now **${data.status}** on ${data.date}`,
      facts: [
        { name: "Team", value: data.teamName },
        { name: "Member", value: data.memberName },
        { name: "Status", value: data.status },
        { name: "Date", value: data.date }
      ],
      markdown: true
    }]
  }
}

function buildMeetingSuggestionMessage(data: { teamName: string; suggestions: Array<{ date: string; time: string; availableCount: number }> }): TeamsMessage {
  const suggestionsText = data.suggestions
    .map((s, i) => `${i + 1}. **${s.date}** at ${s.time} (${s.availableCount} members available)`)
    .join('\n')
  
  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    themeColor: "00FF00", // Green
    summary: `Meeting suggestions for ${data.teamName}`,
    sections: [{
      activityTitle: "🗓️ Suggested Meeting Times",
      activitySubtitle: `Best times for ${data.teamName} this week`,
      markdown: true
    }, {
      activityTitle: "Suggestions",
      activitySubtitle: suggestionsText || "No common availability found",
      markdown: true
    }]
  }
}

function buildTestMessage(data: { teamName?: string }): TeamsMessage {
  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    themeColor: "0076D7",
    summary: "AvPlanner Test Message",
    sections: [{
      activityTitle: "🔔 AvPlanner Test Notification",
      activitySubtitle: data.teamName 
        ? `This is a test message from ${data.teamName}`
        : "Your Microsoft Teams integration is working!",
      markdown: true
    }]
  }
}

function buildGenericMessage(data: { title?: string; message?: string }): TeamsMessage {
  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    themeColor: "0076D7",
    summary: data.title || "AvPlanner Notification",
    sections: [{
      activityTitle: data.title || "📢 AvPlanner",
      activitySubtitle: data.message || "You have a new notification",
      markdown: true
    }]
  }
}
