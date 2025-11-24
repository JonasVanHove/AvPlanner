-- Backfill Historical Badges
-- This script awards badges for past weeks where members had remote/holiday patterns
-- Run this ONCE after implementing the new weekly badge system

-- Function to check and award badges for a SPECIFIC week
CREATE OR REPLACE FUNCTION check_and_award_badges_for_week(
  p_member_id UUID,
  p_team_id UUID,
  p_week_start DATE
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_week_year TEXT;
  v_week_end DATE;
  v_weekends_as_weekdays BOOLEAN;
  v_required_days INTEGER;
  v_remote_days INTEGER;
  v_holiday_days INTEGER;
  v_has_past_full_holiday_week BOOLEAN := FALSE;
  v_new_badges JSONB := '[]'::JSONB;
  v_badge_id UUID;
BEGIN
  -- Get user_id from member
  SELECT auth_user_id INTO v_user_id
  FROM members
  WHERE id = p_member_id;

  IF v_user_id IS NULL THEN
    RETURN '{"error": "Member not linked to user"}'::JSONB;
  END IF;

  -- Calculate week_year for this specific week
  v_week_year := TO_CHAR(p_week_start, 'IYYY-"W"IW');
  v_week_end := p_week_start + INTERVAL '6 days';

  -- Get team settings
  SELECT COALESCE((settings->>'weekendsAsWeekdays')::boolean, false)
  INTO v_weekends_as_weekdays
  FROM teams
  WHERE id = p_team_id;

  -- Required days for a full week
  IF v_weekends_as_weekdays THEN
    v_required_days := 7;
  ELSE
    v_required_days := 5;
  END IF;

  -- Count remote days in this specific week
  SELECT COUNT(DISTINCT a.date)
  INTO v_remote_days
  FROM availability a
  INNER JOIN members m ON m.id = a.member_id
  WHERE a.member_id = p_member_id
    AND m.team_id = p_team_id
    AND a.date >= p_week_start AND a.date <= v_week_end
    AND a.status = 'remote'
    AND (v_weekends_as_weekdays OR EXTRACT(DOW FROM a.date) NOT IN (0,6));

  -- Count holiday days in this specific week
  SELECT COUNT(DISTINCT a.date)
  INTO v_holiday_days
  FROM availability a
  INNER JOIN members m ON m.id = a.member_id
  WHERE a.member_id = p_member_id
    AND m.team_id = p_team_id
    AND a.date >= p_week_start AND a.date <= v_week_end
    AND a.status = 'holiday'
    AND (v_weekends_as_weekdays OR EXTRACT(DOW FROM a.date) NOT IN (0,6));

  -- Check for any PAST full holiday week (before this week)
  SELECT EXISTS (
    SELECT 1
    FROM (
      SELECT (date_trunc('week', a.date)::date + 1) AS wk_start,
             COUNT(DISTINCT a.date) AS cnt
      FROM availability a
      INNER JOIN members m ON m.id = a.member_id
      WHERE a.member_id = p_member_id
        AND m.team_id = p_team_id
        AND a.date < p_week_start
        AND a.status = 'holiday'
        AND (v_weekends_as_weekdays OR EXTRACT(DOW FROM a.date) NOT IN (0,6))
      GROUP BY 1
    ) s
    WHERE s.cnt >= v_required_days
  ) INTO v_has_past_full_holiday_week;

  -- Award: 3 remote days => Remote Worker
  IF v_remote_days >= 3 THEN
    v_badge_id := award_badge(
      v_user_id,
      p_member_id,
      p_team_id,
      'remote_3_days',
      v_week_year,
      jsonb_build_object('remote_days', v_remote_days, 'week_start', p_week_start, 'week_end', v_week_end)
    );
    IF v_badge_id IS NOT NULL THEN
      v_new_badges := v_new_badges || jsonb_build_object(
        'type', 'remote_3_days',
        'id', v_badge_id,
        'week_year', v_week_year,
        'remote_days', v_remote_days
      );
    END IF;
  END IF;

  -- Award: 5 holiday days => Holiday Tripper
  IF v_holiday_days >= 5 THEN
    v_badge_id := award_badge(
      v_user_id,
      p_member_id,
      p_team_id,
      'holiday_5_days',
      v_week_year,
      jsonb_build_object('holiday_days', v_holiday_days, 'week_start', p_week_start, 'week_end', v_week_end)
    );
    IF v_badge_id IS NOT NULL THEN
      v_new_badges := v_new_badges || jsonb_build_object(
        'type', 'holiday_5_days',
        'id', v_badge_id,
        'week_year', v_week_year,
        'holiday_days', v_holiday_days
      );
    END IF;
  END IF;

  -- Award: Full remote week (gated by past full holiday week)
  IF v_remote_days >= v_required_days AND v_has_past_full_holiday_week THEN
    v_badge_id := award_badge(
      v_user_id,
      p_member_id,
      p_team_id,
      'remote_full_week',
      v_week_year,
      jsonb_build_object(
        'remote_days', v_remote_days,
        'required_days', v_required_days,
        'gated_by_holiday_week', true,
        'week_start', p_week_start,
        'week_end', v_week_end
      )
    );
    IF v_badge_id IS NOT NULL THEN
      v_new_badges := v_new_badges || jsonb_build_object(
        'type', 'remote_full_week',
        'id', v_badge_id,
        'week_year', v_week_year,
        'remote_days', v_remote_days,
        'required_days', v_required_days
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('new_badges', v_new_badges);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_and_award_badges_for_week TO authenticated, service_role;

-- ============================================================
-- BACKFILL: Process all historical weeks with remote/holiday data
-- ============================================================
DO $$
DECLARE
  r_member RECORD;
  r_week RECORD;
  v_result JSONB;
  v_total_badges INTEGER := 0;
  v_members_processed INTEGER := 0;
  v_weeks_processed INTEGER := 0;
BEGIN
  RAISE NOTICE '🏅 Starting historical badge backfill...';
  RAISE NOTICE '📅 Processing weeks with remote/holiday availability...';

  -- For each member in each team
  FOR r_member IN 
    SELECT DISTINCT m.id, m.team_id, m.first_name, m.last_name
    FROM members m
    WHERE EXISTS (
      SELECT 1 FROM availability a 
      WHERE a.member_id = m.id 
      AND a.status IN ('remote', 'holiday')
    )
    ORDER BY m.id
  LOOP
    v_members_processed := v_members_processed + 1;
    RAISE NOTICE '👤 Processing member: % % (id: %)', r_member.first_name, r_member.last_name, r_member.id;

    -- Find all weeks where this member had remote or holiday availability
    FOR r_week IN
      SELECT DISTINCT (date_trunc('week', a.date)::date + 1) AS week_start
      FROM availability a
      WHERE a.member_id = r_member.id
        AND a.status IN ('remote', 'holiday')
        AND a.date < CURRENT_DATE -- Only past weeks, not current week
      ORDER BY week_start
    LOOP
      v_weeks_processed := v_weeks_processed + 1;
      
      BEGIN
        v_result := check_and_award_badges_for_week(
          r_member.id,
          r_member.team_id,
          r_week.week_start
        );
        
        -- Count new badges
        IF v_result->>'new_badges' != '[]' THEN
          v_total_badges := v_total_badges + jsonb_array_length(v_result->'new_badges');
          RAISE NOTICE '  ✅ Week %: Awarded % badges', 
            TO_CHAR(r_week.week_start, 'IYYY-"W"IW'),
            jsonb_array_length(v_result->'new_badges');
        END IF;
        
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '  ⚠️ Failed processing week % for member %: %', 
          r_week.week_start, r_member.id, SQLERRM;
      END;
    END LOOP;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '🎉 Backfill complete!';
  RAISE NOTICE '   Members processed: %', v_members_processed;
  RAISE NOTICE '   Weeks processed: %', v_weeks_processed;
  RAISE NOTICE '   Total badges awarded: %', v_total_badges;
END;
$$;
