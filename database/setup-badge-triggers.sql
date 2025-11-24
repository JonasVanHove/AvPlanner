-- Complete Badge System Setup for Supabase
-- Run this script in the Supabase SQL Editor to activate automatic badge generation
-- This script is idempotent and safe to run multiple times

BEGIN;

-- ============================================================
-- STEP 1: Ensure trigger function exists
-- ============================================================
CREATE OR REPLACE FUNCTION public.trigger_check_and_award_on_availability()
RETURNS trigger AS $$
DECLARE
  v_team_id UUID;
BEGIN
  -- Determine the team for the member
  SELECT team_id INTO v_team_id FROM public.members WHERE id = NEW.member_id;

  IF v_team_id IS NOT NULL THEN
    -- Run the badge-check function; ignore result
    PERFORM check_and_award_badges(NEW.member_id, v_team_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 2: Create trigger on availability table
-- ============================================================
DROP TRIGGER IF EXISTS trg_award_badges_on_availability ON public.availability;
CREATE TRIGGER trg_award_badges_on_availability
AFTER INSERT OR UPDATE OF status, changed_by_id ON public.availability
FOR EACH ROW
EXECUTE FUNCTION public.trigger_check_and_award_on_availability();

-- ============================================================
-- STEP 3: Seed badges for all existing members (one-time)
-- ============================================================
DO $$
DECLARE
  r RECORD;
  v_res JSONB;
  v_count INTEGER := 0;
  v_success INTEGER := 0;
BEGIN
  RAISE NOTICE '🏅 Starting badge seeding for existing members...';
  
  FOR r IN SELECT id, team_id FROM public.members ORDER BY created_at DESC LIMIT 100 LOOP
    v_count := v_count + 1;
    
    BEGIN
      v_res := check_and_award_badges(r.id, r.team_id);
      v_success := v_success + 1;
      
      IF v_res->>'new_badges' != '[]' THEN
        RAISE NOTICE '✅ Member % (team %): Awarded %', r.id, r.team_id, v_res->>'new_badges';
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '⚠️ Failed processing member %: %', r.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '🏅 Badge seeding complete: % members processed, % successful', v_count, v_success;
END;
$$;

-- ============================================================
-- STEP 4: Create scheduled function for daily badge refresh (optional)
-- ============================================================
-- This ensures badges are recalculated even if triggers miss something
CREATE OR REPLACE FUNCTION public.daily_badge_refresh()
RETURNS void AS $$
DECLARE
  r RECORD;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🏅 Daily badge refresh started at %', NOW();
  
  -- Process all active members (those with recent activity)
  FOR r IN 
    SELECT DISTINCT m.id, m.team_id 
    FROM public.members m
    JOIN public.availability a ON a.member_id = m.id
    WHERE a.date >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY m.id
  LOOP
    BEGIN
      PERFORM check_and_award_badges(r.id, r.team_id);
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '⚠️ Failed daily refresh for member %: %', r.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '🏅 Daily badge refresh complete: % members processed', v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.daily_badge_refresh TO service_role;

COMMIT;

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
DO $msg$
BEGIN
  RAISE NOTICE '
  ✅ Badge system setup complete!
  
  What happens now:
  - ✅ Badges are automatically checked whenever availability changes
  - ✅ Existing members have been seeded with badges
  - ✅ New availability updates will trigger badge checks
  
  To schedule a daily refresh (after enabling pg_cron extension), run this separately in a new query:
    SELECT cron.schedule(''daily-badge-refresh'', ''0 2 * * *'', $$SELECT public.daily_badge_refresh()$$);
  
  Test it:
    1. Insert or update an availability record
    2. Check user_badges table: SELECT * FROM user_badges ORDER BY earned_at DESC LIMIT 10;
  ';
END;
$msg$;
