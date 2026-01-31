import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create admin client that bypasses RLS
function createAdminClient() {
  return createSupabaseClient(supabaseUrl!, supabaseServiceKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    supabaseUrl!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: any }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the action from query parameters
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'reset-hp') {
      // Reset HP for the user's buddy
      const { data: buddy, error: buddyError } = await supabase
        .from('player_buddies')
        .select('id, max_hp, current_hp, last_hp_reset_date')
        .eq('member_id', user.id)
        .single();

      if (buddyError || !buddy) {
        return NextResponse.json({ error: 'Buddy not found' }, { status: 404 });
      }

      // Check if HP has already been reset today
      const lastReset = buddy.last_hp_reset_date ? new Date(buddy.last_hp_reset_date) : null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (lastReset) {
        const lastResetDate = new Date(lastReset);
        lastResetDate.setHours(0, 0, 0, 0);

        if (lastResetDate.getTime() === today.getTime()) {
          return NextResponse.json({
            error: 'HP already reset today',
            buddy: { id: buddy.id, current_hp: buddy.current_hp, max_hp: buddy.max_hp }
          }, { status: 400 });
        }
      }

      // Reset the HP
      const { data: updated, error: updateError } = await supabase
        .from('player_buddies')
        .update({
          current_hp: buddy.max_hp,
          last_hp_reset_date: new Date().toISOString(),
        })
        .eq('id', buddy.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to reset HP: ${updateError.message}`);
      }

      return NextResponse.json({
        success: true,
        buddy: {
          id: updated.id,
          current_hp: updated.current_hp,
          max_hp: updated.max_hp,
          last_hp_reset_date: updated.last_hp_reset_date,
        }
      });
    }

    if (action === 'get-countdown') {
      // Get time until next HP reset
      const { data: buddy } = await supabase
        .from('player_buddies')
        .select('id, max_hp, current_hp, last_hp_reset_date')
        .eq('member_id', user.id)
        .single();

      if (!buddy) {
        return NextResponse.json({ error: 'Buddy not found' }, { status: 404 });
      }

      let nextResetTime: Date;

      if (!buddy.last_hp_reset_date) {
        // First time, reset is available now
        nextResetTime = new Date(0);
      } else {
        // Next reset is 24 hours after last reset
        const lastReset = new Date(buddy.last_hp_reset_date);
        nextResetTime = new Date(lastReset.getTime() + 24 * 60 * 60 * 1000);

        // If already passed, next reset is now
        if (nextResetTime < new Date()) {
          nextResetTime = new Date(0);
        }
      }

      const now = new Date();
      const diff = nextResetTime.getTime() - now.getTime();
      
      let hours = 0, minutes = 0, seconds = 0;
      
      if (diff > 0) {
        hours = Math.floor(diff / (1000 * 60 * 60));
        minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        seconds = Math.floor((diff % (1000 * 60)) / 1000);
      }

      const canResetNow = diff <= 0;

      return NextResponse.json({
        buddy: {
          id: buddy.id,
          current_hp: buddy.current_hp,
          max_hp: buddy.max_hp,
          last_hp_reset_date: buddy.last_hp_reset_date,
        },
        countdown: {
          next_reset_time: nextResetTime.toISOString(),
          hours_remaining: hours,
          minutes_remaining: minutes,
          seconds_remaining: seconds,
          can_reset_now: canResetNow,
        }
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[Buddy HP Reset] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
