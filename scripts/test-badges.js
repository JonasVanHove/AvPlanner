// @ts-check
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read .env.local file
const envPath = path.join(__dirname, '..', '.env.local')
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8')
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseServiceKey = value
    }
  })
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  console.error('Either set them in .env.local or as environment variables')
  console.error(`\nChecked: ${envPath}`)
  console.error(`Found URL: ${supabaseUrl ? 'Yes' : 'No'}`)
  console.error(`Found KEY: ${supabaseServiceKey ? 'Yes' : 'No'}`)
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

  // 2. Get current user info
  console.log('2️⃣ Getting your user info...')
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
  
  if (usersError || !users || users.length === 0) {
    console.error('❌ Cannot retrieve users:', usersError?.message)
    return
  }

  console.log(`✅ Found ${users.length} user(s) in database\n`)

  // Test each user
  for (const user of users) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`👤 Testing user: ${user.email}`)
    console.log(`   User ID: ${user.id}`)

    // Get member info
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, team_id, first_name, last_name, email')
      .eq('auth_user_id', user.id)
    
    if (membersError || !members || members.length === 0) {
      console.log('   ⚠️  No members found for this user (not part of any team)')
      continue
    }

    for (const member of members) {
      console.log(`\n   📋 Member: ${member.first_name} ${member.last_name}`)
      console.log(`      Member ID: ${member.id}`)
      console.log(`      Team ID: ${member.team_id}`)

      // Count availabilities
      const { data: availabilities, error: countError } = await supabase
        .from('availability')
        .select('date')
        .eq('member_id', member.id)
      
      if (countError) {
        console.error('      ❌ Error counting availabilities:', countError.message)
      } else {
        const totalCount = availabilities?.length || 0
        const uniqueCount = new Set(availabilities?.map(d => d.date) || []).size
        
        console.log(`      ✅ Total availability entries: ${totalCount}`)
        console.log(`      ✅ Unique dates filled: ${uniqueCount}`)
        
        if (uniqueCount >= 10) {
          console.log('\n      🎯 Activity Badges This User Should Have:')
          if (uniqueCount >= 10) console.log('         • activity_10 (10+ different days)')
          if (uniqueCount >= 50) console.log('         • activity_50 (50+ different days)')
          if (uniqueCount >= 100) console.log('         • activity_100 (100+ different days)')
          if (uniqueCount >= 500) console.log('         • activity_500 (500+ different days)')
          if (uniqueCount >= 1000) console.log('         • activity_1000 (1000+ different days)')
        } else {
          console.log(`\n      ℹ️  Not enough unique dates yet (need 10, have ${uniqueCount})`)
        }
      }

      // Check current badges
      const { data: currentBadges, error: currentBadgesError } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user.id)
        .eq('member_id', member.id)
      
      if (currentBadgesError) {
        console.error('      ❌ Error fetching badges:', currentBadgesError.message)
      } else {
        console.log(`\n      📊 Current badges: ${currentBadges?.length || 0}`)
        if (currentBadges && currentBadges.length > 0) {
          currentBadges.forEach(badge => {
            console.log(`         🏅 ${badge.badge_type} (${badge.week_year})`)
          })
        }
      }

      // Try to award badges
      console.log('\n      🎲 Attempting to award badges...')
      try {
        const { data: result, error: awardError } = await supabase
          .rpc('check_and_award_badges', {
            p_member_id: member.id,
            p_team_id: member.team_id
          })
        
        if (awardError) {
          console.error('      ❌ Error:', awardError.message)
          if (awardError.message.includes('function') && awardError.message.includes('does not exist')) {
            console.log('      ⚠️  Database function not found!')
            console.log('      → Run gamification-schema.sql in Supabase SQL Editor')
          }
        } else {
          console.log('      ✅ Badge check completed')
          
          if (result && result.new_badges && result.new_badges.length > 0) {
            console.log(`      🎉 ${result.new_badges.length} NEW badge(s) awarded!`)
            result.new_badges.forEach(badge => {
              console.log(`         🏅 ${badge.type}`)
            })
          } else {
            console.log('      ℹ️  No new badges (already have them or criteria not met)')
          }
        }
      } catch (err) {
        console.error('      ❌ Exception:', err.message)
      }

      // Final badge count
      const { data: finalBadges } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user.id)
        .eq('member_id', member.id)
      
      if (finalBadges) {
        console.log(`\n      📈 Final badge count: ${finalBadges.length}`)
      }
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('\n✅ Badge system diagnostic completed!\n')
}

testBadgeSystem()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Test failed:', err)
    process.exit(1)
  })
