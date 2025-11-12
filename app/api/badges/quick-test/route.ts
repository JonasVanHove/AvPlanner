import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    environment: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
    },
    tests: []
  }

  console.log('🏅 [QUICK-TEST] Starting badge system quick test...')

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    console.log('🏅 [QUICK-TEST] Creating Supabase client...')
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // Test 1: Simple query
    console.log('🏅 [QUICK-TEST] Test 1: Testing basic Supabase connection...')
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id')
        .limit(1)
      
      if (error) {
        console.error('🏅 [QUICK-TEST] ❌ Basic query failed:', error.message)
        results.tests.push({
          test: 'Basic Supabase Connection',
          status: '❌ FAIL',
          error: error.message
        })
      } else {
        console.log('🏅 [QUICK-TEST] ✅ Basic query works!')
        results.tests.push({
          test: 'Basic Supabase Connection',
          status: '✅ PASS'
        })
      }
    } catch (err: any) {
      console.error('🏅 [QUICK-TEST] ❌ Exception in basic query:', err.message)
      results.tests.push({
        test: 'Basic Supabase Connection',
        status: '❌ ERROR',
        error: err.message
      })
    }

    // Test 2: Check if function exists
    console.log('🏅 [QUICK-TEST] Test 2: Checking if check_and_award_badges function exists...')
    try {
      const dummyUuid = '00000000-0000-0000-0000-000000000000'
      const { data, error } = await supabase.rpc('check_and_award_badges', {
        p_member_id: dummyUuid,
        p_team_id: dummyUuid
      })

      if (error) {
        console.error('🏅 [QUICK-TEST] RPC error:', error)
        
        if (error.message.includes('does not exist') || error.code === '42883') {
          console.error('🏅 [QUICK-TEST] ❌ Function does NOT exist!')
          results.tests.push({
            test: 'check_and_award_badges function',
            status: '❌ DOES NOT EXIST',
            error: 'Function not found in database',
            hint: '👉 You MUST run gamification-schema.sql in Supabase SQL Editor!',
            code: error.code
          })
        } else {
          console.log('🏅 [QUICK-TEST] ✅ Function exists (error is expected with dummy data)')
          results.tests.push({
            test: 'check_and_award_badges function',
            status: '✅ EXISTS',
            note: 'Function exists (error with test data is expected)',
            errorDetails: error.message
          })
        }
      } else {
        console.log('🏅 [QUICK-TEST] ✅ Function exists and executed!')
        results.tests.push({
          test: 'check_and_award_badges function',
          status: '✅ EXISTS & WORKS',
          result: data
        })
      }
    } catch (err: any) {
      console.error('🏅 [QUICK-TEST] ❌ Exception checking function:', err.message)
      results.tests.push({
        test: 'check_and_award_badges function',
        status: '❌ ERROR',
        error: err.message,
        type: err.name
      })
    }

    // Test 3: Check user_badges table
    console.log('🏅 [QUICK-TEST] Test 3: Checking user_badges table...')
    try {
      const { count, error } = await supabase
        .from('user_badges')
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        console.error('🏅 [QUICK-TEST] ❌ user_badges table error:', error.message)
        results.tests.push({
          test: 'user_badges table',
          status: '❌ FAIL',
          error: error.message,
          hint: error.code === '42P01' ? '👉 Table does not exist! Run gamification-schema.sql' : undefined
        })
      } else {
        console.log(`🏅 [QUICK-TEST] ✅ user_badges table exists (${count} badges)`)
        results.tests.push({
          test: 'user_badges table',
          status: '✅ PASS',
          badgeCount: count
        })
      }
    } catch (err: any) {
      console.error('🏅 [QUICK-TEST] ❌ Exception checking table:', err.message)
      results.tests.push({
        test: 'user_badges table',
        status: '❌ ERROR',
        error: err.message
      })
    }

  } catch (err: any) {
    console.error('🏅 [QUICK-TEST] ❌ Fatal error:', err)
    results.tests.push({
      test: 'Setup',
      status: '❌ FATAL',
      error: err.message
    })
  }

  // Summary
  const passCount = results.tests.filter((t: any) => t.status.includes('✅')).length
  const failCount = results.tests.filter((t: any) => t.status.includes('❌')).length

  results.summary = {
    total: results.tests.length,
    passed: passCount,
    failed: failCount,
  }

  if (failCount > 0) {
    results.action_required = '⚠️ You need to run gamification-schema.sql in Supabase SQL Editor!'
    results.steps = [
      '1. Open https://bhgvasgfhblhvsijcuum.supabase.co',
      '2. Click "SQL Editor" in left menu',
      '3. Create new query',
      '4. Copy ALL content from database/gamification-schema.sql',
      '5. Paste and click "Run" (or F5)',
      '6. Refresh this page to test again'
    ]
  } else {
    results.status = '🎉 Badge system is ready!'
  }

  console.log('🏅 [QUICK-TEST] Test complete. Results:', results)

  return NextResponse.json(results, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    }
  })
}
