// Script to award badges for all existing members
// Run this AFTER executing gamification-schema.sql in Supabase
// This will check and award badges for all team members based on their existing availability data

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read .env.local file
const envPath = path.join(__dirname, '..', '.env.local')
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8')
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value
      if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseAnonKey = value
    }
  })
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables!')
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function awardBadgesForAllMembers() {
  console.log('🏅 Awarding Badges for All Members...\n')
  console.log('📋 Step 1: Fetching all members...')

  // Get all members
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('id, team_id, first_name, last_name, email, auth_user_id')
    .neq('status', 'removed') // Only active members

  if (membersError) {
    console.error('❌ Error fetching members:', membersError.message)
    process.exit(1)
  }

  if (!members || members.length === 0) {
    console.log('⚠️  No members found')
    process.exit(0)
  }

  console.log(`✅ Found ${members.length} member(s)\n`)

  let totalNewBadges = 0
  let successCount = 0
  let failCount = 0

  for (let i = 0; i < members.length; i++) {
    const member = members[i]
    console.log(`\n${'='.repeat(60)}`)
    console.log(`[${i + 1}/${members.length}] Processing: ${member.first_name} ${member.last_name || ''}`)
    console.log(`   Email: ${member.email}`)
    console.log(`   Member ID: ${member.id}`)
    console.log(`   Team ID: ${member.team_id}`)

    // Count their availabilities
    const { data: availabilities } = await supabase
      .from('availability')
      .select('date')
      .eq('member_id', member.id)

    const uniqueDates = new Set(availabilities?.map(a => a.date) || []).size
    console.log(`   📊 Unique dates filled: ${uniqueDates}`)

    if (uniqueDates === 0) {
      console.log('   ⏭️  No availabilities, skipping...')
      continue
    }

    // Predict which badges they should get
    const expectedBadges = []
    if (uniqueDates >= 10) expectedBadges.push('activity_10')
    if (uniqueDates >= 50) expectedBadges.push('activity_50')
    if (uniqueDates >= 100) expectedBadges.push('activity_100')
    if (uniqueDates >= 500) expectedBadges.push('activity_500')
    if (uniqueDates >= 1000) expectedBadges.push('activity_1000')

    if (expectedBadges.length > 0) {
      console.log(`   🎯 Should receive: ${expectedBadges.join(', ')}`)
    }

    // Call check_and_award_badges function
    console.log('   🔄 Checking badges...')
    try {
      const { data: result, error: awardError } = await supabase
        .rpc('check_and_award_badges', {
          p_member_id: member.id,
          p_team_id: member.team_id
        })

      if (awardError) {
        console.error('   ❌ Error:', awardError.message)
        
        if (awardError.message.includes('function') && awardError.message.includes('does not exist')) {
          console.error('\n⚠️  CRITICAL: Database function "check_and_award_badges" does not exist!')
          console.error('   You need to run gamification-schema.sql in Supabase SQL Editor first.')
          console.error('   Stopping script...\n')
          process.exit(1)
        }
        
        failCount++
        continue
      }

      if (result && result.new_badges && result.new_badges.length > 0) {
        console.log(`   ✅ Awarded ${result.new_badges.length} badge(s):`)
        result.new_badges.forEach(badge => {
          console.log(`      🏅 ${badge.type}`)
        })
        totalNewBadges += result.new_badges.length
        successCount++
      } else {
        console.log('   ℹ️  No new badges (already awarded or criteria not met)')
        successCount++
      }

    } catch (err) {
      console.error('   ❌ Exception:', err.message)
      failCount++
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`)
  console.log('\n📊 SUMMARY')
  console.log(`   Total members processed: ${members.length}`)
  console.log(`   ✅ Successful: ${successCount}`)
  console.log(`   ❌ Failed: ${failCount}`)
  console.log(`   🏅 Total new badges awarded: ${totalNewBadges}`)
  console.log('\n✅ Done!\n')
}

awardBadgesForAllMembers()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Script failed:', err)
    process.exit(1)
  })
