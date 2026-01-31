// =====================================================
// BUDDY BATTLE - Inventory API
// GET: Fetch player's inventory
// POST: Equip/unequip/use items
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
    
    // Get player's member record for this specific team
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('team_id', teamId)
      .single();
    
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    
    // Get player's buddy
    const { data: buddy, error: buddyError } = await supabase
      .from('player_buddies')
      .select('*, buddy_type:buddy_types(*)')
      .eq('member_id', member.id)
      .single();
    
    if (buddyError || !buddy) {
      return NextResponse.json({ error: 'No buddy found', items: [], equipped: {} }, { status: 200 });
    }
    
    // Get player's inventory
    const { data: inventoryItems, error: invError } = await supabase
      .from('buddy_inventory')
      .select(`
        id,
        quantity,
        is_equipped,
        acquired_at,
        item:buddy_items (
          id,
          name,
          description,
          item_type,
          rarity,
          stat_modifier,
          effect_type,
          effect_value
        )
      `)
      .eq('buddy_id', buddy.id);
    
    if (invError) {
      console.error('Error fetching inventory:', invError);
      return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
    }
    
    // Transform inventory data
    const items = (inventoryItems || []).map(inv => {
      // Handle both array and object formats from Supabase
      const itemData = Array.isArray(inv.item) ? inv.item[0] : inv.item;
      return {
        id: inv.id,
        item_id: itemData?.id,
        name: itemData?.name || 'Unknown Item',
        description: itemData?.description || '',
        type: itemData?.item_type || 'consumable',
        rarity: itemData?.rarity || 'common',
        stat_modifier: itemData?.stat_modifier,
        effect_type: itemData?.effect_type,
        effect_value: itemData?.effect_value,
        quantity: inv.quantity,
        is_equipped: inv.is_equipped,
        acquired_at: inv.acquired_at,
      };
    });
    
    // Find equipped items
    const equippedHeld = items.find(i => i.is_equipped && i.type === 'held');
    const equippedCosmetic = items.find(i => i.is_equipped && i.type === 'cosmetic');
    
    return NextResponse.json({
      items,
      equipped: {
        held_item: equippedHeld || null,
        cosmetic: equippedCosmetic || null,
      },
      buddy: {
        id: buddy.id,
        name: buddy.nickname,
        element: buddy.buddy_type?.element || 'fire',
        level: buddy.level,
      },
    });
    
  } catch (error) {
    console.error('Inventory GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    
    const body = await request.json();
    const { action, itemId } = body;
    
    // Get player's member record for this specific team
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('team_id', teamId)
      .single();
    
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    
    // Get player's buddy
    const { data: buddy, error: buddyError } = await supabase
      .from('player_buddies')
      .select('*')
      .eq('member_id', member.id)
      .single();
    
    if (buddyError || !buddy) {
      return NextResponse.json({ error: 'No buddy found' }, { status: 404 });
    }
    
    // Get the inventory item
    const { data: invItem, error: itemError } = await supabase
      .from('buddy_inventory')
      .select(`
        *,
        item:buddy_items (*)
      `)
      .eq('id', itemId)
      .eq('buddy_id', buddy.id)
      .single();
    
    if (itemError || !invItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    
    switch (action) {
      case 'equip': {
        const itemType = invItem.item?.item_type;
        
        // Only held and cosmetic items can be equipped
        if (itemType !== 'held' && itemType !== 'cosmetic') {
          return NextResponse.json({ 
            success: false, 
            message: 'This item cannot be equipped' 
          });
        }
        
        if (invItem.is_equipped) {
          // Unequip
          await supabase
            .from('buddy_inventory')
            .update({ is_equipped: false })
            .eq('id', itemId);
          
          return NextResponse.json({
            success: true,
            message: `Unequipped ${invItem.item?.name}!`,
          });
        } else {
          // Unequip any other item of same type first
          const { data: otherItems } = await supabase
            .from('buddy_inventory')
            .select('id, item:buddy_items(item_type)')
            .eq('buddy_id', buddy.id)
            .eq('is_equipped', true);
          
          for (const other of (otherItems || [])) {
            const otherItem = Array.isArray(other.item) ? other.item[0] : other.item;
            if (otherItem?.item_type === itemType) {
              await supabase
                .from('buddy_inventory')
                .update({ is_equipped: false })
                .eq('id', other.id);
            }
          }
          
          // Equip new item
          await supabase
            .from('buddy_inventory')
            .update({ is_equipped: true })
            .eq('id', itemId);
          
          return NextResponse.json({
            success: true,
            message: `Equipped ${invItem.item?.name}!`,
          });
        }
      }
      
      case 'use': {
        if (invItem.item?.item_type !== 'consumable') {
          return NextResponse.json({ 
            success: false, 
            message: 'This item cannot be used' 
          });
        }
        
        // Apply item effect
        const effectType = invItem.item?.effect_type;
        const effectValue = invItem.item?.effect_value || 0;
        let message = '';
        
        switch (effectType) {
          case 'heal':
            // Heal buddy HP
            const newHp = Math.min(buddy.max_hp, buddy.current_hp + effectValue);
            await supabase
              .from('player_buddies')
              .update({ current_hp: newHp })
              .eq('id', buddy.id);
            message = `Healed ${effectValue} HP!`;
            break;
          case 'xp_boost':
            // Grant XP
            await supabase
              .from('player_buddies')
              .update({ 
                total_xp: (buddy.total_xp || 0) + effectValue 
              })
              .eq('id', buddy.id);
            message = `Gained ${effectValue} XP!`;
            break;
          case 'stat_points':
            // Grant stat points
            await supabase
              .from('player_buddies')
              .update({ 
                stat_points: (buddy.stat_points || 0) + effectValue 
              })
              .eq('id', buddy.id);
            message = `Gained ${effectValue} stat points!`;
            break;
          default:
            message = `Used ${invItem.item?.name}!`;
        }
        
        // Reduce quantity or remove item
        if (invItem.quantity > 1) {
          await supabase
            .from('buddy_inventory')
            .update({ quantity: invItem.quantity - 1 })
            .eq('id', itemId);
        } else {
          await supabase
            .from('buddy_inventory')
            .delete()
            .eq('id', itemId);
        }
        
        return NextResponse.json({
          success: true,
          message,
        });
      }
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Inventory POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
