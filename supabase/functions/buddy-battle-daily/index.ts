// =====================================================
// BUDDY BATTLE - Daily Maintenance Edge Function
// Deploy to Supabase Edge Functions
// Run: supabase functions deploy buddy-battle-daily
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MaintenanceResult {
  success: boolean
  tasks: {
    daily_quests: string
    weekly_quests: string
    shop_rotation: string
    streaks: string
    cleanup: string
    quarterly_boss?: string
  }
  completed_at: string
  error?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization')
    const cronSecret = Deno.env.get('CRON_SECRET')
    
    // Allow both Bearer token and cron secret
    if (!authHeader && !cronSecret) {
      throw new Error('Missing authorization')
    }
    
    if (authHeader !== `Bearer ${cronSecret}` && authHeader !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
      throw new Error('Invalid authorization')
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const result: MaintenanceResult = {
      success: true,
      tasks: {
        daily_quests: 'pending',
        weekly_quests: 'pending',
        shop_rotation: 'pending',
        streaks: 'pending',
        cleanup: 'pending',
      },
      completed_at: new Date().toISOString(),
    }

    // 1. Refresh daily quests
    try {
      const { error } = await supabase.rpc('refresh_daily_quests')
      result.tasks.daily_quests = error ? `failed: ${error.message}` : 'completed'
    } catch (e) {
      result.tasks.daily_quests = `error: ${e.message}`
    }

    // 2. Check weekly quests (function handles day check internally)
    try {
      const { error } = await supabase.rpc('refresh_weekly_quests')
      result.tasks.weekly_quests = error ? `failed: ${error.message}` : 'completed'
    } catch (e) {
      result.tasks.weekly_quests = `error: ${e.message}`
    }

    // 3. Rotate shop items
    try {
      const { error } = await supabase.rpc('rotate_shop_items')
      result.tasks.shop_rotation = error ? `failed: ${error.message}` : 'completed'
    } catch (e) {
      result.tasks.shop_rotation = `error: ${e.message}`
    }

    // 4. Maintain streaks
    try {
      const { error } = await supabase.rpc('maintain_streaks')
      result.tasks.streaks = error ? `failed: ${error.message}` : 'completed'
    } catch (e) {
      result.tasks.streaks = `error: ${e.message}`
    }

    // 5. Cleanup old data
    try {
      const { error } = await supabase.rpc('cleanup_old_data')
      result.tasks.cleanup = error ? `failed: ${error.message}` : 'completed'
    } catch (e) {
      result.tasks.cleanup = `error: ${e.message}`
    }

    // 6. Check for quarterly boss spawn (first day of quarter)
    const today = new Date()
    const isFirstOfQuarter = today.getDate() === 1 && [0, 3, 6, 9].includes(today.getMonth())
    
    if (isFirstOfQuarter) {
      try {
        const { error } = await supabase.rpc('spawn_quarterly_boss')
        result.tasks.quarterly_boss = error ? `failed: ${error.message}` : 'spawned'
      } catch (e) {
        result.tasks.quarterly_boss = `error: ${e.message}`
      }
    }

    // Log to analytics
    await supabase.from('buddy_battle_analytics').insert({
      event_type: 'daily_maintenance',
      event_data: result,
      created_at: new Date().toISOString(),
    }).catch(() => {}) // Ignore if table doesn't exist

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const errorResult: MaintenanceResult = {
      success: false,
      tasks: {
        daily_quests: 'not_run',
        weekly_quests: 'not_run',
        shop_rotation: 'not_run',
        streaks: 'not_run',
        cleanup: 'not_run',
      },
      completed_at: new Date().toISOString(),
      error: error.message,
    }

    return new Response(JSON.stringify(errorResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
