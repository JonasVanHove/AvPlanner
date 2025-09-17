-- STAP 1: Voeg authenticatie ondersteuning toe aan de database
-- Kopieer en plak dit in je Supabase SQL Editor

-- Voeg auth_user_id kolom toe aan members tabel
ALTER TABLE members ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Voeg role kolom toe aan members tabel
ALTER TABLE members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'can_edit'));

-- Voeg created_by kolom toe aan teams tabel (nullable voor backwards compatibility)
ALTER TABLE teams ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Voeg invite_code kolom toe aan teams tabel als die nog niet bestaat
ALTER TABLE teams ADD COLUMN IF NOT EXISTS invite_code TEXT;

-- Voeg password_hash kolom toe aan teams tabel als die nog niet bestaat
ALTER TABLE teams ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Voeg is_password_protected kolom toe aan teams tabel als die nog niet bestaat
ALTER TABLE teams ADD COLUMN IF NOT EXISTS is_password_protected BOOLEAN DEFAULT FALSE;

-- Voeg email kolom toe aan members tabel als die nog niet bestaat
ALTER TABLE members ADD COLUMN IF NOT EXISTS email TEXT;

-- Voeg first_name en last_name kolommen toe aan members tabel als die nog niet bestaan
ALTER TABLE members ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Maak een aparte admin_users tabel voor admin toegang
-- Dit is nodig omdat we geen directe toegang hebben tot auth.users wijzigingen
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  granted_by TEXT,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id),
  UNIQUE(email)
);

-- Voeg indexen toe voor betere prestaties
CREATE INDEX IF NOT EXISTS idx_members_auth_user_id ON members(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_members_role ON members(role);
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON teams(created_by);
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);

-- Functie om teams voor een gebruiker op te halen
-- Drop bestaande functie eerst om return type conflict te vermijden
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
  is_creator BOOLEAN
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
    (t.created_by IS NOT NULL AND au.email = user_email) as is_creator
  FROM teams t
  INNER JOIN members m ON t.id = m.team_id
  LEFT JOIN members m2 ON t.id = m2.team_id
  LEFT JOIN auth.users au ON t.created_by = au.id
  WHERE m.email = user_email
  GROUP BY t.id, t.name, t.slug, t.invite_code, t.is_password_protected, t.created_at, m.role, t.created_by, au.email
  ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Functie om team leden met rollen op te halen (voor admin management)
-- Drop bestaande functie eerst om return type conflict te vermijden
DROP FUNCTION IF EXISTS get_team_members_with_roles(UUID, TEXT);

