-- Clean up old activity tracking approach and implement new availability-based tracking

-- Drop old activity tracking table if it exists
DROP TABLE IF EXISTS availability_activities CASCADE;

-- Remove any old functions
DROP FUNCTION IF EXISTS log_availability_change CASCADE;
DROP FUNCTION IF EXISTS get_team_activities CASCADE;

-- Now run the new schema from availability_activities_schema.sql