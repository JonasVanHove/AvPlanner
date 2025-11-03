-- Admin Functions for AvPlanner
-- These functions are used by the admin dashboard and admin components

-- Drop existing admin functions first to avoid conflicts
DROP FUNCTION IF EXISTS get_all_teams_admin(text);
DROP FUNCTION IF EXISTS get_admin_users(text);
DROP FUNCTION IF EXISTS delete_team_admin(text, uuid);
DROP FUNCTION IF EXISTS get_database_statistics(text);
DROP FUNCTION IF EXISTS get_all_teams_detailed(text);
DROP FUNCTION IF EXISTS get_all_users_admin(text);

-- 1. Get all teams for admin overview
CREATE OR REPLACE FUNCTION get_all_teams_admin(admin_email text)
RETURNS TABLE(
    team_id uuid,
    team_name text,
    team_slug text,
    team_invite_code text,
    team_status text,
    created_at timestamptz,
    member_count bigint,
    admin_count bigint,
    recent_activity_count bigint
) AS $$
BEGIN
    -- Check if user is admin
    IF NOT (SELECT is_user_admin(admin_email)) THEN
        RAISE EXCEPTION 'Access denied: User is not an admin';
    END IF;
    
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.slug,
        t.invite_code,
        t.status,
        t.created_at,
        (SELECT COUNT(*) FROM members m WHERE m.team_id = t.id AND m.status = 'active') as member_count,
        (SELECT COUNT(*) FROM members m WHERE m.team_id = t.id AND m.status = 'active' AND m.role = 'admin') as admin_count,
        (SELECT COUNT(*) FROM availability a 
         JOIN members m ON a.member_id = m.id 
         WHERE m.team_id = t.id AND a.created_at > now() - interval '7 days') as recent_activity_count
    FROM teams t
    ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Get admin users
CREATE OR REPLACE FUNCTION get_admin_users(admin_email text)
RETURNS TABLE(
    user_id uuid,
    user_email text,
    first_name text,
    last_name text,
    created_at timestamptz,
    team_count bigint
) AS $$
BEGIN
    -- Check if user is admin
    IF NOT (SELECT is_user_admin(admin_email)) THEN
        RAISE EXCEPTION 'Access denied: User is not an admin';
    END IF;
    
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        COALESCE(m.first_name, u.raw_user_meta_data->>'first_name') as first_name,
        COALESCE(m.last_name, u.raw_user_meta_data->>'last_name') as last_name,
        u.created_at,
        COUNT(DISTINCT m.team_id) as team_count
    FROM auth.users u
    LEFT JOIN members m ON u.id = m.auth_user_id AND m.status = 'active'
    WHERE u.email IN (
        'jonas@vanhove.be',
        'admin@avplanner.com', 
        'jovanhove@gmail.com'
    )
    OR EXISTS (
        SELECT 1 FROM members m2 
        WHERE m2.auth_user_id = u.id 
        AND m2.role = 'admin' 
        AND m2.status = 'active'
    )
    GROUP BY u.id, u.email, m.first_name, m.last_name, u.created_at, u.raw_user_meta_data
    ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Delete team (admin function)
CREATE OR REPLACE FUNCTION delete_team_admin(
    admin_email text,
    team_id_param uuid
)
RETURNS json AS $$
BEGIN
    -- Check if user is admin
    IF NOT (SELECT is_user_admin(admin_email)) THEN
        RETURN json_build_object('success', false, 'error', 'Access denied: User is not an admin');
    END IF;
    
    -- Delete availability records first (cascade)
    DELETE FROM availability 
    WHERE member_id IN (SELECT id FROM members WHERE team_id = team_id_param);
    
    -- Delete members
    DELETE FROM members WHERE team_id = team_id_param;
    
    -- Delete team
    DELETE FROM teams WHERE id = team_id_param;
    
    RETURN json_build_object('success', true, 'message', 'Team deleted successfully');
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Get database statistics
CREATE OR REPLACE FUNCTION get_database_statistics(admin_email text)
RETURNS json AS $$
DECLARE
    stats json;
BEGIN
    -- Check if user is admin
    IF NOT (SELECT is_user_admin(admin_email)) THEN
        RAISE EXCEPTION 'Access denied: User is not an admin';
    END IF;
    
    SELECT json_build_object(
        'total_teams', (SELECT COUNT(*) FROM teams WHERE status = 'active'),
        'total_members', (SELECT COUNT(*) FROM members WHERE status = 'active'),
        'total_users', (SELECT COUNT(*) FROM auth.users),
        'total_availability_records', (SELECT COUNT(*) FROM availability),
        'active_teams_last_week', (
            SELECT COUNT(DISTINCT t.id) 
            FROM teams t
            JOIN members m ON t.id = m.team_id
            JOIN availability a ON m.id = a.member_id
            WHERE a.created_at > now() - interval '7 days'
            AND t.status = 'active'
        ),
        'new_teams_this_month', (
            SELECT COUNT(*) FROM teams 
            WHERE created_at > date_trunc('month', now())
            AND status = 'active'
        )
    ) INTO stats;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Get all teams detailed (for admin database overview)
CREATE OR REPLACE FUNCTION get_all_teams_detailed(admin_email text)
RETURNS TABLE(
    team_id uuid,
    team_name text,
    team_slug text,
    invite_code text,
    status text,
    created_at timestamptz,
    created_by_email text,
    member_count bigint,
    admin_members text[],
    last_activity timestamptz
) AS $$
BEGIN
    -- Check if user is admin
    IF NOT (SELECT is_user_admin(admin_email)) THEN
        RAISE EXCEPTION 'Access denied: User is not an admin';
    END IF;
    
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.slug,
        t.invite_code,
        t.status,
        t.created_at,
        creator.email as created_by_email,
        (SELECT COUNT(*) FROM members m WHERE m.team_id = t.id AND m.status = 'active') as member_count,
        ARRAY(
            SELECT m.email 
            FROM members m 
            WHERE m.team_id = t.id 
            AND m.role = 'admin' 
            AND m.status = 'active'
        ) as admin_members,
        (SELECT MAX(a.created_at) 
         FROM availability a 
         JOIN members m ON a.member_id = m.id 
         WHERE m.team_id = t.id) as last_activity
    FROM teams t
    LEFT JOIN auth.users creator ON t.created_by = creator.id
    ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Get all users for admin overview
CREATE OR REPLACE FUNCTION get_all_users_admin(admin_email text)
RETURNS TABLE(
    user_id uuid,
    email text,
    created_at timestamptz,
    last_sign_in_at timestamptz,
    team_count bigint,
    is_admin boolean,
    member_names text[]
) AS $$
BEGIN
    -- Check if user is admin
    IF NOT (SELECT is_user_admin(admin_email)) THEN
        RAISE EXCEPTION 'Access denied: User is not an admin';
    END IF;
    
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.created_at,
        u.last_sign_in_at,
        COUNT(DISTINCT m.team_id) as team_count,
        (SELECT is_user_admin(u.email)) as is_admin,
        ARRAY_AGG(DISTINCT (m.first_name || COALESCE(' ' || m.last_name, ''))) FILTER (WHERE m.id IS NOT NULL) as member_names
    FROM auth.users u
    LEFT JOIN members m ON u.id = m.auth_user_id AND m.status = 'active'
    GROUP BY u.id, u.email, u.created_at, u.last_sign_in_at
    ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_all_teams_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_users(text) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_team_admin(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_database_statistics(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_teams_detailed(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_users_admin(text) TO authenticated;