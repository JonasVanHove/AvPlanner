-- Schedule daily badge refresh using pg_cron
-- Run this in the Supabase SQL Editor AFTER enabling the pg_cron extension.
-- Idempotent: will create or replace existing job named 'daily-badge-refresh'.

-- 1. Enable pg_cron extension if not yet enabled (run separately if needed):
--    CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. (Optional) Remove existing job with same name (if reconfiguring time)
-- 2b. Unschedule existing job (safe, ignores if none)
WITH existing AS (
  SELECT jobid FROM cron.job WHERE jobname = 'daily-badge-refresh'
)
SELECT cron.unschedule(jobid) FROM existing;

-- 3. Schedule new job at 02:00 daily (UTC)
SELECT cron.schedule('daily-badge-refresh','0 2 * * *','SELECT public.daily_badge_refresh()');

-- 4. Verify
SELECT jobid, jobname, schedule, command, nodename, nodeport
FROM cron.job
WHERE jobname = 'daily-badge-refresh';

-- 5. To run immediately for testing:
--    SELECT public.daily_badge_refresh();

-- 6. To unschedule later:
--    SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'daily-badge-refresh';
