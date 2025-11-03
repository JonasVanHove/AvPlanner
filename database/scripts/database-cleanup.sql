-- Drop All Existing Functions First
-- Run this script first if you get parameter conflicts or need to clean up

-- First drop constraints that depend on functions
ALTER TABLE members DROP CONSTRAINT IF EXISTS valid_profile_image_url;
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_profile_image_url_check;

-- Drop basic functions
DROP FUNCTION IF EXISTS is_user_admin(text);
DROP FUNCTION IF EXISTS is_user_admin(admin_email text);
DROP FUNCTION IF EXISTS manual_link_auth_user(text);
DROP FUNCTION IF EXISTS get_user_teams(text);
DROP FUNCTION IF EXISTS get_user_teams_with_status(text);
DROP FUNCTION IF EXISTS validate_profile_image_url(text) CASCADE;

-- Drop extended functions
DROP FUNCTION IF EXISTS create_team_with_creator(text, text, text, text);
DROP FUNCTION IF EXISTS update_user_profile(text, text, text, text);
DROP FUNCTION IF EXISTS get_user_profile(text);
DROP FUNCTION IF EXISTS leave_team(text, uuid);
DROP FUNCTION IF EXISTS toggle_team_status(uuid, text);
DROP FUNCTION IF EXISTS move_member_up(uuid);
DROP FUNCTION IF EXISTS move_member_down(uuid);
DROP FUNCTION IF EXISTS get_team_members(uuid);
DROP FUNCTION IF EXISTS get_team_upcoming_holidays(uuid, integer);
DROP FUNCTION IF EXISTS get_team_members_with_roles(uuid);

-- Drop admin functions
DROP FUNCTION IF EXISTS get_all_teams_admin(text);
DROP FUNCTION IF EXISTS get_admin_users(text);
DROP FUNCTION IF EXISTS delete_team_admin(text, uuid);
DROP FUNCTION IF EXISTS get_database_statistics(text);
DROP FUNCTION IF EXISTS get_all_teams_detailed(text);
DROP FUNCTION IF EXISTS get_all_users_admin(text);

-- Drop any other variations that might exist
DROP FUNCTION IF EXISTS is_user_admin();
DROP FUNCTION IF EXISTS manual_link_auth_user();
DROP FUNCTION IF EXISTS get_user_teams();

SELECT 'All functions dropped successfully' as result;