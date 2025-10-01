import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    
    // Get request body for date range (optional)
    const body = await request.json().catch(() => ({}))
    const {
      startDate = new Date().toISOString().split('T')[0], // Today
      endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // One year from now
      action = 'apply', // 'apply' or 'remove' or 'preview'
      memberIds = [], // Optional array of member IDs to filter by
      onlyNew = false // Only add new records, don't overwrite existing ones
    } = body

    console.log('🎄 Auto-holidays request:', { teamId, startDate, endDate, action, memberIds })

    // Validate team access if teamId is provided
    if (teamId) {
      // Check if user has access to this team (simplified check)
      const { data: teamMembers, error: teamError } = await supabase
        .from('members')
        .select('id, email, role')
        .eq('team_id', teamId)
        .eq('status', 'active')

      if (teamError) {
        console.error('❌ Team access check error:', teamError)
        return NextResponse.json({ error: 'Failed to verify team access' }, { status: 403 })
      }

      if (!teamMembers || teamMembers.length === 0) {
        return NextResponse.json({ error: 'Team not found or no access' }, { status: 404 })
      }
    }

    if (action === 'preview') {
      // Get upcoming holidays without applying them
      console.log('👀 Previewing holidays for team:', teamId)
      
      const { data, error } = await supabase.rpc('get_team_upcoming_holidays', {
        target_team_id: teamId,
        days_ahead: Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      })

      if (error) {
        console.error('❌ Preview holidays error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      console.log('👀 Preview found holidays:', data?.length || 0)
      if (data && data.length > 0) {
        console.log('📋 Sample holidays:', JSON.stringify(data.slice(0, 3), null, 2))
      }

      return NextResponse.json({
        action: 'preview',
        holidays: data || [],
        count: data?.length || 0
      })
    }

    if (action === 'apply') {
      // Apply auto-holidays
      console.log('🎯 Applying auto-holidays for team:', teamId, 'from', startDate, 'to', endDate, 'members:', memberIds)
      
      // If memberIds are specified, we need to use a different approach
      if (memberIds && memberIds.length > 0) {
        // Manual application for specific members
        console.log('📝 Applying holidays for specific members:', memberIds.length)
        
        // First, get holidays for the countries of these members
        const { data: memberCountries, error: memberError } = await supabase
          .from('members')
          .select('id, country_code')
          .eq('team_id', teamId)
          .in('id', memberIds)
          .not('country_code', 'is', null)

        if (memberError) {
          console.error('❌ Member fetch error:', memberError)
          return NextResponse.json({ error: memberError.message }, { status: 500 })
        }

        // Get holidays for these countries
        const countryList = [...new Set(memberCountries?.map(m => m.country_code) || [])]
        const { data: holidays, error: holidaysError } = await supabase
          .from('holidays')
          .select('country_code, date, name')
          .in('country_code', countryList)
          .gte('date', startDate)
          .lte('date', endDate)

        if (holidaysError) {
          console.error('❌ Holidays fetch error:', holidaysError)
          return NextResponse.json({ error: holidaysError.message }, { status: 500 })
        }

        // Apply holidays to specific members
        let appliedCount = 0
        for (const member of memberCountries || []) {
          const memberHolidays = holidays?.filter(h => h.country_code === member.country_code) || []
          
          for (const holiday of memberHolidays) {
            if (onlyNew) {
              // Check if record already exists
              const { data: existingRecord, error: checkError } = await supabase
                .from('availability')
                .select('id')
                .eq('member_id', member.id)
                .eq('date', holiday.date)
                .single()

              if (checkError && checkError.code !== 'PGRST116') {
                console.error('❌ Error checking existing record:', checkError)
                continue
              }

              if (existingRecord) {
                console.log('⏭️ Skipping existing record:', member.id, holiday.date)
                continue // Skip if record exists
              }

              // Insert only new record
              const { error: insertError } = await supabase
                .from('availability')
                .insert({
                  member_id: member.id,
                  date: holiday.date,
                  status: 'holiday',
                  auto_holiday: true
                })

              if (!insertError) {
                appliedCount++
                console.log('✅ Added new holiday:', member.id, holiday.date)
              } else {
                console.error('❌ Insert error:', insertError)
              }
            } else {
              // Use upsert (original behavior)
              const { error: insertError } = await supabase
                .from('availability')
                .upsert({
                  member_id: member.id,
                  date: holiday.date,
                  status: 'holiday',
                  auto_holiday: true
                }, {
                  onConflict: 'member_id,date'
                })

              if (!insertError) {
                appliedCount++
              }
            }
          }
        }

        console.log('✅ Applied holidays manually:', appliedCount)
        
        return NextResponse.json({
          action: 'apply',
          success: true,
          applied_count: appliedCount,
          member_count: memberIds.length,
          holiday_count: holidays?.length || 0,
          details: []
        })
      } else {
        // Use the original RPC function for all members
        if (onlyNew) {
          // For onlyNew, we need to manually handle all team members
          const { data: allMembers, error: membersError } = await supabase
            .from('members')
            .select('id, country_code')
            .eq('team_id', teamId)
            .eq('status', 'active')
            .not('country_code', 'is', null)

          if (membersError) {
            console.error('❌ All members fetch error:', membersError)
            return NextResponse.json({ error: membersError.message }, { status: 500 })
          }

          // Apply to all members with onlyNew logic
          const countryList = [...new Set(allMembers?.map(m => m.country_code) || [])]
          const { data: holidays, error: holidaysError } = await supabase
            .from('holidays')
            .select('country_code, date, name')
            .in('country_code', countryList)
            .gte('date', startDate)
            .lte('date', endDate)

          if (holidaysError) {
            console.error('❌ Holidays fetch error:', holidaysError)
            return NextResponse.json({ error: holidaysError.message }, { status: 500 })
          }

          let appliedCount = 0
          for (const member of allMembers || []) {
            const memberHolidays = holidays?.filter(h => h.country_code === member.country_code) || []
            
            for (const holiday of memberHolidays) {
              // Check if record already exists
              const { data: existingRecord, error: checkError } = await supabase
                .from('availability')
                .select('id')
                .eq('member_id', member.id)
                .eq('date', holiday.date)
                .single()

              if (checkError && checkError.code !== 'PGRST116') {
                console.error('❌ Error checking existing record:', checkError)
                continue
              }

              if (existingRecord) {
                console.log('⏭️ Skipping existing record:', member.id, holiday.date)
                continue // Skip if record exists
              }

              // Insert only new record
              const { error: insertError } = await supabase
                .from('availability')
                .insert({
                  member_id: member.id,
                  date: holiday.date,
                  status: 'holiday',
                  auto_holiday: true
                })

              if (!insertError) {
                appliedCount++
                console.log('✅ Added new holiday:', member.id, holiday.date)
              } else {
                console.error('❌ Insert error:', insertError)
              }
            }
          }

          console.log('✅ Auto-holidays applied (onlyNew):', appliedCount, 'holidays for', allMembers?.length || 0, 'members')

          return NextResponse.json({
            action: 'apply',
            success: true,
            applied_count: appliedCount,
            member_count: allMembers?.length || 0,
            holiday_count: holidays?.length || 0,
            onlyNew: true
          })
        } else {
          // Use the original RPC function for all members (allows overwrite)
          const { data, error } = await supabase.rpc('apply_auto_holidays', {
            target_team_id: teamId,
            start_date: startDate,
            end_date: endDate
          })

        if (error) {
          console.error('❌ Apply auto-holidays error:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const result = data?.[0] || { applied_count: 0, member_count: 0, holiday_count: 0, details: [] }

        console.log('✅ Auto-holidays applied:', result.applied_count, 'holidays for', result.member_count, 'members')
        console.log('📊 Detailed result:', JSON.stringify(result, null, 2))

        return NextResponse.json({
          action: 'apply',
          success: true,
          applied_count: result.applied_count,
          member_count: result.member_count,
          holiday_count: result.holiday_count,
          details: result.details || []
        })
        }
      }
    }

    if (action === 'remove') {
      // Remove auto-applied holidays
      console.log('🗑️ Removing auto-holidays for team:', teamId, 'from', startDate, 'to', endDate, 'members:', memberIds)
      
      if (memberIds && memberIds.length > 0) {
        // Manual removal for specific members
        console.log('📝 Removing holidays for specific members:', memberIds.length)
        
        const { data, error, count } = await supabase
          .from('availability')
          .delete()
          .eq('status', 'holiday')
          .eq('auto_holiday', true)
          .in('member_id', memberIds)
          .gte('date', startDate)
          .lte('date', endDate)
          .select()

        if (error) {
          console.error('❌ Remove holidays error:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        console.log('✅ Holidays removed manually for selected members')
        
        return NextResponse.json({
          action: 'remove',
          success: true,
          removed_count: count || (Array.isArray(data) ? data.length : 0)
        })
      } else {
        // Use the original RPC function for all members
        const { data, error } = await supabase.rpc('remove_auto_holidays', {
          target_team_id: teamId,
          start_date: startDate,
          end_date: endDate
        })

        if (error) {
          console.error('❌ Remove auto-holidays error:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        console.log('🗑️ Auto-holidays removed:', data, 'entries')

        return NextResponse.json({
          action: 'remove',
          success: true,
          removed_count: data || 0
        })
      }
    }

    return NextResponse.json({ error: 'Invalid action. Use: apply, remove, or preview' }, { status: 400 })

  } catch (error) {
    console.error('💥 Auto-holidays API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const daysAhead = parseInt(searchParams.get('daysAhead') || '30')

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    // Get upcoming holidays for preview
    const { data, error } = await supabase.rpc('get_team_upcoming_holidays', {
      target_team_id: teamId,
      days_ahead: daysAhead
    })

    if (error) {
      console.error('❌ Get upcoming holidays error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      teamId,
      daysAhead,
      holidays: data || [],
      count: data?.length || 0
    })

  } catch (error) {
    console.error('💥 Get holidays API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}