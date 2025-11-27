import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns'
import { nl, fr, enUS } from 'date-fns/locale'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface MeetingSuggestion {
  date: string
  dayName: string
  availableMembers: string[]
  availableCount: number
  totalMembers: number
  percentage: number
}

// POST - Generate and send weekly digest email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teamId, userId, locale = 'en' } = body
    
    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 })
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get team info
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', teamId)
      .single()
    
    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }
    
    // Get team members
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, name, email')
      .eq('team_id', teamId)
    
    if (membersError) {
      throw membersError
    }
    
    // Get availability for next week
    const weekStart = startOfWeek(addDays(new Date(), 7), { weekStartsOn: 1 }) // Next Monday
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
    
    const { data: availability, error: availError } = await supabase
      .from('availability')
      .select('member_id, date, status')
      .eq('team_id', teamId)
      .gte('date', format(weekStart, 'yyyy-MM-dd'))
      .lte('date', format(weekEnd, 'yyyy-MM-dd'))
    
    if (availError) {
      throw availError
    }
    
    // Calculate meeting suggestions
    const suggestions = calculateMeetingSuggestions(
      members || [],
      availability || [],
      weekStart,
      locale
    )
    
    // Get user email if userId provided
    let userEmail: string | null = null
    if (userId) {
      const { data: userData } = await supabase.auth.admin.getUserById(userId)
      userEmail = userData?.user?.email || null
    }
    
    // Build email content
    const emailContent = buildDigestEmail(team.name, suggestions, locale)
    
    // In a real implementation, you would send the email here
    // using a service like Resend, SendGrid, or AWS SES
    // For now, we'll return the content for testing
    
    // Log the digest
    if (userId) {
      try {
        await supabase.from('digest_email_log').insert({
          user_id: userId,
          team_id: teamId,
          email_subject: emailContent.subject,
          meeting_suggestions: suggestions,
          status: 'sent'
        })
      } catch (logError) {
        console.warn('Failed to log digest:', logError)
      }
    }
    
    return NextResponse.json({
      success: true,
      teamName: team.name,
      weekStart: format(weekStart, 'yyyy-MM-dd'),
      weekEnd: format(weekEnd, 'yyyy-MM-dd'),
      suggestions,
      email: emailContent,
      recipientEmail: userEmail
    })
  } catch (error) {
    console.error('Error generating digest:', error)
    return NextResponse.json(
      { error: 'Failed to generate digest', details: (error as Error).message },
      { status: 500 }
    )
  }
}

// GET - Preview digest for a team
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get('teamId')
  const locale = searchParams.get('locale') || 'en'
  
  if (!teamId) {
    return NextResponse.json({ error: 'teamId is required' }, { status: 400 })
  }
  
  // Use POST handler with minimal data
  const mockRequest = new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ teamId, locale })
  })
  
  return POST(mockRequest)
}

function calculateMeetingSuggestions(
  members: Array<{ id: string; name: string }>,
  availability: Array<{ member_id: string; date: string; status: string }>,
  weekStart: Date,
  locale: string
): MeetingSuggestion[] {
  const suggestions: MeetingSuggestion[] = []
  const dateLocale = locale === 'nl' ? nl : locale === 'fr' ? fr : enUS
  
  // Check each weekday (Mon-Fri)
  for (let i = 0; i < 5; i++) {
    const date = addDays(weekStart, i)
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayName = format(date, 'EEEE', { locale: dateLocale })
    
    // Find available members for this date
    const availableMembers = members.filter(member => {
      const memberAvail = availability.find(
        a => a.member_id === member.id && a.date === dateStr
      )
      return memberAvail?.status === 'available' || memberAvail?.status === 'remote'
    })
    
    suggestions.push({
      date: dateStr,
      dayName,
      availableMembers: availableMembers.map(m => m.name),
      availableCount: availableMembers.length,
      totalMembers: members.length,
      percentage: members.length > 0 
        ? Math.round((availableMembers.length / members.length) * 100)
        : 0
    })
  }
  
  // Sort by availability percentage (descending)
  return suggestions.sort((a, b) => b.percentage - a.percentage)
}

