-- Gamification Schema for AvPlanner
-- Adds badge system for rewarding users who complete their schedules on time

-- Table: user_badges
-- Stores badges earned by users
-- Drop existing table if you want a fresh start (WARNING: deletes all badges!)
-- DROP TABLE IF EXISTS public.user_badges CASCADE;

CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL CHECK (badge_type IN (
    'timely_completion', 
    'helped_other', 
    'streak_3', 
    'streak_10', 
    'perfect_month',
    'activity_10',
    'activity_50',
    'activity_100',
    'activity_500',
    'activity_1000'
  )),
  week_year TEXT NOT NULL, -- Format: "2024-W48" for uniqueness per week
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}', -- Additional data like who was helped, streak count, etc.
  UNIQUE(user_id, badge_type, week_year, team_id) -- One badge per type per week per team
);

-- If table already exists, update the constraint
DO $$ 
BEGIN
  -- Drop old constraint if it exists
  ALTER TABLE public.user_badges DROP CONSTRAINT IF EXISTS user_badges_badge_type_check;
  
  -- Add updated constraint
  ALTER TABLE public.user_badges
  ADD CONSTRAINT user_badges_badge_type_check 
  CHECK (badge_type IN (
    'timely_completion',
    'helped_other',
    'streak_3',
    'streak_10',
    'perfect_month',
    'activity_10',
    'activity_50',
    'activity_100',
    'activity_500',
    'activity_1000'
  ));
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Constraint already exists with correct definition
END $$;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_team_id ON public.user_badges(team_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_member_id ON public.user_badges(member_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_earned_at ON public.user_badges(earned_at DESC);

-- Enable RLS
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_badges
-- Users can view their own badges and badges of team members in their teams
DROP POLICY IF EXISTS "Users can view badges in their teams" ON public.user_badges;
CREATE POLICY "Users can view badges in their teams"
  ON public.user_badges FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.members 
      WHERE email = auth.jwt()->>'email'
    )
  );

-- Users can insert their own badges (via API)
DROP POLICY IF EXISTS "Service can insert badges" ON public.user_badges;
CREATE POLICY "Service can insert badges"
  ON public.user_badges FOR INSERT
  WITH CHECK (true); -- API will validate

-- No updates or deletes allowed (badges are permanent)
DROP POLICY IF EXISTS "Badges cannot be updated" ON public.user_badges;
CREATE POLICY "Badges cannot be updated"
  ON public.user_badges FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "Badges cannot be deleted by users" ON public.user_badges;
CREATE POLICY "Badges cannot be deleted by users"
  ON public.user_badges FOR DELETE
  USING (false);

-- Grant permissions
GRANT SELECT, INSERT ON public.user_badges TO authenticated;
GRANT SELECT, INSERT ON public.user_badges TO service_role;

-- Function: Check if user completed next week on time
-- Returns true if all required days for next week are filled before Sunday 23:59
CREATE OR REPLACE FUNCTION check_timely_completion(
  p_member_id UUID,
  p_team_id UUID,
  p_check_date DATE DEFAULT CURRENT_DATE
) RETURNS BOOLEAN AS $$
DECLARE
  v_next_week_start DATE;
  v_next_week_end DATE;
  v_required_days INTEGER;
  v_filled_days INTEGER;
  v_weekends_as_weekdays BOOLEAN;
BEGIN
  -- Get team settings for weekend behavior
  SELECT COALESCE((settings->>'weekendsAsWeekdays')::boolean, false)
  INTO v_weekends_as_weekdays
  FROM teams
  WHERE id = p_team_id;

  -- Calculate next week's date range (Monday to Sunday)
  v_next_week_start := date_trunc('week', p_check_date + INTERVAL '1 week')::DATE + 1; -- Next Monday
  v_next_week_end := v_next_week_start + INTERVAL '6 days'; -- Next Sunday

  -- Calculate required days
  IF v_weekends_as_weekdays THEN
    v_required_days := 7; -- All days
  ELSE
    v_required_days := 5; -- Weekdays only
  END IF;

  -- Count filled days in next week
  IF v_weekends_as_weekdays THEN
    SELECT COUNT(DISTINCT date)
    INTO v_filled_days
    FROM availability
    WHERE member_id = p_member_id
      AND date >= v_next_week_start
      AND date <= v_next_week_end;
  ELSE
    -- Only count weekdays
    SELECT COUNT(DISTINCT date)
    INTO v_filled_days
    FROM availability
    WHERE member_id = p_member_id
      AND date >= v_next_week_start
      AND date <= v_next_week_end
      AND EXTRACT(DOW FROM date) NOT IN (0, 6); -- Exclude Sunday (0) and Saturday (6)
  END IF;

  RETURN v_filled_days >= v_required_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user helped complete another member's schedule
