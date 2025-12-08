// =====================================================
// BUDDY BATTLE - API ROUTE: Shop
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

// GET /api/buddy-battle/shop - Get shop data for current user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID required' }, { status: 400 });
    }
    
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find user's member for this specific team
    const { data: member } = await supabase
      .from('members')
      .select('id, team_id')
      .eq('auth_user_id', user.id)
      .eq('team_id', teamId)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const { data: buddy } = await supabase
      .from('player_buddies')
      .select('id, stat_points')
      .eq('member_id', member.id)
      .single();

    // Get shop items for this team
    const { data: shopItems } = await supabase
      .from('buddy_shop_items')
      .select(`
        id,
        price,
        quantity_available,
        is_featured,
        is_limited,
        item:buddy_items(*)
      `)
      .eq('team_id', member.team_id)
      .eq('is_active', true);

    // Flatten shop items for display
    const flattenedItems = (shopItems || []).map(si => {
      // Handle both array and object formats from Supabase
      const itemData = Array.isArray(si.item) ? si.item[0] : si.item;
      return {
        id: si.id,
        item_id: itemData?.id,
        price: si.price,
        quantity_available: si.quantity_available,
        is_featured: si.is_featured,
        is_limited: si.is_limited,
        name: itemData?.name || 'Unknown Item',
        description: itemData?.description || '',
        item_type: itemData?.item_type || 'consumable',
        rarity: itemData?.rarity || 'common',
        effect_type: itemData?.effect_type,
        effect_value: itemData?.effect_value,
      };
    });

    // Get mystery boxes
    const { data: mysteryBoxes } = await supabase
      .from('buddy_mystery_boxes')
      .select('*')
      .eq('is_active', true);

    // Get player inventory if buddy exists
    let inventory: any[] = [];
    if (buddy) {
      const { data: inv } = await supabase
        .from('buddy_inventory')
        .select(`
          id,
          quantity,
          item:buddy_items(*)
        `)
        .eq('buddy_id', buddy.id);
      inventory = inv || [];
    }

    // Calculate refresh countdown (weekly reset on Monday)
    const now = new Date();
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
    nextMonday.setHours(0, 0, 0, 0);
    const daysUntilRefresh = Math.ceil((nextMonday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const refreshCountdown = daysUntilRefresh === 1 ? '1 day' : `${daysUntilRefresh} days`;

    return NextResponse.json({
      weekly_items: flattenedItems.filter(i => !i.is_featured && !i.is_limited),
      featured_items: flattenedItems.filter(i => i.is_featured),
      limited_items: flattenedItems.filter(i => i.is_limited),
      mystery_boxes: (mysteryBoxes || []).map(box => ({
        id: box.id,
        name: box.name,
        description: box.description || 'Open for a surprise!',
        cost: box.cost || 50,
        rarity: 'mystery',
      })),
      inventory,
      player_points: buddy?.stat_points || 0,
      refresh_countdown: refreshCountdown,
    });
  } catch (error) {
    console.error('Shop GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shop data' },
      { status: 500 }
    );
  }
}

// POST /api/buddy-battle/shop - Purchase item or open mystery box
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID required' }, { status: 400 });
    }
    
    const supabase = await createClient();
    const body = await request.json();
    const { action, itemId, boxId } = body;

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find user's member for this specific team
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('team_id', teamId)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const { data: buddy, error: buddyError } = await supabase
      .from('player_buddies')
      .select('id, stat_points')
      .eq('member_id', member.id)
      .single();

    if (buddyError || !buddy) {
      return NextResponse.json({ error: 'No buddy found' }, { status: 404 });
    }

    if (action === 'purchase' && itemId) {
      // Get shop item
      const { data: shopItem } = await supabase
        .from('buddy_shop_items')
        .select('*, item:buddy_items(*)')
        .eq('id', itemId)
        .single();

      if (!shopItem) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }

      if (buddy.stat_points < shopItem.price) {
        return NextResponse.json({ error: 'Not enough points' }, { status: 400 });
      }

      // Deduct points
      const newPoints = buddy.stat_points - shopItem.price;
      await supabase
        .from('player_buddies')
        .update({ stat_points: newPoints })
        .eq('id', buddy.id);

      // Add to inventory (or increase quantity)
      const { data: existingItem } = await supabase
        .from('buddy_inventory')
        .select('id, quantity')
        .eq('buddy_id', buddy.id)
        .eq('item_id', shopItem.item_id)
        .single();

      if (existingItem) {
        await supabase
          .from('buddy_inventory')
          .update({ quantity: existingItem.quantity + 1 })
          .eq('id', existingItem.id);
      } else {
        await supabase
          .from('buddy_inventory')
          .insert({
            buddy_id: buddy.id,
            item_id: shopItem.item_id,
            quantity: 1,
          });
      }

      return NextResponse.json({
        success: true,
        message: `Purchased ${shopItem.item?.name}!`,
        remaining_points: newPoints,
      });
    }

    if (action === 'mystery_box' && boxId) {
      // Get mystery box
      const { data: box } = await supabase
        .from('buddy_mystery_boxes')
        .select('*')
        .eq('id', boxId)
        .single();

      if (!box) {
        return NextResponse.json({ error: 'Mystery box not found' }, { status: 404 });
      }

      const boxCost = box.cost || 50;
      if (buddy.stat_points < boxCost) {
        return NextResponse.json({ error: 'Not enough points' }, { status: 400 });
      }

      // Deduct points
      const newPoints = buddy.stat_points - boxCost;
      await supabase
        .from('player_buddies')
        .update({ stat_points: newPoints })
        .eq('id', buddy.id);

      // Get random item from pool (simplified - just get a random item)
      const { data: items } = await supabase
        .from('buddy_items')
        .select('*')
        .limit(10);

      const randomItem = items?.[Math.floor(Math.random() * (items?.length || 1))];

      if (randomItem) {
        // Add to inventory
        const { data: existingItem } = await supabase
          .from('buddy_inventory')
          .select('id, quantity')
          .eq('buddy_id', buddy.id)
          .eq('item_id', randomItem.id)
          .single();

        if (existingItem) {
          await supabase
            .from('buddy_inventory')
            .update({ quantity: existingItem.quantity + 1 })
            .eq('id', existingItem.id);
        } else {
          await supabase
            .from('buddy_inventory')
            .insert({
              buddy_id: buddy.id,
              item_id: randomItem.id,
              quantity: 1,
            });
        }
      }

      return NextResponse.json({
        success: true,
        result: {
          item: randomItem,
          is_duplicate: false,
          refund_points: 0,
        },
        remaining_points: newPoints,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Shop POST error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
