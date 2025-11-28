// =====================================================
// BUDDY BATTLE - API ROUTE: Shop
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getShopItems, purchaseItem, getPlayerInventory } from '@/lib/buddy-battle/api';

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

// GET /api/buddy-battle/shop?teamId=xxx&buddyId=xxx
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const buddyId = searchParams.get('buddyId');

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID required' }, { status: 400 });
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get shop items
    const shopItems = await getShopItems(teamId);

    // Get player inventory if buddyId provided
    let inventory: Awaited<ReturnType<typeof getPlayerInventory>> = [];
    let playerPoints = 0;
    if (buddyId) {
      inventory = await getPlayerInventory(buddyId);
      
      const { data: buddy } = await supabase
        .from('player_buddies')
        .select('available_points')
        .eq('id', buddyId)
        .single();
      
      playerPoints = buddy?.available_points || 0;
    }

    // Get mystery boxes
    const { data: mysteryBoxes } = await supabase
      .from('buddy_mystery_boxes')
      .select('*')
      .eq('is_active', true);

    // Categorize shop items
    const weeklyItems = shopItems.filter(item => !item.is_featured && !item.is_limited);
    const featuredItems = shopItems.filter(item => item.is_featured);
    const limitedItems = shopItems.filter(item => item.is_limited);

    return NextResponse.json({
      weekly_items: weeklyItems,
      featured_items: featuredItems,
      limited_items: limitedItems,
      mystery_boxes: mysteryBoxes || [],
      inventory,
      player_points: playerPoints,
    });
  } catch (error) {
    console.error('Shop GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shop data' },
      { status: 500 }
    );
  }
}

// POST /api/buddy-battle/shop - Purchase item
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { buddyId, shopItemId } = body;

    if (!buddyId || !shopItemId) {
      return NextResponse.json(
        { error: 'Buddy ID and Shop Item ID required' },
        { status: 400 }
      );
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: buddy, error: buddyError } = await supabase
      .from('player_buddies')
      .select('id, member:members!inner(auth_user_id)')
      .eq('id', buddyId)
      .single();

    if (buddyError || !buddy) {
      return NextResponse.json({ error: 'Buddy not found' }, { status: 404 });
    }

    const memberData = Array.isArray(buddy.member) ? buddy.member[0] : buddy.member;
    if (memberData.auth_user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Perform purchase
    const inventoryItem = await purchaseItem(buddyId, shopItemId);

    return NextResponse.json({
      success: true,
      item: inventoryItem,
    });
  } catch (error) {
    console.error('Shop POST error:', error);
    const message = error instanceof Error ? error.message : 'Failed to purchase item';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
