-- Missing Supabase RPC Functions for AvPlanner
-- This file creates the database functions that are referenced in the application

-- Drop existing functions first to avoid parameter conflicts
-- First drop the constraint that depends on validate_profile_image_url
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_profile_image_url_check;
ALTER TABLE members DROP CONSTRAINT IF EXISTS valid_profile_image_url;

-- Now drop the functions
DROP FUNCTION IF EXISTS is_user_admin(text);
DROP FUNCTION IF EXISTS manual_link_auth_user(text);
DROP FUNCTION IF EXISTS get_user_teams(text);
DROP FUNCTION IF EXISTS get_user_teams_with_status(text);
DROP FUNCTION IF EXISTS validate_profile_image_url(text);

-- 1. Function to check if a user is an admin
-- This function checks if a user has admin privileges based on their email or role
CREATE OR REPLACE FUNCTION is_user_admin(user_email text)
RETURNS boolean AS $$
DECLARE
    is_admin boolean := false;
BEGIN
    -- Check if user exists as a member with admin role in any team
    SELECT EXISTS(
        SELECT 1 
        FROM members m
        JOIN auth.users u ON m.auth_user_id = u.id
        WHERE u.email = user_email 
        AND m.role = 'admin'
        AND m.status = 'active'
    ) INTO is_admin;
    
    -- If not found as admin member, check if user email matches predefined admin emails
    -- You can modify this list based on your admin requirements
    IF NOT is_admin THEN
        SELECT user_email IN (
            'jonas@vanhove.be',
            'admin@avplanner.com',
            'jovanhove@gmail.com'
            -- Add more admin emails as needed
        ) INTO is_admin;
    END IF;
    
    RETURN is_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to manually link an authenticated user to existing member records
-- This is used when a user signs up and we need to link them to existing team members
CREATE OR REPLACE FUNCTION manual_link_auth_user(user_email text)
RETURNS json AS $$
DECLARE
    auth_user_record auth.users%ROWTYPE;
    linked_count integer := 0;
    result json;
BEGIN
    -- Get the authenticated user
    SELECT * INTO auth_user_record
    FROM auth.users
    WHERE email = user_email;
    
    -- If user doesn't exist, return error
    IF auth_user_record.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found',
            'linked_count', 0
        );
    END IF;
    
    -- Update members table to link auth_user_id where email matches and auth_user_id is null
    UPDATE members 
    SET 
        auth_user_id = auth_user_record.id,
        last_active = now()
    WHERE 
        email = user_email 
        AND auth_user_id IS NULL
        AND status = 'active';
    
    GET DIAGNOSTICS linked_count = ROW_COUNT;
    
    -- Return result
    RETURN json_build_object(
        'success', true,
        'linked_count', linked_count,
        'user_id', auth_user_record.id
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'linked_count', 0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to get all teams for a user based on their email
-- This returns teams where the user is a member
CREATE OR REPLACE FUNCTION get_user_teams(user_email text)
RETURNS TABLE(
    team_id uuid,
    team_name text,
    team_slug text,
    team_invite_code text,
    team_created_at timestamptz,
    member_id uuid,
    member_role text,
    member_status text,
    member_first_name text,
    member_last_name text,
    member_last_active timestamptz,
    team_password_protected boolean,
    team_status text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id as team_id,
        t.name as team_name,
        t.slug as team_slug,
        t.invite_code as team_invite_code,
        t.created_at as team_created_at,
        m.id as member_id,
        m.role as member_role,
        m.status as member_status,
        m.first_name as member_first_name,
        m.last_name as member_last_name,
        m.last_active as member_last_active,
        t.is_password_protected as team_password_protected,
        t.status as team_status
    FROM teams t
    JOIN members m ON t.id = m.team_id
    JOIN auth.users u ON m.auth_user_id = u.id
    WHERE u.email = user_email
    AND t.status = 'active'
    AND m.status = 'active'
    ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to get user teams with additional status information
-- This is used by the user-teams-overview component
CREATE OR REPLACE FUNCTION get_user_teams_with_status(user_email text)
RETURNS TABLE(
    team_id uuid,
    team_name text,
    team_slug text,
    team_invite_code text,
    team_created_at timestamptz,
    member_id uuid,
    member_role text,
    member_status text,
    member_first_name text,
    member_last_name text,
    member_last_active timestamptz,
    team_password_protected boolean,
    team_status text,
    member_count bigint,
    recent_activity_count bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id as team_id,
        t.name as team_name,
        t.slug as team_slug,
        t.invite_code as team_invite_code,
        t.created_at as team_created_at,
        m.id as member_id,
        m.role as member_role,
        m.status as member_status,
        m.first_name as member_first_name,
        m.last_name as member_last_name,
        m.last_active as member_last_active,
        t.is_password_protected as team_password_protected,
        t.status as team_status,
        (SELECT COUNT(*) FROM members m2 WHERE m2.team_id = t.id AND m2.status = 'active') as member_count,
        (SELECT COUNT(*) FROM availability a WHERE a.member_id IN 
            (SELECT m3.id FROM members m3 WHERE m3.team_id = t.id) 
            AND a.created_at > now() - interval '7 days') as recent_activity_count
    FROM teams t
    JOIN members m ON t.id = m.team_id
    JOIN auth.users u ON m.auth_user_id = u.id
    WHERE u.email = user_email
    AND t.status = 'active'
    AND m.status = 'active'
    ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Helper function to validate profile image URLs (referenced in members table constraint)
CREATE OR REPLACE FUNCTION validate_profile_image_url(url text)
RETURNS boolean AS $$
BEGIN
    -- Basic URL validation for profile images
    IF url IS NULL THEN
        RETURN true;
    END IF;
    
    -- Check if it's a valid HTTP/HTTPS URL or a Supabase storage URL
    RETURN url ~ '^https?://.*\.(jpg|jpeg|png|gif|webp)(\?.*)?$'
        OR url ~ '^https://.*\.supabase\.co/storage/.*';
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION is_user_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION manual_link_auth_user(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_teams(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_teams_with_status(text) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_profile_image_url(text) TO authenticated;

-- Also grant to anon for public access where needed
GRANT EXECUTE ON FUNCTION validate_profile_image_url(text) TO anon;

-- Re-add the constraint that uses the validate_profile_image_url function
ALTER TABLE members ADD CONSTRAINT members_profile_image_url_check 
    CHECK (validate_profile_image_url(profile_image_url));