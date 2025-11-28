-- =====================================================
-- BUDDY BATTLE - Daily Cron Jobs
-- Run these with pg_cron or Supabase Edge Functions
-- =====================================================

-- =====================================================
-- 1. DAILY QUEST REFRESH
-- Resets daily quest progress at midnight
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_daily_quests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_daily_quests RECORD;
  v_player RECORD;
BEGIN
  -- Get all daily quests
  FOR v_daily_quests IN 
    SELECT id, required_progress FROM quests WHERE quest_type = 'daily'
  LOOP
    -- Reset progress for all players
    UPDATE player_quests 
    SET 
      current_progress = 0,
      is_completed = FALSE,
      completed_at = NULL,
      updated_at = NOW()
    WHERE quest_id = v_daily_quests.id;
    
    -- Also create quest entries for new players who don't have them
    INSERT INTO player_quests (player_buddy_id, quest_id, current_progress, is_completed)
    SELECT 
      pb.id,
      v_daily_quests.id,
      0,
      FALSE
    FROM player_buddies pb
    WHERE NOT EXISTS (
      SELECT 1 FROM player_quests pq 
      WHERE pq.player_buddy_id = pb.id 
      AND pq.quest_id = v_daily_quests.id
    );
  END LOOP;
  
  -- Log the refresh
  RAISE NOTICE 'Daily quests refreshed at %', NOW();
END;
$$;

-- =====================================================
-- 2. WEEKLY QUEST REFRESH
-- Resets weekly quest progress on Sundays
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_weekly_quests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only run on Sundays (0 = Sunday in PostgreSQL)
  IF EXTRACT(DOW FROM CURRENT_DATE) != 0 THEN
    RAISE NOTICE 'Not Sunday, skipping weekly quest refresh';
    RETURN;
  END IF;

  -- Reset all weekly quests
  UPDATE player_quests pq
  SET 
    current_progress = 0,
    is_completed = FALSE,
    completed_at = NULL,
    updated_at = NOW()
  FROM quests q
  WHERE pq.quest_id = q.id
  AND q.quest_type = 'weekly';
  
  RAISE NOTICE 'Weekly quests refreshed at %', NOW();
END;
$$;

-- =====================================================
-- 3. SHOP ROTATION
-- Rotates featured shop items daily
-- =====================================================

CREATE OR REPLACE FUNCTION rotate_shop_items()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seed INTEGER;
  v_item_ids UUID[];
  v_featured_count INTEGER := 4; -- Number of featured items
BEGIN
  -- Use date as seed for pseudo-random but deterministic selection
  v_seed := EXTRACT(DOY FROM CURRENT_DATE)::INTEGER + EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  
  -- First, unfeatured all items
  UPDATE shop_items SET is_featured = FALSE WHERE is_featured = TRUE;
  
  -- Get all available shop items
  SELECT ARRAY_AGG(id ORDER BY RANDOM()) INTO v_item_ids
  FROM shop_items
  WHERE is_active = TRUE;
  
  -- Feature a rotating selection
  UPDATE shop_items
  SET is_featured = TRUE
  WHERE id = ANY(v_item_ids[1:v_featured_count]);
  
  RAISE NOTICE 'Shop rotation completed at %', NOW();
END;
$$;

-- =====================================================
-- 4. STREAK MAINTENANCE
-- Checks and resets streaks for inactive players
-- =====================================================

CREATE OR REPLACE FUNCTION maintain_streaks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reset streaks for players who missed yesterday
  UPDATE player_buddies pb
  SET 
    streak_current = 0,
    updated_at = NOW()
  WHERE pb.streak_current > 0
  AND NOT EXISTS (
    SELECT 1 FROM point_transactions pt
    WHERE pt.player_buddy_id = pb.id
    AND pt.source = 'availability'
    AND pt.created_at >= CURRENT_DATE - INTERVAL '1 day'
    AND pt.created_at < CURRENT_DATE
  );
  
  -- Update highest streak if needed
  UPDATE player_buddies
  SET 
    streak_highest = streak_current,
    updated_at = NOW()
  WHERE streak_current > streak_highest;
  
  RAISE NOTICE 'Streak maintenance completed at %', NOW();
