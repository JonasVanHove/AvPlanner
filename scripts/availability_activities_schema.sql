-- Add updated_at column to availability table if it doesn't exist
ALTER TABLE availability ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for efficient queries on availability updates
CREATE INDEX IF NOT EXISTS idx_availability_updated_at ON availability(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_availability_member_date ON availability(member_id, date);

-- Create trigger to update the updated_at column when availability changes
CREATE OR REPLACE FUNCTION update_availability_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_update_availability_timestamp ON availability;
CREATE TRIGGER trigger_update_availability_timestamp
  BEFORE UPDATE ON availability
  FOR EACH ROW
  EXECUTE FUNCTION update_availability_timestamp();

-- Function to get recent availability changes for a team (admin only)
CREATE OR REPLACE FUNCTION get_team_activities(
  target_team_id UUID,
  days_back INTEGER DEFAULT 7,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  activity_id TEXT,
  member_name TEXT,
  member_email TEXT,
  activity_date DATE,
  current_status TEXT,
  changed_at TIMESTAMP WITH TIME ZONE,
  profile_image_url TEXT
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is admin of the team
  IF NOT EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.team_id = target_team_id 
    AND tm.member_email = auth.jwt() ->> 'email'
    AND tm.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Only team admins can view activity logs';
  END IF;

  RETURN QUERY
  SELECT 
    a.id::TEXT as activity_id,
    COALESCE(m.name, m.email) as member_name,
    m.email as member_email,
    a.date as activity_date,
    a.status as current_status,
    COALESCE(a.updated_at, a.created_at) as changed_at,
    m.profile_image_url
  FROM availability a
  JOIN members m ON a.member_id = m.id
  JOIN team_members tm ON m.id = tm.member_id
  WHERE tm.team_id = target_team_id
    AND COALESCE(a.updated_at, a.created_at) >= (NOW() - INTERVAL '%s days', days_back)
  ORDER BY COALESCE(a.updated_at, a.created_at) DESC
  LIMIT limit_count;
END;
$$;

-- Function to get availability changes with member details for admin dashboard
CREATE OR REPLACE FUNCTION get_recent_team_availability_changes(
  target_team_id UUID,
  days_back INTEGER DEFAULT 7,
  limit_count INTEGER DEFAULT 50
)
RETURNS JSON
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if user is admin of the team
  IF NOT EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.team_id = target_team_id 
    AND tm.member_email = auth.jwt() ->> 'email'
    AND tm.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Only team admins can view activity logs';
  END IF;

  -- Get recent availability changes as JSON
  SELECT json_agg(
    json_build_object(
      'idx', row_number() OVER (ORDER BY COALESCE(a.updated_at, a.created_at) DESC) - 1,
      'id', a.id,
      'member_id', a.member_id,
      'member_name', COALESCE(m.name, m.email),
      'member_email', m.email,
      'profile_image_url', m.profile_image_url,
      'date', a.date,
      'status', a.status,
      'created_at', a.created_at,
      'updated_at', a.updated_at
    ) ORDER BY COALESCE(a.updated_at, a.created_at) DESC
  ) INTO result
  FROM availability a
  JOIN members m ON a.member_id = m.id
  JOIN team_members tm ON m.id = tm.member_id
  WHERE tm.team_id = target_team_id
    AND COALESCE(a.updated_at, a.created_at) >= (NOW() - INTERVAL '%s days', days_back)
  LIMIT limit_count;

  RETURN COALESCE(result, '[]'::JSON);
END;
$$;