function buildDigestEmail(
  teamName: string,
  suggestions: MeetingSuggestion[],
  locale: string
): { subject: string; html: string; text: string } {
  const translations: Record<string, Record<string, string>> = {
    en: {
      subject: `Weekly Alignment Suggestion for ${teamName}`,
      title: 'Weekly Team Alignment',
      subtitle: 'Best meeting times this week',
      bestDay: 'Best day for team meeting',
      available: 'available',
      members: 'members',
      noAvailability: 'No common availability found for this week.',
      otherOptions: 'Other options',
      viewCalendar: 'View Calendar'
    },
    nl: {
      subject: `Wekelijkse Afstemming Suggestie voor ${teamName}`,
      title: 'Wekelijkse Team Afstemming',
      subtitle: 'Beste vergadermomenten deze week',
      bestDay: 'Beste dag voor teamvergadering',
      available: 'beschikbaar',
      members: 'leden',
      noAvailability: 'Geen gemeenschappelijke beschikbaarheid gevonden voor deze week.',
      otherOptions: 'Andere opties',
      viewCalendar: 'Bekijk Kalender'
    },
    fr: {
      subject: `Suggestion d'Alignement Hebdomadaire pour ${teamName}`,
      title: 'Alignement d\'Équipe Hebdomadaire',
      subtitle: 'Meilleurs moments de réunion cette semaine',
      bestDay: 'Meilleur jour pour la réunion d\'équipe',
      available: 'disponible',
      members: 'membres',
      noAvailability: 'Aucune disponibilité commune trouvée pour cette semaine.',
      otherOptions: 'Autres options',
      viewCalendar: 'Voir le Calendrier'
    }
  }
  
  const t = translations[locale] || translations.en
  const bestSuggestion = suggestions[0]
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 30px; text-align: center; color: white; }
    .header h1 { margin: 0 0 8px 0; font-size: 24px; }
    .header p { margin: 0; opacity: 0.9; }
    .content { padding: 30px; }
    .best-day { background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .best-day h3 { color: #16a34a; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
    .best-day .day { font-size: 28px; font-weight: bold; color: #15803d; margin-bottom: 5px; }
    .best-day .stats { color: #166534; }
    .other-days { margin-top: 20px; }
    .other-days h4 { color: #6b7280; margin-bottom: 15px; }
    .day-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
    .day-row:last-child { border-bottom: none; }
    .day-name { font-weight: 500; }
    .day-stats { color: #6b7280; }
    .progress { background: #e5e7eb; height: 6px; border-radius: 3px; width: 100px; margin-left: 10px; display: inline-block; vertical-align: middle; }
    .progress-bar { height: 100%; border-radius: 3px; background: #22c55e; }
    .cta { text-align: center; margin-top: 30px; }
    .cta a { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 500; }
    .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 ${t.title}</h1>
      <p>${teamName} - ${t.subtitle}</p>
    </div>
    <div class="content">
      ${bestSuggestion && bestSuggestion.availableCount > 0 ? `
        <div class="best-day">
          <h3>✨ ${t.bestDay}</h3>
          <div class="day">${bestSuggestion.dayName}</div>
          <div class="stats">${bestSuggestion.availableCount} ${t.members} ${t.available} (${bestSuggestion.percentage}%)</div>
        </div>
      ` : `
        <p>${t.noAvailability}</p>
      `}
      
      ${suggestions.length > 1 ? `
        <div class="other-days">
          <h4>${t.otherOptions}:</h4>
          ${suggestions.slice(1).map(s => `
            <div class="day-row">
              <span class="day-name">${s.dayName}</span>
              <span class="day-stats">
                ${s.availableCount}/${s.totalMembers}
                <span class="progress"><span class="progress-bar" style="width: ${s.percentage}%"></span></span>
              </span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      <div class="cta">
        <a href="#">${t.viewCalendar}</a>
      </div>
    </div>
    <div class="footer">
      AvPlanner - Team Availability Made Simple
    </div>
  </div>
</body>
</html>
  `.trim()
  
  const text = `
${t.title} - ${teamName}

${t.bestDay}: ${bestSuggestion?.dayName || '-'}
${bestSuggestion ? `${bestSuggestion.availableCount} ${t.members} ${t.available} (${bestSuggestion.percentage}%)` : t.noAvailability}

${t.otherOptions}:
${suggestions.slice(1).map(s => `- ${s.dayName}: ${s.availableCount}/${s.totalMembers} (${s.percentage}%)`).join('\n')}
  `.trim()
  
  return { subject: t.subject, html, text }
}
