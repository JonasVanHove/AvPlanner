-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create members table
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create availability table
CREATE TABLE IF NOT EXISTS availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'remote', 'maybe', 'unavailable', 'holiday')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(member_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug);
CREATE INDEX IF NOT EXISTS idx_members_team_id ON members(team_id);
CREATE INDEX IF NOT EXISTS idx_availability_member_date ON availability(member_id, date);
