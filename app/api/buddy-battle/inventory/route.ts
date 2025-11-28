// =====================================================
// BUDDY BATTLE - Inventory API
// GET: Fetch player's inventory
// POST: Equip/unequip/use items
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        cookie: cookieStore.toString(),
      },
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get player's buddy
    const { data: buddy, error: buddyError } = await supabase
      .from('player_buddies')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (buddyError || !buddy) {
      return NextResponse.json({ error: 'No buddy found' }, { status: 404 });
    }
    
    // Get player's inventory
    const { data: inventoryItems, error: invError } = await supabase
      .from('buddy_player_inventory')
      .select(`
        id,
        quantity,
        is_equipped,
        acquired_at,
        buddy_items (
          id,
          name,
          description,
          type,
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
      // buddy_items can be an array or object depending on join
      const itemData = Array.isArray(inv.buddy_items) 
        ? inv.buddy_items[0] 
        : inv.buddy_items;
      return {
        id: inv.id,
        item_id: itemData?.id,
        name: itemData?.name || 'Unknown Item',
        description: itemData?.description || '',
        type: itemData?.type || 'consumable',
        rarity: itemData?.rarity || 'common',
        stat_modifier: itemData?.stat_modifier,
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
        name: buddy.buddy_name,
        element: buddy.element,
        level: buddy.trainer_level,
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
    const supabase = await getSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { action, itemId } = body;
    
    // Get player's buddy
    const { data: buddy, error: buddyError } = await supabase
      .from('player_buddies')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (buddyError || !buddy) {
      return NextResponse.json({ error: 'No buddy found' }, { status: 404 });
    }
    
    // Get the inventory item
    const { data: invItem, error: itemError } = await supabase
      .from('buddy_player_inventory')
      .select(`
        *,
        buddy_items (*)
      `)
      .eq('id', itemId)
      .eq('buddy_id', buddy.id)
      .single();
    
    if (itemError || !invItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    
    switch (action) {
      case 'equip': {
        const itemType = invItem.buddy_items.type;
        
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
            .from('buddy_player_inventory')
            .update({ is_equipped: false })
            .eq('id', itemId);
        } else {
          // Get all items of same type from player's inventory to unequip first
          const { data: sameTypeItems } = await supabase
            .from('buddy_items')
            .select('id')
            .eq('type', itemType);
          
          const sameTypeIds = (sameTypeItems || []).map(i => i.id);
          
          if (sameTypeIds.length > 0) {
            // Unequip any other item of same type first
            await supabase
              .from('buddy_player_inventory')
              .update({ is_equipped: false })
              .eq('buddy_id', buddy.id)
              .eq('is_equipped', true)
              .in('item_id', sameTypeIds);
          }
          
          // Equip new item
          await supabase
            .from('buddy_player_inventory')
            .update({ is_equipped: true })
            .eq('id', itemId);
        }
        
        break;
      }
      
      case 'use': {
        if (invItem.buddy_items.type !== 'consumable') {
          return NextResponse.json({ 
            success: false, 
            message: 'This item cannot be used' 
          });
        }
        
        // Apply item effect
        const effectType = invItem.buddy_items.effect_type;
        const effectValue = invItem.buddy_items.effect_value || 0;
        let message = '';
        
        switch (effectType) {
          case 'heal':
            // Heal buddy (would apply in battle)
            message = `Healed ${effectValue} HP!`;
            break;
          case 'xp_boost':
            // Grant XP
            await supabase
              .from('player_buddies')
              .update({ 
                trainer_xp: buddy.trainer_xp + effectValue 
              })
              .eq('id', buddy.id);
            message = `Gained ${effectValue} XP!`;
            break;
          case 'anxiety_reduce':
            // Reduce anxiety
            const newAnxiety = Math.max(0, (buddy.anxiety_level || 0) - effectValue);
            await supabase
              .from('player_buddies')
              .update({ anxiety_level: newAnxiety })
              .eq('id', buddy.id);
            message = `Anxiety reduced by ${effectValue}!`;
            break;
          default:
            message = `Used ${invItem.buddy_items.name}!`;
        }
        
        // Reduce quantity or remove item
        if (invItem.quantity > 1) {
          await supabase
            .from('buddy_player_inventory')
            .update({ quantity: invItem.quantity - 1 })
            .eq('id', itemId);
        } else {
          await supabase
            .from('buddy_player_inventory')
            .delete()
            .eq('id', itemId);
        }
        
        // Fetch updated inventory
        const { data: updatedInv } = await supabase
          .from('buddy_player_inventory')
          .select(`
            id,
            quantity,
            is_equipped,
            buddy_items (*)
          `)
          .eq('buddy_id', buddy.id);
        
        return NextResponse.json({
          success: true,
          message,
          inventory: {
            items: updatedInv || [],
            equipped: {
              held_item: updatedInv?.find((i: any) => i.is_equipped && i.buddy_items?.type === 'held') || null,
              cosmetic: updatedInv?.find((i: any) => i.is_equipped && i.buddy_items?.type === 'cosmetic') || null,
            },
          },
        });
      }
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    // Fetch updated inventory
    const { data: updatedInv } = await supabase
      .from('buddy_player_inventory')
      .select(`
        id,
        quantity,
        is_equipped,
        buddy_items (*)
      `)
      .eq('buddy_id', buddy.id);
    
    const items = (updatedInv || []).map((inv: any) => ({
      id: inv.id,
      item_id: inv.buddy_items?.id,
      name: inv.buddy_items?.name || 'Unknown',
      description: inv.buddy_items?.description || '',
      type: inv.buddy_items?.type || 'consumable',
      rarity: inv.buddy_items?.rarity || 'common',
      stat_modifier: inv.buddy_items?.stat_modifier,
      quantity: inv.quantity,
      is_equipped: inv.is_equipped,
    }));
    
    return NextResponse.json({
      success: true,
      inventory: {
        items,
        equipped: {
          held_item: items.find((i: any) => i.is_equipped && i.type === 'held') || null,
          cosmetic: items.find((i: any) => i.is_equipped && i.type === 'cosmetic') || null,
        },
      },
    });
    
  } catch (error) {
    console.error('Inventory POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
