import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// GET - Fetch user's notification preferences for a team
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    
    // Get auth token from header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Fetch preferences
    let query = supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
    
    if (teamId) {
      query = query.eq('team_id', teamId)
    }
    
    const { data, error } = await query.single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw error
    }
    
    // Return default settings if no preferences exist
    const preferences = data || {
      push_enabled: false,
      push_reminder_time: '18:00:00',
      email_digest_enabled: false,
      email_digest_day: 1,
      email_digest_time: '09:00:00',
      teams_enabled: false,
      teams_webhook_url: null
    }
    
    return NextResponse.json(preferences)
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

// POST - Create or update notification preferences
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teamId, ...preferences } = body
    
    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 })
    }
    
    // Get auth token from header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Upsert preferences
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        team_id: teamId,
        push_enabled: preferences.pushEnabled ?? false,
        push_reminder_time: preferences.reminderTime ?? '18:00:00',
        email_digest_enabled: preferences.emailDigestEnabled ?? false,
        email_digest_day: preferences.emailDigestDay ?? 1,
        email_digest_time: preferences.emailDigestTime ?? '09:00:00',
        teams_enabled: preferences.teamsEnabled ?? false,
        teams_webhook_url: preferences.teamsWebhookUrl ?? null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,team_id'
      })
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error saving notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to save preferences' },
      { status: 500 }
    )
  }
}
