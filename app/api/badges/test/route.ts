import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

/**
 * GET /api/badges/test
 * Test if the badge system database functions exist
 */
export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: []
  }

  // Test 1: Check if user_badges table exists
  console.log('🏅 [TEST] Checking if user_badges table exists...')
  try {
    const { data, error } = await supabase
      .from('user_badges')
      .select('id')
      .limit(1)
    
    if (error) {
      results.tests.push({
        name: 'user_badges table',
        status: 'FAIL',
        error: error.message,
        hint: 'Run gamification-schema.sql in Supabase SQL Editor'
      })
      console.error('🏅 [TEST] ❌ user_badges table not found:', error.message)
    } else {
      results.tests.push({
        name: 'user_badges table',
        status: 'PASS',
        message: 'Table exists'
      })
      console.log('🏅 [TEST] ✅ user_badges table exists')
    }
  } catch (err: any) {
    results.tests.push({
      name: 'user_badges table',
      status: 'ERROR',
      error: err.message
    })
  }

  // Test 2: Check if check_and_award_badges function exists
  console.log('🏅 [TEST] Checking if check_and_award_badges function exists...')
  try {
    // Try to call with dummy UUIDs - will fail but tells us if function exists
    const dummyUuid = '00000000-0000-0000-0000-000000000000'
    const { error } = await supabase.rpc('check_and_award_badges', {
      p_member_id: dummyUuid,
      p_team_id: dummyUuid
    })
    
    if (error) {
      if (error.message.includes('does not exist') || error.message.includes('function')) {
        results.tests.push({
          name: 'check_and_award_badges function',
          status: 'FAIL',
          error: 'Function does not exist',
          hint: 'Run gamification-schema.sql in Supabase SQL Editor'
        })
        console.error('🏅 [TEST] ❌ Function does not exist')
      } else {
        // Function exists but failed for other reason (expected with dummy UUIDs)
        results.tests.push({
          name: 'check_and_award_badges function',
          status: 'PASS',
          message: 'Function exists (expected error with test data)',
          errorDetails: error.message
        })
        console.log('🏅 [TEST] ✅ Function exists')
      }
    } else {
      results.tests.push({
        name: 'check_and_award_badges function',
        status: 'PASS',
        message: 'Function exists and executed'
      })
      console.log('🏅 [TEST] ✅ Function exists and executed')
    }
  } catch (err: any) {
    results.tests.push({
      name: 'check_and_award_badges function',
      status: 'ERROR',
      error: err.message
    })
    console.error('🏅 [TEST] ❌ Exception:', err.message)
  }

  // Test 3: Get member count
  console.log('🏅 [TEST] Counting members...')
  try {
    const { count, error } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      results.tests.push({
        name: 'members table',
        status: 'FAIL',
        error: error.message
      })
    } else {
      results.tests.push({
        name: 'members table',
        status: 'PASS',
        message: `Found ${count} member(s)`
      })
      console.log(`🏅 [TEST] ✅ Found ${count} member(s)`)
    }
  } catch (err: any) {
    results.tests.push({
      name: 'members table',
      status: 'ERROR',
      error: err.message
    })
  }

  // Test 4: Get availability count
  console.log('🏅 [TEST] Counting availability entries...')
  try {
    const { count, error } = await supabase
      .from('availability')
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      results.tests.push({
        name: 'availability table',
        status: 'FAIL',
        error: error.message
      })
    } else {
      results.tests.push({
        name: 'availability table',
        status: 'PASS',
        message: `Found ${count} availability entr${count === 1 ? 'y' : 'ies'}`
      })
      console.log(`🏅 [TEST] ✅ Found ${count} availability entries`)
    }
  } catch (err: any) {
    results.tests.push({
      name: 'availability table',
      status: 'ERROR',
      error: err.message
    })
  }

  // Summary
  const passCount = results.tests.filter((t: any) => t.status === 'PASS').length
  const failCount = results.tests.filter((t: any) => t.status === 'FAIL').length
  const errorCount = results.tests.filter((t: any) => t.status === 'ERROR').length

  results.summary = {
    total: results.tests.length,
    passed: passCount,
    failed: failCount,
    errors: errorCount,
    status: failCount === 0 && errorCount === 0 ? 'ALL_PASS' : 'SOME_FAILED'
  }

  console.log('🏅 [TEST] Summary:', results.summary)

  if (results.summary.status !== 'ALL_PASS') {
    console.error('🏅 [TEST] ⚠️  Some tests failed! You need to run gamification-schema.sql')
  } else {
    console.log('🏅 [TEST] 🎉 All tests passed! Badge system is ready.')
  }

  return NextResponse.json(results, { 
    status: results.summary.status === 'ALL_PASS' ? 200 : 500 
  })
}
