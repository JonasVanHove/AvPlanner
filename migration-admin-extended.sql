-- ADMIN PANEL DATABASE OVERZICHT & TEAM MANAGEMENT
-- Uitgebreide admin functionaliteiten voor complete database management

-- Stap 1: Voeg team status kolom toe, created_by kolom en members role kolom
ALTER TABLE teams ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived'));
ALTER TABLE teams ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS archived_by TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Voeg role kolom toe aan members tabel als die nog niet bestaat
ALTER TABLE members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'can_edit'));

-- Voeg auth_user_id kolom toe aan members tabel als die nog niet bestaat
ALTER TABLE members ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Voeg order_index kolom toe aan members tabel voor sorteer functionaliteit
ALTER TABLE members ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Voeg is_hidden kolom toe aan members tabel om members te kunnen verbergen
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- Stap 2: Update is_user_admin functie voor consistentie
-- Drop existing function first to avoid parameter name conflicts
DROP FUNCTION IF EXISTS is_user_admin(TEXT);

CREATE OR REPLACE FUNCTION is_user_admin(admin_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE email = admin_email AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stap 3: Indexen voor betere prestaties
CREATE INDEX IF NOT EXISTS idx_teams_status ON teams(status);
CREATE INDEX IF NOT EXISTS idx_teams_archived_at ON teams(archived_at);
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON teams(created_by);
CREATE INDEX IF NOT EXISTS idx_members_role ON members(role);
CREATE INDEX IF NOT EXISTS idx_members_auth_user_id ON members(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_members_order_index ON members(order_index);
CREATE INDEX IF NOT EXISTS idx_members_is_hidden ON members(is_hidden);

-- Stap 4: Functie om complete database statistieken op te halen
CREATE OR REPLACE FUNCTION get_database_statistics(admin_email TEXT)
RETURNS TABLE (
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
) AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_user_admin(admin_email) THEN
    RAISE EXCEPTION 'Access denied: User is not an admin';
  END IF;

  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM teams) as total_teams,
    (SELECT COUNT(*) FROM teams WHERE status = 'active') as active_teams,
    (SELECT COUNT(*) FROM teams WHERE status = 'inactive') as inactive_teams,
    (SELECT COUNT(*) FROM teams WHERE status = 'archived') as archived_teams,
    (SELECT COUNT(*) FROM members) as total_members,
    (SELECT COUNT(*) FROM members WHERE status = 'active') as active_members,
    (SELECT COUNT(*) FROM members WHERE status = 'inactive') as inactive_members,
    (SELECT COUNT(*) FROM members WHERE status = 'left') as left_members,
    (SELECT COUNT(*) FROM admin_users WHERE is_active = TRUE) as total_admins,
    (SELECT COUNT(*) FROM auth.users WHERE created_at > NOW() - INTERVAL '7 days') as recent_signups,
    (SELECT COUNT(*) FROM teams WHERE created_at > NOW() - INTERVAL '7 days') as recent_teams,
    (SELECT COUNT(*) FROM teams WHERE is_password_protected = TRUE) as password_protected_teams,
    (SELECT COUNT(DISTINCT team_id) FROM availability) as teams_with_availability;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stap 5: Uitgebreide team management functie
CREATE OR REPLACE FUNCTION get_all_teams_detailed(admin_email TEXT)
RETURNS TABLE (
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
) AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_user_admin(admin_email) THEN
    RAISE EXCEPTION 'Access denied: User is not an admin';
  END IF;

  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.slug,
    t.invite_code,
    COALESCE(t.status, 'active'::TEXT) as team_status,
    t.is_password_protected,
    t.created_at,
    t.archived_at,
    t.archived_by,
    COUNT(m.id) as member_count,
    COUNT(m.id) FILTER (WHERE m.status = 'active') as active_member_count,
    COUNT(m.id) FILTER (WHERE m.status = 'inactive') as inactive_member_count,
    COUNT(m.id) FILTER (WHERE m.status = 'left') as left_member_count,
    COUNT(m.id) FILTER (WHERE m.role = 'admin' AND m.status = 'active') as admin_count,
    au.email as creator_email,
    COALESCE(
      CONCAT(au.raw_user_meta_data->>'first_name', ' ', au.raw_user_meta_data->>'last_name'),
      au.email
    ) as creator_name,
    MAX(m.last_active) as last_activity,
    COALESCE(av.availability_count, 0) as availability_count
  FROM teams t
  LEFT JOIN members m ON t.id = m.team_id
  LEFT JOIN auth.users au ON t.created_by = au.id
  LEFT JOIN (
    SELECT team_id, COUNT(*) as availability_count
    FROM availability
    GROUP BY team_id
  ) av ON t.id = av.team_id
  GROUP BY t.id, t.name, t.slug, t.invite_code, t.status, t.is_password_protected, t.created_at, t.archived_at, t.archived_by, au.email, au.raw_user_meta_data, av.availability_count
  ORDER BY 
    CASE t.status
      WHEN 'active' THEN 1
      WHEN 'inactive' THEN 2
      WHEN 'archived' THEN 3
    END,
    t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stap 6: Functie om team status te wijzigen
CREATE OR REPLACE FUNCTION update_team_status(
  team_id_param UUID, 
  new_status TEXT, 
  admin_email TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  team_name TEXT;
  old_status TEXT;
BEGIN
  -- Check if user is admin
  IF NOT is_user_admin(admin_email) THEN
    RAISE EXCEPTION 'Access denied: User is not an admin';
  END IF;

  -- Validate status
  IF new_status NOT IN ('active', 'inactive', 'archived') THEN
    RAISE EXCEPTION 'Invalid status. Must be active, inactive, or archived';
  END IF;

  -- Get team info
  SELECT name, COALESCE(status, 'active') INTO team_name, old_status
  FROM teams
  WHERE id = team_id_param;
  
  IF team_name IS NULL THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  -- Update team status
  UPDATE teams
  SET 
    status = new_status,
    archived_at = CASE WHEN new_status = 'archived' THEN NOW() ELSE NULL END,
    archived_by = CASE WHEN new_status = 'archived' THEN admin_email ELSE NULL END
  WHERE id = team_id_param;
  
  -- If archiving, also set all members to inactive
  IF new_status = 'archived' THEN
    UPDATE members
    SET status = 'inactive'
    WHERE team_id = team_id_param AND status = 'active';
  END IF;
  
  -- Log the change
  RAISE NOTICE 'Admin % changed team "%" status from % to %', admin_email, team_name, old_status, new_status;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stap 7: Functie om alle users op te halen
CREATE OR REPLACE FUNCTION get_all_users_admin(admin_email TEXT)
RETURNS TABLE (
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
) AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_user_admin(admin_email) THEN
    RAISE EXCEPTION 'Access denied: User is not an admin';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    COALESCE(
      CONCAT(u.raw_user_meta_data->>'first_name', ' ', u.raw_user_meta_data->>'last_name'),
      u.email
    ) as user_name,
    u.created_at,
    u.last_sign_in_at,
    COUNT(m.id) as total_teams,
    COUNT(m.id) FILTER (WHERE m.status = 'active') as active_teams,
    COALESCE(au.is_active, FALSE) as is_admin,
    (SELECT m2.profile_image_url FROM members m2 WHERE m2.auth_user_id = u.id AND m2.profile_image_url IS NOT NULL LIMIT 1) as profile_image_url,
    COALESCE(u.email_confirmed_at IS NOT NULL, FALSE) as email_confirmed
  FROM auth.users u
  LEFT JOIN members m ON u.id = m.auth_user_id
  LEFT JOIN admin_users au ON u.id = au.user_id
  GROUP BY u.id, u.email, u.raw_user_meta_data, u.created_at, u.last_sign_in_at, au.is_active, u.email_confirmed_at
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stap 8: Functie om team members details op te halen
CREATE OR REPLACE FUNCTION get_team_members_admin(team_id_param UUID, admin_email TEXT)
RETURNS TABLE (
  member_id UUID,
  member_email TEXT,
  member_name TEXT,
  member_role TEXT,
  member_status TEXT,
  profile_image_url TEXT,
  joined_at TIMESTAMP WITH TIME ZONE,
  last_active TIMESTAMP WITH TIME ZONE,
  availability_count BIGINT
) AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_user_admin(admin_email) THEN
    RAISE EXCEPTION 'Access denied: User is not an admin';
  END IF;

  RETURN QUERY
  SELECT 
    m.id,
    m.email,
    CONCAT(m.first_name, ' ', m.last_name) as member_name,
    COALESCE(m.role, 'member'::TEXT) as member_role,
    COALESCE(m.status, 'active'::TEXT) as member_status,
    m.profile_image_url,
    m.created_at,
    m.last_active,
    COUNT(a.id) as availability_count
  FROM members m
  LEFT JOIN availability a ON m.id = a.member_id
  WHERE m.team_id = team_id_param
  GROUP BY m.id, m.email, m.first_name, m.last_name, m.role, m.status, m.profile_image_url, m.created_at, m.last_active
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

-- Stap 9: Functie om recent activity op te halen
CREATE OR REPLACE FUNCTION get_recent_activity(admin_email TEXT, limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  activity_type TEXT,
  activity_description TEXT,
  activity_timestamp TIMESTAMP WITH TIME ZONE,
  related_user_email TEXT,
  related_team_name TEXT
) AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_user_admin(admin_email) THEN
    RAISE EXCEPTION 'Access denied: User is not an admin';
  END IF;

  RETURN QUERY
  (
    -- New user signups
    SELECT 
      'user_signup' as activity_type,
      'New user registered: ' || u.email as activity_description,
      u.created_at as activity_timestamp,
      u.email as related_user_email,
      NULL::TEXT as related_team_name
    FROM auth.users u
    WHERE u.created_at > NOW() - INTERVAL '30 days'
  )
  UNION ALL
  (
    -- New teams created
    SELECT 
      'team_created' as activity_type,
      'New team created: ' || t.name as activity_description,
      t.created_at as activity_timestamp,
      au.email as related_user_email,
      t.name as related_team_name
    FROM teams t
    LEFT JOIN auth.users au ON t.created_by = au.id
    WHERE t.created_at > NOW() - INTERVAL '30 days'
  )
  UNION ALL
  (
    -- New team members
    SELECT 
      'member_joined' as activity_type,
      m.email || ' joined team: ' || t.name as activity_description,
      m.created_at as activity_timestamp,
      m.email as related_user_email,
      t.name as related_team_name
    FROM members m
    JOIN teams t ON m.team_id = t.id
    WHERE m.created_at > NOW() - INTERVAL '30 days'
  )
  ORDER BY activity_timestamp DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stap 10: Functie om team creator automatisch als lid toe te voegen
CREATE OR REPLACE FUNCTION add_team_creator_as_member()
RETURNS TRIGGER AS $$
DECLARE
  creator_user auth.users%ROWTYPE;
  creator_name TEXT;
  creator_email TEXT;
BEGIN
  -- Check if created_by is provided
  IF NEW.created_by IS NULL THEN
    RAISE NOTICE 'No created_by provided for team %, skipping auto-member creation', NEW.name;
    RETURN NEW;
  END IF;
  
  -- Get creator information
  SELECT * INTO creator_user FROM auth.users WHERE id = NEW.created_by;
  
  IF creator_user.id IS NOT NULL THEN
    -- Extract name and email
    creator_email := creator_user.email;
    creator_name := COALESCE(
      CONCAT(creator_user.raw_user_meta_data->>'first_name', ' ', creator_user.raw_user_meta_data->>'last_name'),
      creator_user.email
    );
    
    -- Check if the creator is already a member of this team
    IF NOT EXISTS (SELECT 1 FROM members WHERE team_id = NEW.id AND auth_user_id = creator_user.id) THEN
      -- Add creator as team member with admin role
      INSERT INTO members (
        team_id,
        auth_user_id,
        email,
        first_name,
        last_name,
        role,
        status,
        created_at,
        joined_at,
        last_active
      ) VALUES (
        NEW.id,
        creator_user.id,
        creator_email,
        COALESCE(creator_user.raw_user_meta_data->>'first_name', SPLIT_PART(creator_email, '@', 1)),
        COALESCE(creator_user.raw_user_meta_data->>'last_name', ''),
        'admin',
        'active',
        NOW(),
        NOW(),
        NOW()
      );
      
      RAISE NOTICE 'Team creator % automatically added as admin member to team %', creator_email, NEW.name;
    ELSE
      RAISE NOTICE 'Team creator % is already a member of team %', creator_email, NEW.name;
    END IF;
  ELSE
    RAISE NOTICE 'Creator user with ID % not found for team %', NEW.created_by, NEW.name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stap 11: Trigger om team creator automatisch als lid toe te voegen
DROP TRIGGER IF EXISTS trigger_add_team_creator_as_member ON teams;
CREATE TRIGGER trigger_add_team_creator_as_member
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION add_team_creator_as_member();

-- Stap 12: Update get_user_teams functie om profile image URL toe te voegen
DROP FUNCTION IF EXISTS get_user_teams(TEXT);

CREATE OR REPLACE FUNCTION get_user_teams(user_email TEXT)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  team_slug TEXT,
  team_invite_code TEXT,
  team_is_password_protected BOOLEAN,
  team_created_at TIMESTAMP WITH TIME ZONE,
  user_role TEXT,
  member_count BIGINT,
  is_creator BOOLEAN,
  profile_image_url TEXT
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
    COUNT(m2.id) as member_count,
    (t.created_by IS NOT NULL AND au.email = user_email) as is_creator,
    -- Selecteer de eerste niet-null profile_image_url van alle members met dit email in dit team
    COALESCE(
      (SELECT m3.profile_image_url 
       FROM members m3 
       WHERE m3.team_id = t.id 
       AND m3.email = user_email 
       AND m3.profile_image_url IS NOT NULL 
       AND m3.profile_image_url != ''
       LIMIT 1),
      m.profile_image_url
    ) as profile_image_url
  FROM teams t
  INNER JOIN members m ON t.id = m.team_id
  LEFT JOIN members m2 ON t.id = m2.team_id
  LEFT JOIN auth.users au ON t.created_by = au.id
  WHERE m.email = user_email
  GROUP BY t.id, t.name, t.slug, t.invite_code, t.is_password_protected, t.created_at, m.role, t.created_by, au.email, m.profile_image_url
  ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stap 13: Functies voor automatische user linking
CREATE OR REPLACE FUNCTION link_auth_user_to_members()
RETURNS TRIGGER AS $$
DECLARE
  consolidated_count INTEGER;
BEGIN
  -- Update alle members met dezelfde email om ze te linken aan de authenticated user
  UPDATE members 
  SET auth_user_id = NEW.id
  WHERE email = NEW.email AND auth_user_id IS NULL;
  
  -- Consolideer profielafbeeldingen voor deze user
  SELECT consolidate_user_profile_images(NEW.email) INTO consolidated_count;
  
  IF consolidated_count > 0 THEN
    RAISE NOTICE 'Consolidated % profile images for user %', consolidated_count, NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger eerst als die al bestaat
DROP TRIGGER IF EXISTS link_user_on_login ON auth.users;

-- Trigger die automatisch auth_user_id linkt wanneer een user inlogt
CREATE TRIGGER link_user_on_login
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION link_auth_user_to_members();

-- Functie om handmatig auth_user_id te linken (voor bestaande users)
CREATE OR REPLACE FUNCTION manual_link_auth_user(user_email TEXT)
RETURNS INTEGER AS $$
DECLARE
  user_id UUID;
  updated_count INTEGER;
  consolidated_count INTEGER;
BEGIN
  -- Vind de auth user ID
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found in auth.users', user_email;
  END IF;
  
  -- Update members met deze email
  -- Bewaar bestaande profile_image_url als die er is
  UPDATE members 
  SET auth_user_id = user_id
  WHERE email = user_email AND auth_user_id IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Consolideer profielafbeeldingen voor deze user
  SELECT consolidate_user_profile_images(user_email) INTO consolidated_count;
  
  RAISE NOTICE 'Linked % member records and consolidated % profile images for user %', 
    updated_count, consolidated_count, user_email;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stap 14: Functie om profielafbeeldingen te synchroniseren voor een user
CREATE OR REPLACE FUNCTION sync_user_profile_images(user_email TEXT)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  profile_image_url TEXT,
  updated BOOLEAN
) AS $$
BEGIN
  -- Retourneer informatie over de teams waar de user lid van is
  -- en hun huidige profielafbeeldingen
  RETURN QUERY
  SELECT 
    t.id as team_id,
    t.name as team_name,
    m.profile_image_url,
    (m.profile_image_url IS NOT NULL) as updated
  FROM teams t
  INNER JOIN members m ON t.id = m.team_id
  WHERE m.email = user_email
  ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stap 15: Functie om profielafbeelding te consolideren voor een user
CREATE OR REPLACE FUNCTION consolidate_user_profile_images(user_email TEXT)
RETURNS INTEGER AS $$
DECLARE
  best_profile_image TEXT;
  updated_count INTEGER := 0;
  current_update_count INTEGER;
  team_record RECORD;
BEGIN
  -- Voor elk team waar de user lid van is
  FOR team_record IN 
    SELECT DISTINCT t.id as team_id
    FROM teams t
    INNER JOIN members m ON t.id = m.team_id
    WHERE m.email = user_email
  LOOP
    -- Vind de beste profielafbeelding voor dit team (eerste niet-null/niet-lege)
    SELECT m.profile_image_url INTO best_profile_image
    FROM members m
    WHERE m.team_id = team_record.team_id 
    AND m.email = user_email 
    AND m.profile_image_url IS NOT NULL 
    AND m.profile_image_url != ''
    LIMIT 1;
    
    -- Als er een goede profielafbeelding gevonden is, update alle members zonder afbeelding
    IF best_profile_image IS NOT NULL THEN
      UPDATE members 
      SET profile_image_url = best_profile_image
      WHERE team_id = team_record.team_id 
      AND email = user_email 
      AND (profile_image_url IS NULL OR profile_image_url = '');
      
      GET DIAGNOSTICS current_update_count = ROW_COUNT;
      updated_count = updated_count + current_update_count;
    END IF;
  END LOOP;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stap 16: Functie om teamleden op te halen voor gewone team members
-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS get_team_members(UUID, TEXT);

CREATE OR REPLACE FUNCTION get_team_members(team_id_param UUID, user_email TEXT)
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
  -- Check if user is member of this team
  IF NOT EXISTS (
    SELECT 1 FROM members 
    WHERE team_id = team_id_param AND email = user_email AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied: User is not an active member of this team';
  END IF;

  RETURN QUERY
  SELECT 
    m.id,
    m.email,
    CONCAT(m.first_name, ' ', m.last_name) as member_name,
    COALESCE(m.role, 'member'::TEXT) as member_role,
    COALESCE(m.status, 'active'::TEXT) as member_status,
    m.profile_image_url,
    m.created_at,
    m.last_active,
    (m.email = user_email) as is_current_user,
    COALESCE(m.is_hidden, FALSE) as is_hidden
  FROM members m
  WHERE m.team_id = team_id_param 
  AND m.status IN ('active', 'inactive') -- Exclude 'left' members
  ORDER BY 
    CASE m.status
      WHEN 'active' THEN 1
      WHEN 'inactive' THEN 2
    END,
    CASE m.role 
      WHEN 'admin' THEN 1
      WHEN 'can_edit' THEN 2
      ELSE 3
    END,
    m.order_index ASC,
    m.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stap 17: Functie om member volgorde bij te werken
-- Drop existing function first to avoid conflicts
DROP FUNCTION IF EXISTS update_member_order(UUID, UUID, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION update_member_order(
  team_id_param UUID, 
  member_id_param UUID, 
  new_order_index INTEGER,
  user_email TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  old_order_index INTEGER;
  max_order_index INTEGER;
BEGIN
  -- Check if user is member of this team and has edit rights
  IF NOT EXISTS (
    SELECT 1 FROM members 
    WHERE team_id = team_id_param 
    AND email = user_email 
    AND status = 'active'
    AND role IN ('admin', 'can_edit')
  ) THEN
    RAISE EXCEPTION 'Access denied: User does not have edit rights for this team';
  END IF;

  -- Get current order index
  SELECT order_index INTO old_order_index
  FROM members
  WHERE id = member_id_param AND team_id = team_id_param;
  
  IF old_order_index IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  -- Get max order index for the team
  SELECT COALESCE(MAX(order_index), 0) INTO max_order_index
  FROM members
  WHERE team_id = team_id_param;

  -- Validate new order index
  IF new_order_index < 0 THEN
    new_order_index := 0;
  ELSIF new_order_index > max_order_index THEN
    new_order_index := max_order_index;
  END IF;

  -- Don't do anything if order doesn't change
  IF old_order_index = new_order_index THEN
    RETURN TRUE;
  END IF;

  -- Shift other members
  IF old_order_index < new_order_index THEN
    -- Moving down: shift members up
    UPDATE members
    SET order_index = order_index - 1
    WHERE team_id = team_id_param
    AND order_index > old_order_index
    AND order_index <= new_order_index;
  ELSE
    -- Moving up: shift members down
    UPDATE members
    SET order_index = order_index + 1
    WHERE team_id = team_id_param
    AND order_index >= new_order_index
    AND order_index < old_order_index;
  END IF;

  -- Update the target member
  UPDATE members
  SET order_index = new_order_index
  WHERE id = member_id_param;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stap 18: Functie om member een positie omhoog te verplaatsen
-- Drop existing function first to avoid conflicts
DROP FUNCTION IF EXISTS move_member_up(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION move_member_up(
  team_id_param UUID, 
  member_id_param UUID, 
  user_email TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  current_order INTEGER;
BEGIN
  -- Get current order
  SELECT order_index INTO current_order
  FROM members
  WHERE id = member_id_param AND team_id = team_id_param;
  
  IF current_order IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  -- Can't move up if already at the top
  IF current_order <= 0 THEN
    RETURN FALSE;
  END IF;

  -- Move up by 1
  RETURN update_member_order(team_id_param, member_id_param, current_order - 1, user_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stap 19: Functie om member een positie omlaag te verplaatsen
-- Drop existing function first to avoid conflicts
DROP FUNCTION IF EXISTS move_member_down(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION move_member_down(
  team_id_param UUID, 
  member_id_param UUID, 
  user_email TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  current_order INTEGER;
  max_order INTEGER;
BEGIN
  -- Get current order
  SELECT order_index INTO current_order
  FROM members
  WHERE id = member_id_param AND team_id = team_id_param;
  
  IF current_order IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  -- Get max order for team
  SELECT COALESCE(MAX(order_index), 0) INTO max_order
  FROM members
  WHERE team_id = team_id_param;

  -- Can't move down if already at the bottom
  IF current_order >= max_order THEN
    RETURN FALSE;
  END IF;

  -- Move down by 1
  RETURN update_member_order(team_id_param, member_id_param, current_order + 1, user_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stap 20: Trigger function om automatisch order_index in te stellen voor nieuwe members
CREATE OR REPLACE FUNCTION set_member_order_index()
RETURNS TRIGGER AS $$
DECLARE
  max_order INTEGER;
BEGIN
  -- Als er geen order_index is ingesteld, zet deze naar het einde van de lijst
  IF NEW.order_index IS NULL OR NEW.order_index = 0 THEN
    SELECT COALESCE(MAX(order_index), -1) + 1 INTO max_order
    FROM members
    WHERE team_id = NEW.team_id;
    
    NEW.order_index := max_order;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger om automatisch order_index in te stellen
DROP TRIGGER IF EXISTS trigger_set_member_order_index ON members;
CREATE TRIGGER trigger_set_member_order_index
  BEFORE INSERT ON members
  FOR EACH ROW
  EXECUTE FUNCTION set_member_order_index();

-- Stap 21: Update bestaande members met order_index
-- Dit script geeft alle bestaande members een order_index op basis van hun created_at datum
DO $$
DECLARE
  team_record RECORD;
  member_record RECORD;
  current_order INTEGER;
BEGIN
  -- Voor elk team
  FOR team_record IN 
    SELECT DISTINCT team_id FROM members WHERE order_index = 0 OR order_index IS NULL
  LOOP
    current_order := 0;
    
    -- Voor elke member in dit team, gesorteerd op created_at
    FOR member_record IN 
      SELECT id FROM members 
      WHERE team_id = team_record.team_id 
      AND (order_index = 0 OR order_index IS NULL)
      ORDER BY created_at ASC
    LOOP
      UPDATE members 
      SET order_index = current_order
      WHERE id = member_record.id;
      
      current_order := current_order + 1;
    END LOOP;
  END LOOP;
END;
$$;

-- Stap 22: Functie om member visibility te wijzigen (verbergen/tonen)
-- Drop existing function first to avoid conflicts
DROP FUNCTION IF EXISTS toggle_member_visibility(UUID, UUID, BOOLEAN, TEXT);

CREATE OR REPLACE FUNCTION toggle_member_visibility(
  team_id_param UUID, 
  member_id_param UUID, 
  is_hidden_param BOOLEAN,
  user_email TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is member of this team and has admin rights
  IF NOT EXISTS (
    SELECT 1 FROM members 
    WHERE team_id = team_id_param 
    AND email = user_email 
    AND status = 'active'
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: User does not have admin rights for this team';
  END IF;

  -- Update member visibility
  UPDATE members
  SET is_hidden = is_hidden_param
  WHERE id = member_id_param AND team_id = team_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stap 23: Functie om team settings op te halen (voor admins)
-- Drop existing function first to avoid conflicts
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
    SELECT 1 FROM members 
    WHERE team_id = team_id_param 
    AND email = user_email 
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied: User is not a member of this team';
  END IF;

  RETURN QUERY
  SELECT 
    t.id as team_id,
    t.name as team_name,
    t.slug as team_slug,
    t.invite_code as team_invite_code,
    t.is_password_protected as team_is_password_protected,
    t.created_at as team_created_at,
    COUNT(m.id) as member_count,
    COUNT(m.id) FILTER (WHERE m.is_hidden = TRUE) as hidden_member_count,
    (SELECT m2.role = 'admin' FROM members m2 WHERE m2.team_id = team_id_param AND m2.email = user_email) as user_is_admin,
    (t.created_by IS NOT NULL AND au.email = user_email) as user_is_creator
  FROM teams t
  LEFT JOIN members m ON t.id = m.team_id
  LEFT JOIN auth.users au ON t.created_by = au.id
  WHERE t.id = team_id_param
  GROUP BY t.id, t.name, t.slug, t.invite_code, t.is_password_protected, t.created_at, t.created_by, au.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
