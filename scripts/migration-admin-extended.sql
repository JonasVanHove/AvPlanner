-- Execute this extended admin migration on your production Supabase database
-- This adds comprehensive admin functions for database overview and team management

-- First, add status column to teams table if it doesn't exist
ALTER TABLE teams ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived'));
ALTER TABLE teams ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_teams_status ON teams(status);
CREATE INDEX IF NOT EXISTS idx_teams_archived_at ON teams(archived_at) WHERE archived_at IS NOT NULL;

-- Function to get comprehensive database statistics
CREATE OR REPLACE FUNCTION get_database_statistics(user_email TEXT)
RETURNS TABLE(
    total_users BIGINT,
    total_teams BIGINT,
    active_teams BIGINT,
    inactive_teams BIGINT,
    archived_teams BIGINT,
    total_members BIGINT,
    active_members BIGINT,
    inactive_members BIGINT,
    left_members BIGINT,
    total_admins BIGINT,
    recent_signups BIGINT,
    recent_teams BIGINT,
    password_protected_teams BIGINT,
    teams_with_availability BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM admin_users 
        WHERE email = user_email AND is_admin = true
    ) THEN
        RAISE EXCEPTION 'Access denied: User is not an admin';
    END IF;
    
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM auth.users)::BIGINT as total_users,
        (SELECT COUNT(*) FROM teams)::BIGINT as total_teams,
        (SELECT COUNT(*) FROM teams WHERE status = 'active')::BIGINT as active_teams,
        (SELECT COUNT(*) FROM teams WHERE status = 'inactive')::BIGINT as inactive_teams,
        (SELECT COUNT(*) FROM teams WHERE status = 'archived')::BIGINT as archived_teams,
        (SELECT COUNT(*) FROM members)::BIGINT as total_members,
        (SELECT COUNT(*) FROM members WHERE status = 'active')::BIGINT as active_members,
        (SELECT COUNT(*) FROM members WHERE status = 'inactive')::BIGINT as inactive_members,
        (SELECT COUNT(*) FROM members WHERE status = 'left')::BIGINT as left_members,
        (SELECT COUNT(*) FROM admin_users WHERE is_admin = true)::BIGINT as total_admins,
        (SELECT COUNT(*) FROM auth.users WHERE created_at >= NOW() - INTERVAL '7 days')::BIGINT as recent_signups,
        (SELECT COUNT(*) FROM teams WHERE created_at >= NOW() - INTERVAL '7 days')::BIGINT as recent_teams,
        (SELECT COUNT(*) FROM teams WHERE is_password_protected = true)::BIGINT as password_protected_teams,
        (SELECT COUNT(DISTINCT team_id) FROM availability)::BIGINT as teams_with_availability;
END;
$$;

-- Function to get detailed team information
CREATE OR REPLACE FUNCTION get_all_teams_detailed(user_email TEXT)
RETURNS TABLE(
    team_id UUID,
    team_name TEXT,
    team_slug TEXT,
    team_invite_code TEXT,
    team_status TEXT,
    team_is_password_protected BOOLEAN,
    team_created_at TIMESTAMP WITH TIME ZONE,
    team_archived_at TIMESTAMP WITH TIME ZONE,
    team_archived_by TEXT,
    member_count BIGINT,
    active_member_count BIGINT,
    inactive_member_count BIGINT,
    left_member_count BIGINT,
    admin_count BIGINT,
    creator_email TEXT,
    creator_name TEXT,
    last_activity TIMESTAMP WITH TIME ZONE,
    availability_count BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM admin_users 
        WHERE email = user_email AND is_admin = true
    ) THEN
        RAISE EXCEPTION 'Access denied: User is not an admin';
    END IF;
    
    RETURN QUERY
    SELECT 
        t.id as team_id,
        t.name as team_name,
        t.slug as team_slug,
        t.invite_code as team_invite_code,
        COALESCE(t.status, 'active') as team_status,
        t.is_password_protected as team_is_password_protected,
        t.created_at as team_created_at,
        t.archived_at as team_archived_at,
        au_archived.email as team_archived_by,
        COUNT(m.id) as member_count,
        COUNT(CASE WHEN m.status = 'active' THEN 1 END) as active_member_count,
        COUNT(CASE WHEN m.status = 'inactive' THEN 1 END) as inactive_member_count,
        COUNT(CASE WHEN m.status = 'left' THEN 1 END) as left_member_count,
        COUNT(CASE WHEN m.is_admin = true THEN 1 END) as admin_count,
        au_creator.email as creator_email,
        COALESCE(au_creator.name, au_creator.email) as creator_name,
        COALESCE(MAX(av.created_at), t.created_at) as last_activity,
        COUNT(DISTINCT av.id) as availability_count
    FROM teams t
    LEFT JOIN members m ON t.id = m.team_id
    LEFT JOIN auth.users au_creator ON t.created_by = au_creator.id
    LEFT JOIN auth.users au_archived ON t.archived_by = au_archived.id
    LEFT JOIN availability av ON t.id = av.team_id
    GROUP BY 
        t.id, t.name, t.slug, t.invite_code, t.status, t.is_password_protected,
        t.created_at, t.archived_at, au_archived.email, au_creator.email, au_creator.name
    ORDER BY t.created_at DESC;
