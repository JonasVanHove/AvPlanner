const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Manually load .env.local
const envContent = fs.readFileSync('.env.local', 'utf8')
const envLines = envContent.split('\n')
envLines.forEach(line => {
  if (line.includes('=') && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=')
    const value = valueParts.join('=')
    process.env[key.trim()] = value.trim()
  }
})

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testHolidaySystem() {
  console.log('🧪 Testing Holiday System...\n')

  try {
    // 1. Test connection
    console.log('1. Testing Supabase connection...')
    const { data: testData, error: testError } = await supabase
      .from('teams')
      .select('id, name')
      .limit(1)
    
    if (testError) {
      console.error('❌ Connection failed:', testError.message)
      return
    }
    console.log('✅ Supabase connection working\n')

    // 2. Get teams with members
    console.log('2. Getting teams with members...')
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select(`
        id, 
        name,
        members!inner (
          id,
          first_name,
          last_name,
          country_code,
          status
        )
      `)
      .eq('members.status', 'active')
      .limit(5)

    if (teamsError) {
      console.error('❌ Teams fetch failed:', teamsError.message)
      return
    }

    console.log(`Found ${teams?.length || 0} teams with active members:`)
    teams?.forEach(team => {
      const activeMembers = team.members?.filter(m => m.status === 'active') || []
      const countries = [...new Set(activeMembers.map(m => m.country_code).filter(Boolean))]
      console.log(`  - ${team.name}: ${activeMembers.length} members in countries: ${countries.join(', ') || 'none set'}`)
    })
    console.log('')

    // 3. Test with first team that has members with country codes
    const testTeam = teams?.find(team => 
      team.members?.some(m => m.country_code && m.status === 'active')
    )

    if (!testTeam) {
      console.log('❌ No team found with members that have country codes set')
      console.log('💡 Suggestion: Add country_code to members in your database')
      return
    }

    console.log(`3. Testing with team: ${testTeam.name} (ID: ${testTeam.id})`)
    const testMembers = testTeam.members?.filter(m => m.country_code && m.status === 'active') || []
    console.log(`Members with country codes:`)
    testMembers.forEach(member => {
      console.log(`  - ${member.first_name} ${member.last_name}: ${member.country_code}`)
    })
    console.log('')

    // 4. Get holidays for these countries
    console.log('4. Getting holidays for member countries...')
    const countryList = [...new Set(testMembers.map(m => m.country_code))]
    
    const { data: holidays, error: holidaysError } = await supabase
      .from('holidays')
      .select('country_code, date, name, is_official')
      .in('country_code', countryList)
      .gte('date', new Date().toISOString().split('T')[0])
      .lte('date', new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // next 60 days
      .order('date')
      .limit(10)

    if (holidaysError) {
      console.error('❌ Holidays fetch failed:', holidaysError.message)
      return
    }

    console.log(`Found ${holidays?.length || 0} upcoming holidays:`)
    holidays?.forEach(holiday => {
      console.log(`  - ${holiday.date}: ${holiday.name} (${holiday.country_code}) ${holiday.is_official ? '🏛️' : '🎉'}`)
    })
    console.log('')

    // 5. Test the RPC function
    console.log('5. Testing get_team_upcoming_holidays RPC function...')
    const { data: rpcHolidays, error: rpcError } = await supabase.rpc('get_team_upcoming_holidays', {
      target_team_id: testTeam.id,
      days_ahead: 60
    })

    if (rpcError) {
      console.error('❌ RPC function failed:', rpcError.message)
      console.log('💡 The get_team_upcoming_holidays function might not exist in your database')
      return
    }

    console.log(`RPC function returned ${rpcHolidays?.length || 0} holiday entries:`)
    rpcHolidays?.slice(0, 5).forEach(holiday => {
      console.log(`  - ${holiday.member_name}: ${holiday.holiday_date} - ${holiday.holiday_name} (${holiday.country_code})`)
    })
    console.log('')

    console.log('✅ Holiday system test completed successfully!')
    console.log(`\n🎯 Ready to test with team ID: ${testTeam.id}`)

  } catch (error) {
    console.error('💥 Test failed:', error)
  }
}

testHolidaySystem()