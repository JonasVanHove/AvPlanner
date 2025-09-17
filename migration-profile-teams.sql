-- PROFIEL & TEAM MANAGEMENT UITBREIDING
-- Voegt profiel functionaliteit en team management toe

-- Stap 1: Voeg profiel kolommen toe aan auth.users metadata
-- Dit wordt gedaan via de applicatie omdat we niet direct auth.users kunnen wijzigen

-- Stap 2: Voeg profiel status kolommen toe aan members tabel
ALTER TABLE members ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'left'));
ALTER TABLE members ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Stap 3: Voeg indexen toe voor betere prestaties
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_last_active ON members(last_active);

-- Stap 4: Functie om user profiel te updaten
CREATE OR REPLACE FUNCTION update_user_profile(
  user_email TEXT,
  profile_image_url TEXT DEFAULT NULL,
  first_name TEXT DEFAULT NULL,
  last_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  user_id UUID;
  current_metadata JSONB;
  new_metadata JSONB;
BEGIN
  -- Find user ID
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Update members table met nieuwe profile info
  UPDATE members
  SET 
    profile_image_url = COALESCE(update_user_profile.profile_image_url, members.profile_image_url),
    first_name = COALESCE(update_user_profile.first_name, members.first_name),
    last_name = COALESCE(update_user_profile.last_name, members.last_name),
    last_active = NOW()
  WHERE auth_user_id = user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stap 5: Functie om user's teams op te halen met status
CREATE OR REPLACE FUNCTION get_user_teams_with_status(user_email TEXT)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  team_slug TEXT,
  team_invite_code TEXT,
  team_is_password_protected BOOLEAN,
  team_created_at TIMESTAMP WITH TIME ZONE,
  user_role TEXT,
  user_status TEXT,
  member_count BIGINT,
  is_creator BOOLEAN,
  can_leave BOOLEAN,
  last_active TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.slug,
    t.invite_code,
    t.is_password_protected,
    t.created_at,
    COALESCE(m.role, 'member'::TEXT) as user_role,
    COALESCE(m.status, 'active'::TEXT) as user_status,
    COUNT(m2.id) FILTER (WHERE m2.status = 'active') as member_count,
    (t.created_by IS NOT NULL AND au.email = user_email) as is_creator,
    -- User can leave if they're not the creator or if there are other admins
    (
      NOT (t.created_by IS NOT NULL AND au.email = user_email) OR
      EXISTS (
        SELECT 1 FROM members m3 
        WHERE m3.team_id = t.id 
        AND m3.role = 'admin' 
        AND m3.email != user_email 
        AND m3.status = 'active'
      )
    ) as can_leave,
    m.last_active
  FROM teams t
  INNER JOIN members m ON t.id = m.team_id
  LEFT JOIN members m2 ON t.id = m2.team_id
  LEFT JOIN auth.users au ON t.created_by = au.id
  WHERE m.email = user_email
  GROUP BY t.id, t.name, t.slug, t.invite_code, t.is_password_protected, t.created_at, m.role, m.status, t.created_by, au.email, m.last_active
  ORDER BY 
    CASE m.status
      WHEN 'active' THEN 1
      WHEN 'inactive' THEN 2
      WHEN 'left' THEN 3
    END,
    t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stap 6: Functie om team te verlaten
CREATE OR REPLACE FUNCTION leave_team(team_id_param UUID, user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  team_name TEXT;
  user_role TEXT;
  is_creator BOOLEAN;
  other_admins_count INTEGER;
BEGIN
  -- Get team info and user role
  SELECT 
    t.name,
    m.role,
    (t.created_by IS NOT NULL AND au.email = user_email)
  INTO team_name, user_role, is_creator
  FROM teams t
  INNER JOIN members m ON t.id = m.team_id
  LEFT JOIN auth.users au ON t.created_by = au.id
  WHERE t.id = team_id_param AND m.email = user_email;
  
  IF team_name IS NULL THEN
    RAISE EXCEPTION 'Team not found or user is not a member';
  END IF;
  
  -- Check if user is creator and if there are other admins
  IF is_creator THEN
    SELECT COUNT(*) INTO other_admins_count
    FROM members
    WHERE team_id = team_id_param 
    AND role = 'admin' 
    AND email != user_email 
    AND status = 'active';
    
    IF other_admins_count = 0 THEN
      RAISE EXCEPTION 'Cannot leave team: You are the creator and there are no other admins. Please promote someone else to admin first.';
    END IF;
  END IF;
  
  -- Mark user as left
  UPDATE members
  SET 
    status = 'left',
    last_active = NOW()
  WHERE team_id = team_id_param AND email = user_email;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stap 7: Functie om team status te wijzigen (active/inactive)
CREATE OR REPLACE FUNCTION toggle_team_status(team_id_param UUID, user_email TEXT)
RETURNS TEXT AS $$
DECLARE
  current_status TEXT;
  new_status TEXT;
BEGIN
  -- Get current status
  SELECT status INTO current_status
  FROM members
  WHERE team_id = team_id_param AND email = user_email;
  
  IF current_status IS NULL THEN
    RAISE EXCEPTION 'User is not a member of this team';
  END IF;
  
  IF current_status = 'left' THEN
    RAISE EXCEPTION 'Cannot change status: User has left the team';
  END IF;
  
  -- Toggle status
  new_status := CASE 
    WHEN current_status = 'active' THEN 'inactive'
    WHEN current_status = 'inactive' THEN 'active'
    ELSE 'active'
  END;
  
  -- Update status
  UPDATE members
  SET 
    status = new_status,
    last_active = NOW()
  WHERE team_id = team_id_param AND email = user_email;
  
  RETURN new_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stap 8: Functie om team member info op te halen met profielfoto
CREATE OR REPLACE FUNCTION get_team_members_with_profiles(team_id_param UUID, user_email TEXT)
RETURNS TABLE (
  member_id UUID,
  member_name TEXT,
  member_email TEXT,
  member_role TEXT,
  member_status TEXT,
  profile_image_url TEXT,
  can_edit_availability BOOLEAN,
  joined_at TIMESTAMP WITH TIME ZONE,
  last_active TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Check if user is member of the team
  IF NOT EXISTS (
    SELECT 1 FROM members m
    WHERE m.email = user_email AND m.team_id = team_id_param
  ) THEN
    RAISE EXCEPTION 'Access denied: User is not a member of this team';
  END IF;

  RETURN QUERY
  SELECT 
    m.id,
    CONCAT(m.first_name, ' ', m.last_name) as member_name,
    m.email,
    COALESCE(m.role, 'member'::TEXT) as member_role,
    COALESCE(m.status, 'active'::TEXT) as member_status,
    m.profile_image_url,
    (m.role IN ('admin', 'can_edit')) as can_edit_availability,
    m.created_at,
    m.last_active
  FROM members m
  WHERE m.team_id = team_id_param
  ORDER BY 
    CASE m.status
      WHEN 'active' THEN 1
      WHEN 'inactive' THEN 2
      WHEN 'left' THEN 3
    END,
    CASE m.role 
      WHEN 'admin' THEN 1
      WHEN 'can_edit' THEN 2
      ELSE 3
    END,
    m.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stap 9: Functie om user profiel op te halen
CREATE OR REPLACE FUNCTION get_user_profile(user_email TEXT)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  profile_image_url TEXT,
  total_teams BIGINT,
  active_teams BIGINT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    COALESCE(
      au.raw_user_meta_data->>'first_name',
      (SELECT m.first_name FROM members m WHERE m.auth_user_id = au.id LIMIT 1)
    ) as first_name,
    COALESCE(
      au.raw_user_meta_data->>'last_name',
      (SELECT m.last_name FROM members m WHERE m.auth_user_id = au.id LIMIT 1)
    ) as last_name,
    (SELECT m.profile_image_url FROM members m WHERE m.auth_user_id = au.id AND m.profile_image_url IS NOT NULL LIMIT 1) as profile_image_url,
    COUNT(m.id) as total_teams,
    COUNT(m.id) FILTER (WHERE m.status = 'active') as active_teams,
    au.created_at
  FROM auth.users au
  LEFT JOIN members m ON au.id = m.auth_user_id
  WHERE au.email = user_email
  GROUP BY au.id, au.email, au.raw_user_meta_data, au.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
