-- Add password support and unique invite codes for teams
-- This script adds password protection and unique invite codes instead of public slugs

-- Remove any unique constraints on name column to allow duplicate team names
-- But keep slug unique for friendly URLs
ALTER TABLE teams 
DROP CONSTRAINT IF EXISTS teams_name_key;

-- Add password and invite_code columns to teams table
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_password_protected BOOLEAN DEFAULT FALSE;

-- Make slug column nullable if it exists (since we're using invite_code now)
ALTER TABLE teams 
ALTER COLUMN slug DROP NOT NULL;

-- Drop existing unique constraint if it exists
ALTER TABLE teams 
DROP CONSTRAINT IF EXISTS teams_slug_key;

-- Add a partial unique constraint for slug (only when not null)
CREATE UNIQUE INDEX IF NOT EXISTS teams_slug_unique_idx ON teams(slug) WHERE slug IS NOT NULL;

-- Generate unique invite codes for existing teams (8 character random strings)
UPDATE teams 
SET invite_code = encode(gen_random_bytes(4), 'hex')
WHERE invite_code IS NULL;

-- Make invite_code NOT NULL after setting values
ALTER TABLE teams 
ALTER COLUMN invite_code SET NOT NULL;

-- Create index for invite_code
CREATE INDEX IF NOT EXISTS idx_teams_invite_code ON teams(invite_code);

-- Add function to generate unique invite codes
CREATE OR REPLACE FUNCTION generate_unique_invite_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8 character random code
    code := encode(gen_random_bytes(4), 'hex');
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM teams WHERE invite_code = code) INTO exists;
    
    -- If code is unique, exit loop
    IF NOT exists THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate invite codes for new teams
CREATE OR REPLACE FUNCTION set_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := generate_unique_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_invite_code ON teams;
CREATE TRIGGER trigger_set_invite_code
  BEFORE INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION set_invite_code();