END;
$$;

-- Function to update team status
CREATE OR REPLACE FUNCTION update_team_status(
    team_id_param UUID,
    new_status TEXT,
    user_email TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM admin_users 
        WHERE email = user_email AND is_admin = true
    ) THEN
        RAISE EXCEPTION 'Access denied: User is not an admin';
    END IF;
    
    -- Validate status
    IF new_status NOT IN ('active', 'inactive', 'archived') THEN
        RAISE EXCEPTION 'Invalid status: %', new_status;
    END IF;
    
    -- Update team status
    UPDATE teams 
    SET 
        status = new_status,
        archived_at = CASE WHEN new_status = 'archived' THEN NOW() ELSE NULL END,
        archived_by = CASE WHEN new_status = 'archived' THEN (SELECT id FROM auth.users WHERE email = user_email) ELSE NULL END
    WHERE id = team_id_param;
    
    -- If archiving, also set members to inactive
    IF new_status = 'archived' THEN
        UPDATE members 
        SET status = 'inactive' 
        WHERE team_id = team_id_param AND status = 'active';
    END IF;
    
    -- Log the action (optional - you can add logging table later)
    -- INSERT INTO admin_logs (action_type, action_description, performed_by, performed_at)
    -- VALUES ('team_status_update', 'Team status updated to ' || new_status, user_email, NOW());
END;
$$;

-- Function to get all users with admin information
CREATE OR REPLACE FUNCTION get_all_users_admin(user_email TEXT)
RETURNS TABLE(
    user_id UUID,
    user_email TEXT,
    user_name TEXT,
    user_created_at TIMESTAMP WITH TIME ZONE,
    user_last_sign_in TIMESTAMP WITH TIME ZONE,
    total_teams BIGINT,
    active_teams BIGINT,
    is_admin BOOLEAN,
    profile_image_url TEXT,
    email_confirmed BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM admin_users 
        WHERE email = user_email AND is_admin = true
    ) THEN
        RAISE EXCEPTION 'Access denied: User is not an admin';
    END IF;
    
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email as user_email,
        COALESCE(u.raw_user_meta_data->>'name', u.email) as user_name,
        u.created_at as user_created_at,
        u.last_sign_in_at as user_last_sign_in,
        COUNT(DISTINCT m.team_id) as total_teams,
        COUNT(DISTINCT CASE WHEN m.status = 'active' THEN m.team_id END) as active_teams,
        COALESCE(au.is_admin, false) as is_admin,
        u.raw_user_meta_data->>'avatar_url' as profile_image_url,
        u.email_confirmed_at IS NOT NULL as email_confirmed
    FROM auth.users u
    LEFT JOIN members m ON u.id = m.user_id
    LEFT JOIN admin_users au ON u.email = au.email
    GROUP BY 
        u.id, u.email, u.raw_user_meta_data, u.created_at, u.last_sign_in_at, au.is_admin
    ORDER BY u.created_at DESC;
END;
$$;

-- Function to get team members (admin view)
CREATE OR REPLACE FUNCTION get_team_members_admin(
    team_id_param UUID,
    user_email TEXT
) RETURNS TABLE(
    member_id UUID,
    member_name TEXT,
    member_email TEXT,
    member_status TEXT,
    member_is_admin BOOLEAN,
    member_joined_at TIMESTAMP WITH TIME ZONE,
    member_left_at TIMESTAMP WITH TIME ZONE,
    profile_image_url TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM admin_users 
        WHERE email = user_email AND is_admin = true
    ) THEN
        RAISE EXCEPTION 'Access denied: User is not an admin';
    END IF;
    
    RETURN QUERY
    SELECT 
        m.id as member_id,
        m.name as member_name,
        m.email as member_email,
        m.status as member_status,
        m.is_admin as member_is_admin,
        m.joined_at as member_joined_at,
        m.left_at as member_left_at,
        u.raw_user_meta_data->>'avatar_url' as profile_image_url
    FROM members m
    LEFT JOIN auth.users u ON m.user_id = u.id
    WHERE m.team_id = team_id_param
    ORDER BY m.joined_at DESC;
