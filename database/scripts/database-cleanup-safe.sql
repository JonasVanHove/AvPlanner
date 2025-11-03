-- Safe Database Cleanup Script
-- This version is more careful with constraints and dependencies

-- Option 1: Try to drop constraint first, then function
DO $$
BEGIN
    -- Try to drop the constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'valid_profile_image_url' 
               AND table_name = 'members') THEN
        ALTER TABLE members DROP CONSTRAINT valid_profile_image_url;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'members_profile_image_url_check' 
               AND table_name = 'members') THEN
        ALTER TABLE members DROP CONSTRAINT members_profile_image_url_check;
    END IF;
END $$;

-- Now drop all functions safely
DROP FUNCTION IF EXISTS is_user_admin(text) CASCADE;
DROP FUNCTION IF EXISTS is_user_admin(admin_email text) CASCADE;
DROP FUNCTION IF EXISTS manual_link_auth_user(text) CASCADE;
DROP FUNCTION IF EXISTS get_user_teams(text) CASCADE;
DROP FUNCTION IF EXISTS get_user_teams_with_status(text) CASCADE;
DROP FUNCTION IF EXISTS validate_profile_image_url(text) CASCADE;

-- Drop extended functions
DROP FUNCTION IF EXISTS create_team_with_creator(text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS update_user_profile(text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS get_user_profile(text) CASCADE;
DROP FUNCTION IF EXISTS leave_team(text, uuid) CASCADE;
DROP FUNCTION IF EXISTS toggle_team_status(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS move_member_up(uuid) CASCADE;
DROP FUNCTION IF EXISTS move_member_down(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_team_members(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_team_upcoming_holidays(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS get_team_members_with_roles(uuid) CASCADE;

-- Drop admin functions
DROP FUNCTION IF EXISTS get_all_teams_admin(text) CASCADE;
DROP FUNCTION IF EXISTS get_admin_users(text) CASCADE;
DROP FUNCTION IF EXISTS delete_team_admin(text, uuid) CASCADE;
DROP FUNCTION IF EXISTS get_database_statistics(text) CASCADE;
DROP FUNCTION IF EXISTS get_all_teams_detailed(text) CASCADE;
DROP FUNCTION IF EXISTS get_all_users_admin(text) CASCADE;

-- Drop any other variations that might exist
DROP FUNCTION IF EXISTS is_user_admin() CASCADE;
DROP FUNCTION IF EXISTS manual_link_auth_user() CASCADE;
DROP FUNCTION IF EXISTS get_user_teams() CASCADE;

SELECT 'All functions and dependent objects dropped successfully' as result;