CREATE OR REPLACE FUNCTION get_team_members_with_roles(team_id_param UUID, user_email TEXT)
RETURNS TABLE (
  member_id UUID,
  member_name TEXT,
  member_email TEXT,
  member_role TEXT,
  can_edit_availability BOOLEAN,
  joined_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Check if user is admin or creator of the team
  IF NOT EXISTS (
    SELECT 1 FROM members m
    JOIN teams t ON m.team_id = t.id
    LEFT JOIN auth.users au ON t.created_by = au.id
    WHERE m.email = user_email 
    AND t.id = team_id_param
    AND (m.role = 'admin' OR au.email = user_email)
  ) THEN
    RAISE EXCEPTION 'Access denied: User is not an admin of this team';
  END IF;

  RETURN QUERY
  SELECT 
    m.id,
    CONCAT(m.first_name, ' ', m.last_name) as member_name,
    m.email,
    COALESCE(m.role, 'member'::TEXT) as member_role,
    (m.role IN ('admin', 'can_edit')) as can_edit_availability,
    m.created_at
  FROM members m
  WHERE m.team_id = team_id_param
  ORDER BY 
    CASE m.role 
      WHEN 'admin' THEN 1
      WHEN 'can_edit' THEN 2
      ELSE 3
    END,
    m.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Functie om auth_user_id automatisch te linken aan bestaande members
CREATE OR REPLACE FUNCTION link_auth_user_to_members()
RETURNS TRIGGER AS $$
BEGIN
  -- Update alle members met dezelfde email om ze te linken aan de authenticated user
  UPDATE members 
  SET auth_user_id = NEW.id
  WHERE email = NEW.email AND auth_user_id IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger die automatisch auth_user_id linkt wanneer een user inlogt
CREATE OR REPLACE TRIGGER link_user_on_login
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION link_auth_user_to_members();

-- Functie om handmatig auth_user_id te linken (voor bestaande users)
CREATE OR REPLACE FUNCTION manual_link_auth_user(user_email TEXT)
RETURNS INTEGER AS $$
DECLARE
  user_id UUID;
  updated_count INTEGER;
BEGIN
  -- Vind de auth user ID
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found in auth.users', user_email;
  END IF;
  
  -- Update members met deze email
  UPDATE members 
  SET auth_user_id = user_id
  WHERE email = user_email AND auth_user_id IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Functie om een team aan te maken en creator automatisch toe te voegen als member
-- Drop bestaande functie eerst om return type conflict te vermijden
DROP FUNCTION IF EXISTS create_team_with_creator(TEXT, TEXT, BOOLEAN, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_team_with_creator(
  team_name TEXT,
  team_slug TEXT DEFAULT NULL,
  is_password_protected BOOLEAN DEFAULT FALSE,
  password_hash TEXT DEFAULT NULL,
  creator_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  team_slug TEXT,
  team_invite_code TEXT,
  team_is_password_protected BOOLEAN
) AS $$
DECLARE
  new_team_id UUID;
  creator_user_id UUID;
  new_invite_code TEXT;
BEGIN
  -- Insert team (invite_code will be generated automatically by trigger)
  INSERT INTO teams (name, slug, is_password_protected, password_hash, created_by)
  VALUES (
    team_name,
    team_slug,
    is_password_protected,
    password_hash,
    CASE 
      WHEN creator_email IS NOT NULL THEN (
        SELECT id FROM auth.users WHERE email = creator_email
      )
      ELSE NULL
    END
  )
  RETURNING id, invite_code INTO new_team_id, new_invite_code;
  
  -- If creator email is provided, add them as admin member
  IF creator_email IS NOT NULL THEN
    -- Get user ID
    SELECT id INTO creator_user_id
    FROM auth.users
    WHERE email = creator_email;
    
    -- Add creator as admin member
    INSERT INTO members (team_id, email, role, auth_user_id, first_name, last_name)
    VALUES (
      new_team_id,
      creator_email,
      'admin',
      creator_user_id,
      COALESCE(
        (SELECT raw_user_meta_data->>'first_name' FROM auth.users WHERE email = creator_email),
        split_part(creator_email, '@', 1)
      ),
      COALESCE(
        (SELECT raw_user_meta_data->>'last_name' FROM auth.users WHERE email = creator_email),
        ''
      )
    );
  END IF;
  
  -- Return team info
  RETURN QUERY
  SELECT 
    new_team_id,
    team_name,
    team_slug,
    new_invite_code,
    is_password_protected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Functie om te controleren of een user admin is
CREATE OR REPLACE FUNCTION is_user_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  admin_status BOOLEAN;
BEGIN
  SELECT is_active INTO admin_status
  FROM admin_users
  WHERE email = user_email AND is_active = TRUE;
  
  RETURN COALESCE(admin_status, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Functie om een user admin te maken
CREATE OR REPLACE FUNCTION grant_admin_access(user_email TEXT, granted_by_email TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Vind de user ID
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Voeg toe aan admin_users tabel
  INSERT INTO admin_users (user_id, email, granted_by)
  VALUES (target_user_id, user_email, granted_by_email)
  ON CONFLICT (email) DO UPDATE SET
    is_active = TRUE,
    granted_by = granted_by_email,
    granted_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Functie om admin toegang in te trekken
CREATE OR REPLACE FUNCTION revoke_admin_access(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE admin_users
  SET is_active = FALSE
  WHERE email = user_email;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Functie om admin users op te halen (alleen voor admins)
CREATE OR REPLACE FUNCTION get_admin_users(user_email TEXT)
RETURNS TABLE (
  admin_email TEXT,
  admin_name TEXT,
  granted_by TEXT,
  granted_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN
) AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_user_admin(user_email) THEN
    RAISE EXCEPTION 'Access denied: User is not an admin';
  END IF;

  RETURN QUERY
  SELECT 
    au.email,
    COALESCE(
      CONCAT(u.raw_user_meta_data->>'first_name', ' ', u.raw_user_meta_data->>'last_name'),
      au.email
    ) as admin_name,
    au.granted_by,
    au.granted_at,
    au.is_active
  FROM admin_users au
  JOIN auth.users u ON au.user_id = u.id
  ORDER BY au.granted_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Functie om alle teams op te halen (alleen voor admins)
CREATE OR REPLACE FUNCTION get_all_teams_admin(user_email TEXT)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  team_slug TEXT,
  team_invite_code TEXT,
  team_is_password_protected BOOLEAN,
  team_created_at TIMESTAMP WITH TIME ZONE,
  member_count BIGINT,
  creator_email TEXT,
  creator_name TEXT
) AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_user_admin(user_email) THEN
    RAISE EXCEPTION 'Access denied: User is not an admin';
  END IF;

  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.slug,
    t.invite_code,
    t.is_password_protected,
    t.created_at,
    COUNT(m.id) as member_count,
    au.email as creator_email,
    COALESCE(
      CONCAT(au.raw_user_meta_data->>'first_name', ' ', au.raw_user_meta_data->>'last_name'),
      au.email
    ) as creator_name
  FROM teams t
  LEFT JOIN members m ON t.id = m.team_id
  LEFT JOIN auth.users au ON t.created_by = au.id
  GROUP BY t.id, t.name, t.slug, t.invite_code, t.is_password_protected, t.created_at, au.email, au.raw_user_meta_data
  ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Functie om een team te verwijderen (alleen voor admins)
CREATE OR REPLACE FUNCTION delete_team_admin(team_id_param UUID, user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  team_name TEXT;
  member_count INTEGER;
BEGIN
  -- Check if user is admin
  IF NOT is_user_admin(user_email) THEN
    RAISE EXCEPTION 'Access denied: User is not an admin';
  END IF;

  -- Get team info for logging
  SELECT name INTO team_name
  FROM teams
  WHERE id = team_id_param;
  
  IF team_name IS NULL THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  -- Get member count
  SELECT COUNT(*) INTO member_count
  FROM members
  WHERE team_id = team_id_param;

  -- Delete team (CASCADE will handle members and availability)
  DELETE FROM teams WHERE id = team_id_param;
  
  -- Log the deletion (you might want to add a log table later)
  RAISE NOTICE 'Admin % deleted team "%" (ID: %, Members: %)', user_email, team_name, team_id_param, member_count;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
