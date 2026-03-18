import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/buddy-battle/server-auth';

export async function GET(request: NextRequest) {
  try {
    const { user, adminClient } = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the action from query parameters
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Look up member by auth_user_id (member_id is NOT the auth user id)
    const { data: member } = await adminClient
      .from('members')
      .select('id, team_id')
      .eq('auth_user_id', user.id)
      .limit(1)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (action === 'reset-hp') {
      // Reset HP for the user's buddy
      const { data: buddy, error: buddyError } = await adminClient
        .from('player_buddies')
        .select('id, max_hp, current_hp, last_healed_at')
        .eq('member_id', member.id)
        .single();

      if (buddyError || !buddy) {
        return NextResponse.json({ error: 'Buddy not found' }, { status: 404 });
      }

      // Check if HP has already been reset today
      const lastReset = buddy.last_healed_at ? new Date(buddy.last_healed_at) : null;
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
      const { data: updated, error: updateError } = await adminClient
        .from('player_buddies')
        .update({
          current_hp: buddy.max_hp,
          last_healed_at: new Date().toISOString(),
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
          last_healed_at: updated.last_healed_at,
        }
      });
    }

    if (action === 'get-countdown') {
      // Get time until next HP reset
      const { data: buddy } = await adminClient
        .from('player_buddies')
        .select('id, max_hp, current_hp, last_healed_at')
        .eq('member_id', member.id)
        .single();

      if (!buddy) {
        return NextResponse.json({ error: 'Buddy not found' }, { status: 404 });
      }

      let nextResetTime: Date;

      if (!buddy.last_healed_at) {
        // First time, reset is available now
        nextResetTime = new Date(0);
      } else {
        // Next reset is 24 hours after last reset
        const lastReset = new Date(buddy.last_healed_at);
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
          last_healed_at: buddy.last_healed_at,
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
