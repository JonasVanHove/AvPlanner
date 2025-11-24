-- Schedule Daily Badge Refresh with pg_cron
-- This ensures badges are recalculated daily even if triggers miss something
-- Run this script ONCE in Supabase SQL Editor after enabling pg_cron extension

-- Enable pg_cron extension (requires superuser/admin)
-- NOTE: This may already be enabled in Supabase, but this ensures it
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule daily badge refresh at 2:00 AM UTC
-- This will run the daily_badge_refresh function every day
SELECT cron.schedule(
  'daily-badge-refresh',           -- Job name
  '0 2 * * *',                      -- Cron expression: 2:00 AM every day
  $$SELECT daily_badge_refresh()$$  -- SQL command to run
);

-- Verify the scheduled job
SELECT * FROM cron.job WHERE jobname = 'daily-badge-refresh';

-- To manually unschedule (if needed):
-- SELECT cron.unschedule('daily-badge-refresh');

-- To manually run the refresh now (for testing):
-- SELECT daily_badge_refresh();