-- Returns member_ids that this user helped complete
CREATE OR REPLACE FUNCTION check_helped_others(
  p_member_id UUID,
  p_team_id UUID,
  p_check_date DATE DEFAULT CURRENT_DATE
) RETURNS UUID[] AS $$
DECLARE
  v_helped_members UUID[];
BEGIN
  -- Find team members whose schedule was recently completed
  -- and this user made updates for them (via edit mode)
  -- This is tracked via the changed_by_id field in availability
  
  SELECT ARRAY_AGG(DISTINCT a.member_id)
  INTO v_helped_members
  FROM availability a
  INNER JOIN members tm ON a.member_id = tm.id
  WHERE tm.team_id = p_team_id
    AND a.member_id != p_member_id -- Not self
    AND a.changed_by_id = p_member_id -- This user made the change
    AND a.updated_at >= p_check_date - INTERVAL '7 days' -- Recent help
  HAVING COUNT(DISTINCT a.date) >= 5; -- Helped fill at least 5 days

  RETURN COALESCE(v_helped_members, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get week-year string for a date
CREATE OR REPLACE FUNCTION get_week_year(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TEXT AS $$
BEGIN
  RETURN TO_CHAR(p_date, 'IYYY-"W"IW');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Award badge to user
CREATE OR REPLACE FUNCTION award_badge(
  p_user_id UUID,
  p_member_id UUID,
  p_team_id UUID,
  p_badge_type TEXT,
  p_week_year TEXT,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_badge_id UUID;
BEGIN
  -- Insert badge (ON CONFLICT to prevent duplicates)
  INSERT INTO user_badges (user_id, member_id, team_id, badge_type, week_year, metadata)
  VALUES (p_user_id, p_member_id, p_team_id, p_badge_type, p_week_year, p_metadata)
  ON CONFLICT (user_id, badge_type, week_year, team_id) DO NOTHING
  RETURNING id INTO v_badge_id;

  RETURN v_badge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get user badges for a team
CREATE OR REPLACE FUNCTION get_user_badges(
  p_user_email TEXT,
  p_team_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
  badge_id UUID,
  badge_type TEXT,
  week_year TEXT,
  earned_at TIMESTAMPTZ,
  team_name TEXT,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ub.id,
    ub.badge_type,
    ub.week_year,
    ub.earned_at,
    t.name AS team_name,
    ub.metadata
  FROM user_badges ub
  INNER JOIN teams t ON ub.team_id = t.id
  INNER JOIN members m ON ub.member_id = m.id
  INNER JOIN auth.users au ON m.auth_user_id = au.id
  WHERE au.email = p_user_email
    AND (p_team_id IS NULL OR ub.team_id = p_team_id)
  ORDER BY ub.earned_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check activity count milestones
-- Returns list of activity badges the member is eligible for
CREATE OR REPLACE FUNCTION check_activity_milestones(
  p_member_id UUID,
  p_team_id UUID
) RETURNS TABLE (
  badge_type TEXT,
  activity_count BIGINT
) AS $$
DECLARE
  v_total_activities BIGINT;
BEGIN
  -- Count UNIQUE dates (not total entries) to prevent gaming the system
  -- Each day only counts once, regardless of how many times it was updated
  SELECT COUNT(DISTINCT date)
  INTO v_total_activities
  FROM availability
  WHERE member_id = p_member_id;

  -- Return all milestone badges they qualify for
  RETURN QUERY
  WITH milestones AS (
    SELECT unnest(ARRAY['activity_10', 'activity_50', 'activity_100', 'activity_500', 'activity_1000']) AS badge,
           unnest(ARRAY[10, 50, 100, 500, 1000]) AS threshold
  )
  SELECT 
    milestones.badge::TEXT,
    v_total_activities
  FROM milestones
  WHERE v_total_activities >= milestones.threshold;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get badge leaderboard for a team
CREATE OR REPLACE FUNCTION get_badge_leaderboard(
  p_team_id UUID,
  p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
  member_id UUID,
  member_name TEXT,
  total_badges BIGINT,
  timely_badges BIGINT,
  helper_badges BIGINT,
  streak_badges BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tm.id AS member_id,
    TRIM(tm.first_name || ' ' || COALESCE(tm.last_name, '')) AS member_name,
    COUNT(*)::BIGINT AS total_badges,
    COUNT(*) FILTER (WHERE ub.badge_type = 'timely_completion')::BIGINT AS timely_badges,
    COUNT(*) FILTER (WHERE ub.badge_type = 'helped_other')::BIGINT AS helper_badges,
    COUNT(*) FILTER (WHERE ub.badge_type IN ('streak_3', 'streak_10', 'perfect_month'))::BIGINT AS streak_badges
  FROM members tm
  LEFT JOIN user_badges ub ON ub.member_id = tm.id AND ub.team_id = p_team_id
  WHERE tm.team_id = p_team_id
  GROUP BY tm.id, tm.first_name, tm.last_name
  HAVING COUNT(*) > 0
  ORDER BY total_badges DESC, timely_badges DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check and award badges for a user
CREATE OR REPLACE FUNCTION check_and_award_badges(
  p_member_id UUID,
  p_team_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_week_year TEXT;
  v_is_timely BOOLEAN;
  v_helped_members UUID[];
  v_new_badges JSONB := '[]'::JSONB;
  v_badge_id UUID;
BEGIN
  -- Get user_id from member (members.auth_user_id column)
  SELECT auth_user_id INTO v_user_id
  FROM members
  WHERE id = p_member_id;

  IF v_user_id IS NULL THEN
    RETURN '{"error": "Member not linked to user"}'::JSONB;
  END IF;

  v_week_year := get_week_year(CURRENT_DATE);

  -- Check timely completion
  v_is_timely := check_timely_completion(p_member_id, p_team_id, CURRENT_DATE);
  
  IF v_is_timely THEN
    v_badge_id := award_badge(
      v_user_id,
      p_member_id,
      p_team_id,
      'timely_completion',
      v_week_year,
      jsonb_build_object('completed_at', NOW())
    );
    
    IF v_badge_id IS NOT NULL THEN
      v_new_badges := v_new_badges || jsonb_build_object(
        'type', 'timely_completion',
        'id', v_badge_id,
        'week_year', v_week_year
      );
    END IF;
  END IF;

  -- Check helped others
  v_helped_members := check_helped_others(p_member_id, p_team_id, CURRENT_DATE);
  
  IF array_length(v_helped_members, 1) > 0 THEN
    v_badge_id := award_badge(
      v_user_id,
      p_member_id,
      p_team_id,
      'helped_other',
      v_week_year,
      jsonb_build_object('helped_members', v_helped_members, 'count', array_length(v_helped_members, 1))
    );
    
    IF v_badge_id IS NOT NULL THEN
      v_new_badges := v_new_badges || jsonb_build_object(
        'type', 'helped_other',
        'id', v_badge_id,
        'week_year', v_week_year,
        'helped_count', array_length(v_helped_members, 1)
      );
    END IF;
  END IF;

  -- Check activity milestones
  -- Activity badges use 'lifetime' as week_year since they're cumulative
  DECLARE
    v_milestone RECORD;
  BEGIN
    FOR v_milestone IN 
      SELECT * FROM check_activity_milestones(p_member_id, p_team_id)
    LOOP
      v_badge_id := award_badge(
        v_user_id,
        p_member_id,
        p_team_id,
        v_milestone.badge_type,
        'lifetime', -- Activity badges are lifetime achievements
        jsonb_build_object('total_activities', v_milestone.activity_count)
      );
      
      IF v_badge_id IS NOT NULL THEN
        v_new_badges := v_new_badges || jsonb_build_object(
          'type', v_milestone.badge_type,
          'id', v_badge_id,
          'week_year', 'lifetime',
          'activity_count', v_milestone.activity_count
        );
      END IF;
    END LOOP;
  END;

  RETURN jsonb_build_object('new_badges', v_new_badges);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_timely_completion TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_helped_others TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_activity_milestones TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_week_year TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION award_badge TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_user_badges TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_badge_leaderboard TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_and_award_badges TO authenticated, service_role;

-- Add changed_by_id to availability table if not exists
-- This tracks who made the change (for "helped other" badge)
-- NOTE: This column already exists in the schema based on the provided structure
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'availability' 
    AND column_name = 'changed_by_id'
  ) THEN
    ALTER TABLE public.availability 
    ADD COLUMN changed_by_id UUID REFERENCES public.members(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_availability_changed_by ON public.availability(changed_by_id);
  END IF;
END $$;

-- Add settings column to teams table for weekendsAsWeekdays if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'teams' 
    AND column_name = 'settings'
  ) THEN
    ALTER TABLE public.teams 
    ADD COLUMN settings JSONB DEFAULT '{}'::JSONB;
  END IF;
END $$;

-- Comments for documentation
COMMENT ON TABLE public.user_badges IS 'Stores gamification badges earned by users for completing schedules on time and helping others';
COMMENT ON FUNCTION check_timely_completion IS 'Checks if a member has completed next week schedule before current week ends';
COMMENT ON FUNCTION check_helped_others IS 'Checks if a member helped other team members complete their schedules';
COMMENT ON FUNCTION check_and_award_badges IS 'Main function to check all badge conditions and award new badges';
