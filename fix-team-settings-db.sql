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