END;
$$;

-- =====================================================
-- 5. QUARTERLY BOSS SPAWN
-- Activates the quarterly boss battle
-- =====================================================

CREATE OR REPLACE FUNCTION spawn_quarterly_boss()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quarter INTEGER;
  v_year INTEGER;
  v_boss_name TEXT;
BEGIN
  v_quarter := EXTRACT(QUARTER FROM CURRENT_DATE)::INTEGER;
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  
  -- Boss name varies by quarter
  v_boss_name := CASE v_quarter
    WHEN 1 THEN 'Marie-Françoise van de Vorst ❄️'
    WHEN 2 THEN 'Marie-Françoise de Bloesem 🌸'
    WHEN 3 THEN 'Marie-Françoise van de Zon ☀️'
    WHEN 4 THEN 'Marie-Françoise van de Herfst 🍂'
  END;
  
  -- Create boss battle event
  INSERT INTO buddy_battle_notifications (
    user_id,
    type,
    title,
    message,
    data,
    is_global
  )
  SELECT DISTINCT 
    user_id,
    'boss_spawn',
    '🏆 QUARTERLY BOSS APPEARED!',
    v_boss_name || ' has appeared! Defeat her before the quarter ends!',
    jsonb_build_object(
      'boss_name', v_boss_name,
      'quarter', v_quarter,
      'year', v_year,
      'hp', 500,
      'level', 50
    ),
    TRUE
  FROM player_buddies
  LIMIT 1; -- Only insert once (is_global = true)
  
  RAISE NOTICE 'Quarterly boss spawned: %', v_boss_name;
END;
$$;

-- =====================================================
-- 6. CLEANUP OLD DATA
-- Removes old notifications and battle logs
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_notifications INTEGER;
  v_deleted_battles INTEGER;
BEGIN
  -- Delete read notifications older than 30 days
  DELETE FROM buddy_battle_notifications
  WHERE is_read = TRUE
  AND created_at < CURRENT_DATE - INTERVAL '30 days';
  GET DIAGNOSTICS v_deleted_notifications = ROW_COUNT;
  
  -- Delete battle logs older than 90 days
  DELETE FROM battle_logs
  WHERE created_at < CURRENT_DATE - INTERVAL '90 days';
  GET DIAGNOSTICS v_deleted_battles = ROW_COUNT;
  
  RAISE NOTICE 'Cleanup completed: % notifications, % battle logs deleted', 
    v_deleted_notifications, v_deleted_battles;
END;
$$;

-- =====================================================
-- 7. COMBINED DAILY JOB
-- Single function to run all daily maintenance
-- =====================================================

CREATE OR REPLACE FUNCTION run_daily_maintenance()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb := '{}'::jsonb;
BEGIN
  -- Refresh daily quests
  PERFORM refresh_daily_quests();
  v_result := v_result || '{"daily_quests": "refreshed"}'::jsonb;
  
  -- Check weekly quests (only runs on Sunday)
  PERFORM refresh_weekly_quests();
  v_result := v_result || '{"weekly_quests": "checked"}'::jsonb;
  
  -- Rotate shop
  PERFORM rotate_shop_items();
  v_result := v_result || '{"shop": "rotated"}'::jsonb;
  
  -- Maintain streaks
  PERFORM maintain_streaks();
  v_result := v_result || '{"streaks": "maintained"}'::jsonb;
  
  -- Cleanup old data
  PERFORM cleanup_old_data();
  v_result := v_result || '{"cleanup": "completed"}'::jsonb;
  
  -- Check for quarterly boss spawn (first day of quarter)
  IF EXTRACT(DAY FROM CURRENT_DATE) = 1 AND 
     EXTRACT(MONTH FROM CURRENT_DATE) IN (1, 4, 7, 10) THEN
    PERFORM spawn_quarterly_boss();
    v_result := v_result || '{"quarterly_boss": "spawned"}'::jsonb;
  END IF;
  
  v_result := v_result || jsonb_build_object('completed_at', NOW());
  
  RETURN v_result;
