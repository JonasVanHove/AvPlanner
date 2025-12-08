-- RLS Policies to allow users to create and manage their own buddies
-- This is required if the API cannot use the Service Role Key

-- 1. Enable RLS
ALTER TABLE player_buddies ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- 2. Policies for player_buddies

-- View: Users can see buddies that belong to their member profile
DROP POLICY IF EXISTS "Users can view their own buddies" ON player_buddies;
CREATE POLICY "Users can view their own buddies"
ON player_buddies FOR SELECT
USING (
  member_id IN (
    SELECT id FROM members WHERE auth_user_id = auth.uid()
  )
);

-- Create: Users can create a buddy for their member profile
DROP POLICY IF EXISTS "Users can create their own buddies" ON player_buddies;
CREATE POLICY "Users can create their own buddies"
ON player_buddies FOR INSERT
WITH CHECK (
  member_id IN (
    SELECT id FROM members WHERE auth_user_id = auth.uid()
  )
);

-- Update: Users can update their own buddies
DROP POLICY IF EXISTS "Users can update their own buddies" ON player_buddies;
CREATE POLICY "Users can update their own buddies"
ON player_buddies FOR UPDATE
USING (
  member_id IN (
    SELECT id FROM members WHERE auth_user_id = auth.uid()
  )
);

-- 3. Policies for members (needed for the subqueries above and member lookup)

-- View: Users can see their own member record
DROP POLICY IF EXISTS "Users can view their own member record" ON members;
CREATE POLICY "Users can view their own member record"
ON members FOR SELECT
USING (
  auth_user_id = auth.uid()
);
