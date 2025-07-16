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

-- Voeg indexen toe voor betere prestaties
CREATE INDEX IF NOT EXISTS idx_members_auth_user_id ON members(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_members_role ON members(role);
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON teams(created_by);

-- Functie om teams voor een gebruiker op te halen
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
