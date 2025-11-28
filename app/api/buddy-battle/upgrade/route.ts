// =====================================================
// BUDDY BATTLE - API ROUTE: Stat Upgrades
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { upgradeBuddyStat } from '@/lib/buddy-battle/api';
import { calculateUpgradeCost } from '@/lib/buddy-battle/game-logic';

async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
import { StatType } from '@/lib/buddy-battle/types';

// GET /api/buddy-battle/upgrade?buddyId=xxx
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const buddyId = searchParams.get('buddyId');

    if (!buddyId) {
      return NextResponse.json({ error: 'Buddy ID required' }, { status: 400 });
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership and get buddy
    const { data: buddy, error: buddyError } = await supabase
      .from('player_buddies')
      .select('*, member:members!inner(auth_user_id)')
      .eq('id', buddyId)
      .single();

    if (buddyError || !buddy) {
      return NextResponse.json({ error: 'Buddy not found' }, { status: 404 });
    }

    // Check if user owns this buddy or is on the same team
    if (buddy.member.auth_user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Calculate available upgrades
    const upgrades = [
      calculateUpgradeCost(buddy.max_hp, 'hp', buddy.level),
      calculateUpgradeCost(buddy.attack, 'attack', buddy.level),
      calculateUpgradeCost(buddy.defense, 'defense', buddy.level),
      calculateUpgradeCost(buddy.speed, 'speed', buddy.level),
      calculateUpgradeCost(buddy.special_attack, 'special_attack', buddy.level),
      calculateUpgradeCost(buddy.special_defense, 'special_defense', buddy.level),
      calculateUpgradeCost(buddy.critical_chance, 'critical_chance', buddy.level),
    ];

    return NextResponse.json({
      available_points: buddy.available_points,
      upgrades,
    });
  } catch (error) {
    console.error('Upgrade GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upgrade data' },
      { status: 500 }
    );
  }
}

// POST /api/buddy-battle/upgrade - Perform upgrade
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { buddyId, statType } = body;

    if (!buddyId || !statType) {
      return NextResponse.json(
        { error: 'Buddy ID and stat type required' },
        { status: 400 }
      );
    }

    // Validate stat type
    const validStats: StatType[] = [
      'hp', 'attack', 'defense', 'speed',
      'special_attack', 'special_defense', 'critical_chance'
    ];
    if (!validStats.includes(statType)) {
      return NextResponse.json({ error: 'Invalid stat type' }, { status: 400 });
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership and get buddy
    const { data: buddy, error: buddyError } = await supabase
      .from('player_buddies')
      .select('*, member:members!inner(auth_user_id)')
      .eq('id', buddyId)
      .single();

    if (buddyError || !buddy) {
      return NextResponse.json({ error: 'Buddy not found' }, { status: 404 });
    }

    if (buddy.member.auth_user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Calculate upgrade cost
    const currentValue = statType === 'hp' ? buddy.max_hp : buddy[statType];
    const upgradeCost = calculateUpgradeCost(currentValue, statType, buddy.level);

    if (upgradeCost.is_maxed) {
      return NextResponse.json({ error: 'Stat is already maxed' }, { status: 400 });
    }

    if (buddy.available_points < upgradeCost.point_cost) {
      return NextResponse.json({ error: 'Not enough points' }, { status: 400 });
    }

    // Perform upgrade
    const updatedBuddy = await upgradeBuddyStat(
      buddyId,
      statType,
      upgradeCost.point_cost,
      upgradeCost.next_value
    );

    return NextResponse.json({
      success: true,
      buddy: updatedBuddy,
      upgrade: {
        stat: statType,
        old_value: upgradeCost.current_value,
        new_value: upgradeCost.next_value,
        points_spent: upgradeCost.point_cost,
      },
    });
  } catch (error) {
    console.error('Upgrade POST error:', error);
    return NextResponse.json(
      { error: 'Failed to perform upgrade' },
      { status: 500 }
    );
  }
}
