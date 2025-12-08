/**
 * Script to delete your buddy for testing purposes
 * Run with: npx tsx scripts/delete-my-buddy.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bhgvasgfhblhvsijcuum.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoZ3Zhc2dmaGJsaHZzaWpjdXVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0NTgzNzEsImV4cCI6MjA2NzAzNDM3MX0.MXxH7BRx0QLpcUEFtgGfbVPTLztBCK__8YGciVwP-6w';

async function deleteBuddy() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Get all player buddies
  const { data: buddies, error: fetchError } = await supabase
    .from('player_buddies')
    .select('id, nickname, level, member_id');
  
  if (fetchError) {
    console.error('Error fetching buddies:', fetchError);
    return;
  }
  
  console.log('Found buddies:', buddies);
  
  if (!buddies || buddies.length === 0) {
    console.log('No buddies found to delete');
    return;
  }
  
  for (const buddy of buddies) {
    console.log(`\nDeleting buddy: ${buddy.nickname || 'Unnamed'} (Level ${buddy.level})`);
    
    // First delete trainer profile (foreign key constraint)
    const { error: profileError } = await supabase
      .from('buddy_trainer_profiles')
      .delete()
      .eq('player_buddy_id', buddy.id);
    
    if (profileError) {
      console.error('Error deleting trainer profile:', profileError);
    } else {
      console.log('  ✓ Deleted trainer profile');
    }
    
    // Delete any battles (challenger side)
    const { error: battleError1 } = await supabase
      .from('buddy_battles')
      .delete()
      .eq('challenger_buddy_id', buddy.id);
    
    if (battleError1) {
      console.error('Error deleting battles (challenger):', battleError1);
    } else {
      console.log('  ✓ Deleted battles (challenger)');
    }

    // Delete any battles (defender side)
    const { error: battleError2 } = await supabase
      .from('buddy_battles')
      .delete()
      .eq('defender_buddy_id', buddy.id);
    
    if (battleError2) {
      console.error('Error deleting battles (defender):', battleError2);
    } else {
      console.log('  ✓ Deleted battles (defender)');
    }
    
    // Delete any point transactions
    const { error: transactionError } = await supabase
      .from('point_transactions')
      .delete()
      .eq('player_buddy_id', buddy.id);
    
    if (transactionError) {
      console.error('Error deleting transactions:', transactionError);
    } else {
      console.log('  ✓ Deleted point transactions');
    }
    
    // Finally delete the buddy
    const { error: buddyError } = await supabase
      .from('player_buddies')
      .delete()
      .eq('id', buddy.id);
    
    if (buddyError) {
      console.error('Error deleting buddy:', buddyError);
    } else {
      console.log('  ✓ Deleted buddy!');
    }
  }
  
  console.log('\n✅ Done! You can now create a new buddy.');
}

deleteBuddy();
