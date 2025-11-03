-- Create the members table if it doesn't exist
-- This should match the structure referenced in your application

CREATE TABLE IF NOT EXISTS public.members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id uuid NOT NULL,
    auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    profile_image_url text,
    last_active timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    
    -- Ensure team_id references teams table if it exists
    CONSTRAINT fk_members_team_id FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate emails per team
    CONSTRAINT unique_email_per_team UNIQUE (team_id, email),
    
    -- Unique constraint for auth_user_id per team (a user can only be in a team once)
    CONSTRAINT unique_auth_user_per_team UNIQUE (team_id, auth_user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_members_team_id ON members(team_id);
CREATE INDEX IF NOT EXISTS idx_members_auth_user_id ON members(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_members_updated_at 
    BEFORE UPDATE ON members 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can see members of teams they belong to
CREATE POLICY "Users can view team members" ON members
    FOR SELECT USING (
        auth.uid() IN (
            SELECT auth_user_id 
            FROM members m2 
            WHERE m2.team_id = members.team_id 
            AND m2.status = 'active'
        )
    );

-- Users can update their own member record
CREATE POLICY "Users can update own member record" ON members
    FOR UPDATE USING (auth_user_id = auth.uid());

-- Team admins can insert new members
CREATE POLICY "Team admins can insert members" ON members
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT auth_user_id 
            FROM members m2 
            WHERE m2.team_id = members.team_id 
            AND m2.role = 'admin' 
            AND m2.status = 'active'
        )
    );

-- Team admins can update members in their team
CREATE POLICY "Team admins can update team members" ON members
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT auth_user_id 
            FROM members m2 
            WHERE m2.team_id = members.team_id 
            AND m2.role = 'admin' 
            AND m2.status = 'active'
        )
    );

-- Team admins can delete members from their team
CREATE POLICY "Team admins can delete team members" ON members
    FOR DELETE USING (
        auth.uid() IN (
            SELECT auth_user_id 
            FROM members m2 
            WHERE m2.team_id = members.team_id 
            AND m2.role = 'admin' 
            AND m2.status = 'active'
        )
    );

-- Grant necessary permissions
GRANT ALL ON members TO authenticated;
GRANT SELECT ON members TO anon;