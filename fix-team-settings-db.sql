-- Fix get_team_settings function - execute this in your database

DROP FUNCTION IF EXISTS get_team_settings(UUID, TEXT);

CREATE OR REPLACE FUNCTION get_team_settings(
  team_id_param UUID,
  user_email TEXT
)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  team_slug TEXT,
  team_invite_code TEXT,
  team_is_password_protected BOOLEAN,
  team_created_at TIMESTAMP WITH TIME ZONE,
  member_count BIGINT,
  hidden_member_count BIGINT,
  user_is_admin BOOLEAN,
  user_is_creator BOOLEAN
) AS $$
BEGIN
  -- Check if user is member of this team
  IF NOT EXISTS (
    SELECT 1 FROM members m_check
    WHERE m_check.team_id = team_id_param 
    AND m_check.email = user_email 
    AND m_check.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied: User is not a member of this team';
  END IF;

  RETURN QUERY
  SELECT 
    t.id as team_id,
    t.name as team_name,
    COALESCE(t.slug, '') as team_slug,
    t.invite_code as team_invite_code,
    t.is_password_protected as team_is_password_protected,
    t.created_at as team_created_at,
    COUNT(m.id) as member_count,
    COUNT(CASE WHEN m.is_hidden = TRUE THEN 1 END) as hidden_member_count,
    EXISTS(SELECT 1 FROM members m2 WHERE m2.team_id = team_id_param AND m2.email = user_email AND m2.role = 'admin') as user_is_admin,
    (t.created_by IS NOT NULL AND EXISTS(SELECT 1 FROM auth.users au WHERE au.id = t.created_by AND au.email = user_email)) as user_is_creator
  FROM teams t
  LEFT JOIN members m ON t.id = m.team_id AND m.status IN ('active', 'inactive')
  WHERE t.id = team_id_param
  GROUP BY t.id, t.name, t.slug, t.invite_code, t.is_password_protected, t.created_at, t.created_by;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get only active visible members for team overview
DROP FUNCTION IF EXISTS get_team_active_members(UUID, TEXT);

CREATE OR REPLACE FUNCTION get_team_active_members(team_id_param UUID, user_email TEXT)
RETURNS TABLE (
  member_id UUID,
  member_email TEXT,
  member_name TEXT,
  member_role TEXT,
  member_status TEXT,
  profile_image_url TEXT,
  joined_at TIMESTAMP WITH TIME ZONE,
  last_active TIMESTAMP WITH TIME ZONE,
  is_current_user BOOLEAN,
  is_hidden BOOLEAN
) AS $$
BEGIN
  -- Check if user is member of this team OR team is not password protected
  IF NOT EXISTS (
    SELECT 1 FROM members 
    WHERE team_id = team_id_param AND email = user_email AND status = 'active'
  ) THEN
    -- Allow access if team is not password protected (for public teams)
    IF NOT EXISTS (
      SELECT 1 FROM teams 
      WHERE id = team_id_param AND (is_password_protected = FALSE OR is_password_protected IS NULL)
    ) THEN
      RAISE EXCEPTION 'Access denied: User is not an active member of this team';
    END IF;
  END IF;

  RETURN QUERY
  SELECT 
    m.id,
    m.email,
    CONCAT(m.first_name, ' ', m.last_name) as member_name,
    COALESCE(m.role, 'member'::TEXT) as member_role,
    m.status as member_status,
    COALESCE(m.profile_image, m.profile_image_url) as profile_image_url,
    m.created_at,
    m.last_active,
    (m.email = user_email) as is_current_user,
    COALESCE(m.is_hidden, FALSE) as is_hidden
  FROM members m
  WHERE m.team_id = team_id_param 
  AND m.status = 'active'  -- Only active members for team overview
  AND COALESCE(m.is_hidden, FALSE) = FALSE  -- Only visible members
  ORDER BY 
    CASE m.role 
      WHEN 'admin' THEN 1
      WHEN 'can_edit' THEN 2
      ELSE 3
    END,
    m.order_index ASC,
    m.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_team_active_members(UUID, TEXT) TO authenticated;

-- Make Jonas Van Hove admin for the team
UPDATE members 
SET role = 'admin'
WHERE id = '382f2818-67a8-4929-b220-d110ff9338af'
  AND team_id = '5ce51f10-43f1-4d9e-8844-f01382b0489f'
  AND email = 'jonas.vanhove@arcelormittal.com';

-- Verify the update
SELECT 
  m.id,
  m.first_name,
  m.last_name,
  m.email,
  m.role,
  m.status,
  t.name as team_name,
  t.id as team_id
FROM members m
JOIN teams t ON m.team_id = t.id
WHERE m.id = '382f2818-67a8-4929-b220-d110ff9338af';
