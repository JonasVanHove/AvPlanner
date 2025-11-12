import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testBadgeSystem() {
  console.log('🏅 Testing Badge System...\n')

  // 1. Check if user_badges table exists
  console.log('1️⃣ Checking if user_badges table exists...')
  const { data: badges, error: badgesError } = await supabase
    .from('user_badges')
    .select('*')
    .limit(1)
  
  if (badgesError) {
    console.error('❌ user_badges table error:', badgesError.message)
    console.log('   → Run gamification-schema.sql in Supabase SQL Editor first!\n')
  } else {
    console.log('✅ user_badges table exists\n')
  }

  // 2. Check if functions exist
  console.log('2️⃣ Checking if database functions exist...')
  const functions = [
    'check_and_award_badges',
    'check_timely_completion', 
    'check_helped_others',
    'check_activity_milestones',
    'get_user_badges'
  ]

  for (const funcName of functions) {
    const { data, error } = await supabase.rpc('pg_get_functiondef' as any, {
      funcid: `public.${funcName}`
    })
    
    if (error) {
      console.log(`❌ ${funcName} - NOT FOUND`)
    } else {
      console.log(`✅ ${funcName}`)
    }
  }
  console.log()

  // 3. Get current user info
  console.log('3️⃣ Getting your user info...')
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
  
  if (usersError || !users || users.length === 0) {
    console.error('❌ Cannot retrieve users:', usersError?.message)
    return
  }

  const user = users[0] // Use first user for testing
  console.log(`👤 Testing with user: ${user.email}`)
  console.log(`   User ID: ${user.id}\n`)

  // 4. Get member info
  console.log('4️⃣ Getting member info...')
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('id, team_id, first_name, last_name, email')
    .eq('auth_user_id', user.id)
  
  if (membersError || !members || members.length === 0) {
    console.error('❌ No members found for this user')
    console.log('   Make sure your user is part of a team\n')
    return
  }

  const member = members[0]
  console.log(`✅ Member: ${member.first_name} ${member.last_name}`)
  console.log(`   Member ID: ${member.id}`)
  console.log(`   Team ID: ${member.team_id}\n`)

  // 5. Count availabilities
  console.log('5️⃣ Counting your availabilities...')
  const { count: totalCount, error: countError } = await supabase
    .from('availability')
    .select('*', { count: 'exact', head: true })
    .eq('member_id', member.id)
  
  if (countError) {
    console.error('❌ Error counting availabilities:', countError.message)
  } else {
    console.log(`✅ Total availability entries: ${totalCount || 0}`)
  }

  // Count unique dates
  const { data: uniqueDates, error: uniqueError } = await supabase
    .from('availability')
    .select('date')
    .eq('member_id', member.id)
  
  if (!uniqueError && uniqueDates) {
    const uniqueCount = new Set(uniqueDates.map(d => d.date)).size
    console.log(`✅ Unique dates filled: ${uniqueCount}`)
    
    // Show which activity badges they should have
    console.log('\n   Activity Badges You Should Have:')
    if (uniqueCount >= 10) console.log('   🎯 activity_10')
    if (uniqueCount >= 50) console.log('   ⚡ activity_50')
    if (uniqueCount >= 100) console.log('   ✨ activity_100')
    if (uniqueCount >= 500) console.log('   👑 activity_500')
    if (uniqueCount >= 1000) console.log('   🚀 activity_1000')
  }
  console.log()

  // 6. Check current badges
  console.log('6️⃣ Checking your current badges...')
  const { data: currentBadges, error: currentBadgesError } = await supabase
    .from('user_badges')
    .select('*')
    .eq('user_id', user.id)
  
  if (currentBadgesError) {
    console.error('❌ Error fetching badges:', currentBadgesError.message)
  } else {
    console.log(`✅ Current badges: ${currentBadges?.length || 0}`)
    if (currentBadges && currentBadges.length > 0) {
      currentBadges.forEach(badge => {
        console.log(`   🏅 ${badge.badge_type} (${badge.week_year})`)
      })
    } else {
      console.log('   ℹ️  No badges yet - they need to be awarded first')
    }
  }
  console.log()

  // 7. Try to award badges manually
  console.log('7️⃣ Trying to award badges manually...')
  try {
    const { data: result, error: awardError } = await supabase
      .rpc('check_and_award_badges', {
        p_member_id: member.id,
        p_team_id: member.team_id
      })
    
    if (awardError) {
      console.error('❌ Error awarding badges:', awardError.message)
      console.log('   → This usually means the function doesn\'t exist yet')
      console.log('   → Run gamification-schema.sql in Supabase!\n')
    } else {
      console.log('✅ Badge check completed!')
      console.log('Result:', JSON.stringify(result, null, 2))
      
      if (result && result.new_badges && result.new_badges.length > 0) {
        console.log(`\n🎉 ${result.new_badges.length} new badges awarded!`)
        result.new_badges.forEach((badge: any) => {
          console.log(`   🏅 ${badge.type}`)
        })
      } else {
        console.log('\n   ℹ️  No new badges awarded (may already have them or don\'t meet criteria yet)')
      }
    }
  } catch (err: any) {
    console.error('❌ Exception:', err.message)
  }
  console.log()

  // 8. Final badge count
  console.log('8️⃣ Final badge count...')
  const { data: finalBadges, error: finalError } = await supabase
    .from('user_badges')
    .select('*')
    .eq('user_id', user.id)
  
  if (!finalError && finalBadges) {
    console.log(`✅ Total badges now: ${finalBadges.length}`)
    if (finalBadges.length > 0) {
      console.log('\n   Your Badges:')
      finalBadges.forEach(badge => {
        console.log(`   🏅 ${badge.badge_type} - earned ${new Date(badge.earned_at).toLocaleDateString()}`)
      })
    }
  }
}

testBadgeSystem().then(() => {
  console.log('\n✅ Badge system test completed!')
  process.exit(0)
}).catch((err) => {
  console.error('\n❌ Test failed:', err)
  process.exit(1)
})
