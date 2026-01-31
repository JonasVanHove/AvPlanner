-- =====================================================
-- BUDDY BATTLE - Recalculate Points from Availability
-- This script recalculates total_points_earned for all buddies
-- based on their member's availability history
-- =====================================================

-- Point values per availability status
-- available = 2 pts, remote = 2 pts
-- unavailable = 1 pt, holiday = 1 pt, absent = 1 pt
-- need_to_check = 0 pts, maybe = 0 pts

-- Create or replace function to calculate points for a member
CREATE OR REPLACE FUNCTION calculate_availability_points(p_member_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total_points INTEGER := 0;
  v_today DATE := CURRENT_DATE;
BEGIN
  SELECT COALESCE(SUM(
    CASE 
      WHEN status IN ('available', 'remote') THEN 2
      WHEN status IN ('unavailable', 'holiday', 'absent') THEN 1
      ELSE 0
    END
  ), 0)
  INTO v_total_points
  FROM availability
  WHERE member_id = p_member_id
    AND date <= v_today;
    
  RETURN v_total_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update function to sync buddy points with availability
CREATE OR REPLACE FUNCTION sync_buddy_points_from_availability()
RETURNS void AS $$
DECLARE
  v_buddy RECORD;
  v_earned INTEGER;
BEGIN
  FOR v_buddy IN 
    SELECT pb.id, pb.member_id, pb.total_points_spent
    FROM player_buddies pb
  LOOP
    -- Calculate earned points from availability
    v_earned := calculate_availability_points(v_buddy.member_id);
    
    -- Update buddy with calculated points
    UPDATE player_buddies
    SET 
      total_points_earned = v_earned,
      available_points = GREATEST(0, v_earned - total_points_spent)
    WHERE id = v_buddy.id;
    
    RAISE NOTICE 'Updated buddy %: earned=%, available=%', 
      v_buddy.id, v_earned, GREATEST(0, v_earned - v_buddy.total_points_spent);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Create a trigger to automatically update points when availability changes
CREATE OR REPLACE FUNCTION trigger_update_buddy_points_on_availability()
RETURNS TRIGGER AS $$
DECLARE
  v_buddy_id UUID;
  v_earned INTEGER;
  v_spent INTEGER;
BEGIN
  -- Find the buddy for this member
  SELECT id, total_points_spent INTO v_buddy_id, v_spent
  FROM player_buddies
  WHERE member_id = COALESCE(NEW.member_id, OLD.member_id)
  LIMIT 1;
  
  IF v_buddy_id IS NOT NULL THEN
    -- Recalculate points
    v_earned := calculate_availability_points(COALESCE(NEW.member_id, OLD.member_id));
    
    -- Update buddy
    UPDATE player_buddies
    SET 
      total_points_earned = v_earned,
      available_points = GREATEST(0, v_earned - v_spent)
    WHERE id = v_buddy_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_update_buddy_points ON availability;

-- Create trigger
CREATE TRIGGER trg_update_buddy_points
AFTER INSERT OR UPDATE OR DELETE ON availability
FOR EACH ROW
EXECUTE FUNCTION trigger_update_buddy_points_on_availability();

-- Run the sync function to update all existing buddies
SELECT sync_buddy_points_from_availability();

-- Verify results
SELECT 
  pb.id,
  m.first_name || ' ' || m.last_name as member_name,
  pb.total_points_earned,
  pb.total_points_spent,
  pb.available_points,
  (SELECT COUNT(*) FROM availability WHERE member_id = pb.member_id AND date <= CURRENT_DATE) as total_availability_records
FROM player_buddies pb
JOIN members m ON pb.member_id = m.id
ORDER BY m.first_name;