END;
$$;

-- =====================================================
-- SCHEDULING WITH PG_CRON (if available)
-- =====================================================

-- Enable pg_cron extension (Supabase has this)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily maintenance at 00:05 UTC
-- SELECT cron.schedule(
--   'buddy-battle-daily-maintenance',
--   '5 0 * * *',
--   'SELECT run_daily_maintenance()'
-- );

-- =====================================================
-- ALTERNATIVE: Supabase Edge Function Trigger
-- =====================================================

-- Create an API endpoint for external cron services
CREATE OR REPLACE FUNCTION api_run_daily_maintenance(api_key TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_valid_key TEXT;
BEGIN
  -- Get the secret key from vault (or use environment variable)
  SELECT decrypted_secret INTO v_valid_key 
  FROM vault.decrypted_secrets 
  WHERE name = 'BUDDY_BATTLE_CRON_KEY'
  LIMIT 1;
  
  -- Fallback to a simple check if vault is not set up
  IF v_valid_key IS NULL THEN
    v_valid_key := current_setting('app.cron_key', TRUE);
  END IF;
  
  -- Validate API key
  IF api_key IS NULL OR api_key != v_valid_key THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Invalid API key'
    );
  END IF;
  
  -- Run maintenance
  RETURN jsonb_build_object(
    'success', TRUE,
    'result', run_daily_maintenance()
  );
END;
$$;

-- Grant execute to authenticated users (for Edge Function)
GRANT EXECUTE ON FUNCTION api_run_daily_maintenance(TEXT) TO authenticated;

-- =====================================================
-- HELPER: Get level from XP (used in hooks)
-- =====================================================

CREATE OR REPLACE FUNCTION get_level_for_xp(xp_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_level INTEGER := 1;
BEGIN
  SELECT level INTO v_level
  FROM level_thresholds
  WHERE required_xp <= xp_amount
  ORDER BY level DESC
  LIMIT 1;
  
  RETURN COALESCE(v_level, 1);
END;
$$;

-- =====================================================
-- HELPER: Award streak bonus
-- =====================================================

CREATE OR REPLACE FUNCTION award_streak_bonus(p_player_buddy_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_streak INTEGER;
  v_bonus INTEGER := 0;
BEGIN
  SELECT streak_current INTO v_streak
  FROM player_buddies
  WHERE id = p_player_buddy_id;
  
  -- Calculate bonus based on streak length
  v_bonus := CASE
    WHEN v_streak >= 30 THEN 10  -- 30+ day streak
    WHEN v_streak >= 14 THEN 5   -- 14+ day streak
    WHEN v_streak >= 7 THEN 3    -- 7+ day streak
    WHEN v_streak >= 3 THEN 1    -- 3+ day streak
    ELSE 0
  END;
  
  IF v_bonus > 0 THEN
    -- Add bonus coins
    UPDATE player_buddies
    SET coins = coins + v_bonus,
        total_points = total_points + v_bonus
    WHERE id = p_player_buddy_id;
    
    -- Log the bonus
    INSERT INTO point_transactions (player_buddy_id, amount, source, description)
    VALUES (p_player_buddy_id, v_bonus, 'streak_bonus', 
            'Streak bonus for ' || v_streak || ' day streak');
  END IF;
  
  RETURN v_bonus;
END;
$$;

COMMENT ON FUNCTION run_daily_maintenance() IS 'Main daily maintenance job for Buddy Battle. Run at midnight.';
COMMENT ON FUNCTION api_run_daily_maintenance(TEXT) IS 'API endpoint for external cron services. Requires valid API key.';
