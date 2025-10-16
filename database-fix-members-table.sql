-- Simple script to add missing constraints to existing members table
-- Use this if the members table exists but is missing constraints/indexes

-- Add profile image URL validation constraint if validate_profile_image_url function exists
DO $$ 
BEGIN
    -- Check if the function exists before adding constraint
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_profile_image_url') THEN
        -- Add constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'members_profile_image_url_check'
        ) THEN
            ALTER TABLE members ADD CONSTRAINT members_profile_image_url_check 
                CHECK (validate_profile_image_url(profile_image_url));
        END IF;
    END IF;
END $$;

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_members_team_id ON members(team_id);
CREATE INDEX IF NOT EXISTS idx_members_auth_user_id ON members(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);

-- Enable RLS if not already enabled
ALTER TABLE members ENABLE ROW LEVEL SECURITY;