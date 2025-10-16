-- Extended Supabase RPC Functions for AvPlanner
-- This file creates ALL missing database functions referenced in the application

-- Drop existing functions first to avoid conflicts
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

-- 1. Team creation with creator
CREATE OR REPLACE FUNCTION create_team_with_creator(
    team_name text,
    creator_email text,
    team_password text DEFAULT NULL,
    team_slug text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
    new_team_id uuid;
    creator_user_id uuid;
    team_invite_code text;
    result json;
BEGIN
    -- Generate unique invite code
    team_invite_code := substr(md5(random()::text), 1, 8);
    
    -- Get creator user ID
    SELECT id INTO creator_user_id FROM auth.users WHERE email = creator_email;
    
    -- Create team
    INSERT INTO teams (name, slug, invite_code, created_by, is_password_protected, password_hash)
    VALUES (
        team_name,
        COALESCE(team_slug, lower(replace(team_name, ' ', '-'))),
        team_invite_code,
        creator_user_id,
        team_password IS NOT NULL,
        CASE WHEN team_password IS NOT NULL THEN crypt(team_password, gen_salt('bf')) ELSE NULL END
    ) RETURNING id INTO new_team_id;
    
    -- Add creator as admin member
    INSERT INTO members (team_id, first_name, email, auth_user_id, role)
    VALUES (
        new_team_id,
        COALESCE((SELECT raw_user_meta_data->>'first_name' FROM auth.users WHERE id = creator_user_id), split_part(creator_email, '@', 1)),
        creator_email,
        creator_user_id,
        'admin'
    );
    
    RETURN json_build_object(
        'success', true,
        'team_id', new_team_id,
        'invite_code', team_invite_code
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update user profile
CREATE OR REPLACE FUNCTION update_user_profile(
    user_email text,
    new_first_name text,
    new_last_name text DEFAULT NULL,
    new_profile_image text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
    updated_count integer := 0;
BEGIN
    -- Update all member records for this user
    UPDATE members 
    SET 
        first_name = new_first_name,
        last_name = new_last_name,
        profile_image = new_profile_image,
        last_active = now()
    WHERE email = user_email OR auth_user_id = (SELECT id FROM auth.users WHERE email = user_email);
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN json_build_object(
        'success', true,
        'updated_records', updated_count
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Get user profile
CREATE OR REPLACE FUNCTION get_user_profile(user_email text)
RETURNS json AS $$
DECLARE
    user_data json;
BEGIN
    SELECT json_build_object(
        'email', u.email,
        'first_name', COALESCE(m.first_name, u.raw_user_meta_data->>'first_name'),
        'last_name', COALESCE(m.last_name, u.raw_user_meta_data->>'last_name'),
        'profile_image', m.profile_image,
        'created_at', u.created_at,
        'last_active', m.last_active
    ) INTO user_data
    FROM auth.users u
    LEFT JOIN members m ON u.id = m.auth_user_id AND m.status = 'active'
    WHERE u.email = user_email
    LIMIT 1;
    
    RETURN COALESCE(user_data, json_build_object('error', 'User not found'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Leave team function
CREATE OR REPLACE FUNCTION leave_team(user_email text, team_id_param uuid)
RETURNS json AS $$
DECLARE
    member_count integer;
BEGIN
    -- Check if user is member of the team
    IF NOT EXISTS (
        SELECT 1 FROM members m
        JOIN auth.users u ON m.auth_user_id = u.id
        WHERE u.email = user_email AND m.team_id = team_id_param AND m.status = 'active'
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Not a member of this team');
    END IF;
    
    -- Update member status to 'left'
    UPDATE members 
    SET status = 'left', last_active = now()
    WHERE team_id = team_id_param 
    AND auth_user_id = (SELECT id FROM auth.users WHERE email = user_email);
    
    -- Check remaining active members
    SELECT COUNT(*) INTO member_count
    FROM members 
    WHERE team_id = team_id_param AND status = 'active';
    
    -- If no active members left, archive the team
    IF member_count = 0 THEN
        UPDATE teams 
        SET status = 'archived', archived_at = now(), archived_by = user_email
        WHERE id = team_id_param;
    END IF;
    
    RETURN json_build_object('success', true, 'remaining_members', member_count);
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Toggle team status
CREATE OR REPLACE FUNCTION toggle_team_status(team_id_param uuid, new_status text)
RETURNS json AS $$
BEGIN
    UPDATE teams 
    SET 
        status = new_status,
        archived_at = CASE WHEN new_status = 'archived' THEN now() ELSE NULL END
    WHERE id = team_id_param;
    
    RETURN json_build_object('success', true, 'new_status', new_status);
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Move member up in order
CREATE OR REPLACE FUNCTION move_member_up(member_id_param uuid)
RETURNS json AS $$
DECLARE
    current_order integer;
    team_id_param uuid;
    prev_member_id uuid;
BEGIN
    -- Get current member order and team
    SELECT order_index, team_id INTO current_order, team_id_param
    FROM members WHERE id = member_id_param;
    
    -- Find previous member
    SELECT id INTO prev_member_id
    FROM members 
    WHERE team_id = team_id_param 
    AND order_index < current_order 
    AND status = 'active'
    ORDER BY order_index DESC 
    LIMIT 1;
    
    IF prev_member_id IS NOT NULL THEN
        -- Swap order indices
        UPDATE members SET order_index = current_order WHERE id = prev_member_id;
        UPDATE members SET order_index = current_order - 1 WHERE id = member_id_param;
    END IF;
    
    RETURN json_build_object('success', true);
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Move member down in order
CREATE OR REPLACE FUNCTION move_member_down(member_id_param uuid)
RETURNS json AS $$
DECLARE
    current_order integer;
    team_id_param uuid;
    next_member_id uuid;
BEGIN
    -- Get current member order and team
    SELECT order_index, team_id INTO current_order, team_id_param
    FROM members WHERE id = member_id_param;
    
    -- Find next member
    SELECT id INTO next_member_id
    FROM members 
    WHERE team_id = team_id_param 
    AND order_index > current_order 
    AND status = 'active'
    ORDER BY order_index ASC 
    LIMIT 1;
    
    IF next_member_id IS NOT NULL THEN
        -- Swap order indices
        UPDATE members SET order_index = current_order WHERE id = next_member_id;
        UPDATE members SET order_index = current_order + 1 WHERE id = member_id_param;
    END IF;
    
    RETURN json_build_object('success', true);
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Get team members
CREATE OR REPLACE FUNCTION get_team_members(team_id_param uuid)
RETURNS TABLE(
    member_id uuid,
    first_name text,
    last_name text,
    email text,
    role text,
    status text,
    profile_image text,
    last_active timestamptz,
    order_index integer,
    auth_user_id uuid
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.first_name,
        m.last_name,
        m.email,
        m.role,
        m.status,
        m.profile_image,
        m.last_active,
        m.order_index,
        m.auth_user_id
    FROM members m
    WHERE m.team_id = team_id_param
    AND m.status = 'active'
    ORDER BY m.order_index, m.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Get team upcoming holidays
CREATE OR REPLACE FUNCTION get_team_upcoming_holidays(
    team_id_param uuid,
    days_ahead integer DEFAULT 30
)
RETURNS TABLE(
    holiday_date date,
    holiday_name text,
    country_code text,
    is_official boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.date,
        h.name,
        h.country_code,
        h.is_official
    FROM holidays h
    WHERE h.date BETWEEN CURRENT_DATE AND (CURRENT_DATE + days_ahead)
    AND h.country_code IN (
        SELECT DISTINCT m.country_code 
        FROM members m 
        WHERE m.team_id = team_id_param AND m.status = 'active'
    )
    ORDER BY h.date, h.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Get team members with roles (admin function)
CREATE OR REPLACE FUNCTION get_team_members_with_roles(team_id_param uuid)
RETURNS TABLE(
    member_id uuid,
    first_name text,
    last_name text,
    email text,
    role text,
    status text,
    created_at timestamptz,
    last_active timestamptz,
    auth_user_id uuid
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.first_name,
        m.last_name,
        m.email,
        m.role,
        m.status,
        m.created_at,
        m.last_active,
        m.auth_user_id
    FROM members m
    WHERE m.team_id = team_id_param
    ORDER BY m.role DESC, m.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;