END;
$$;

-- Function to get recent activity
CREATE OR REPLACE FUNCTION get_recent_activity(
    user_email TEXT,
    limit_count INTEGER DEFAULT 50
) RETURNS TABLE(
    activity_type TEXT,
    activity_description TEXT,
    activity_timestamp TIMESTAMP WITH TIME ZONE,
    related_user_email TEXT,
    related_team_name TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM admin_users 
        WHERE email = user_email AND is_admin = true
    ) THEN
        RAISE EXCEPTION 'Access denied: User is not an admin';
    END IF;
    
    RETURN QUERY
    (
        -- User signups
        SELECT 
            'user_signup' as activity_type,
            'New user registered: ' || u.email as activity_description,
            u.created_at as activity_timestamp,
            u.email as related_user_email,
            NULL::TEXT as related_team_name
        FROM auth.users u
        WHERE u.created_at >= NOW() - INTERVAL '30 days'
        
        UNION ALL
        
        -- Team creation
        SELECT 
            'team_created' as activity_type,
            'Team created: ' || t.name as activity_description,
            t.created_at as activity_timestamp,
            au.email as related_user_email,
            t.name as related_team_name
        FROM teams t
        LEFT JOIN auth.users au ON t.created_by = au.id
        WHERE t.created_at >= NOW() - INTERVAL '30 days'
        
        UNION ALL
        
        -- Member joins
        SELECT 
            'member_joined' as activity_type,
            m.name || ' joined team: ' || t.name as activity_description,
            m.joined_at as activity_timestamp,
            m.email as related_user_email,
            t.name as related_team_name
        FROM members m
        JOIN teams t ON m.team_id = t.id
        WHERE m.joined_at >= NOW() - INTERVAL '30 days'
    )
    ORDER BY activity_timestamp DESC
    LIMIT limit_count;
END;
$$;

-- Grant execute permissions to authenticated users (admin check is done within functions)
GRANT EXECUTE ON FUNCTION get_database_statistics(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_teams_detailed(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_team_status(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_users_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_members_admin(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_activity(TEXT, INTEGER) TO authenticated;

-- Create RLS policies for the status column
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Update existing team management policies if needed
DROP POLICY IF EXISTS "Team members can view their team" ON teams;
CREATE POLICY "Team members can view their team" ON teams FOR SELECT 
TO authenticated 
USING (
    id IN (
        SELECT team_id FROM members 
        WHERE user_id = auth.uid() AND status IN ('active', 'inactive')
    )
);

-- Policy for admins to view all teams
DROP POLICY IF EXISTS "Admins can view all teams" ON teams;
CREATE POLICY "Admins can view all teams" ON teams FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM admin_users 
        WHERE email = auth.jwt() ->> 'email' AND is_admin = true
    )
);

-- Update existing member policies
DROP POLICY IF EXISTS "Members can view team members" ON members;
CREATE POLICY "Members can view team members" ON members FOR SELECT 
TO authenticated 
USING (
    team_id IN (
        SELECT team_id FROM members 
        WHERE user_id = auth.uid() AND status IN ('active', 'inactive')
    )
);

-- Policy for admins to view all members
DROP POLICY IF EXISTS "Admins can view all members" ON members;
CREATE POLICY "Admins can view all members" ON members FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM admin_users 
        WHERE email = auth.jwt() ->> 'email' AND is_admin = true
    )
);

-- Comment for migration tracking
COMMENT ON FUNCTION get_database_statistics(TEXT) IS 'Extended admin migration - comprehensive database statistics';
COMMENT ON FUNCTION get_all_teams_detailed(TEXT) IS 'Extended admin migration - detailed team information with status management';
COMMENT ON FUNCTION update_team_status(UUID, TEXT, TEXT) IS 'Extended admin migration - team status management (active/inactive/archived)';
COMMENT ON FUNCTION get_all_users_admin(TEXT) IS 'Extended admin migration - comprehensive user management for admins';
COMMENT ON FUNCTION get_recent_activity(TEXT, INTEGER) IS 'Extended admin migration - system activity monitoring';
