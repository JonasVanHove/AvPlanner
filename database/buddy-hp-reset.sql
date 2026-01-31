-- Add last_hp_reset_date column to track when HP was last restored
ALTER TABLE public.player_buddies 
ADD COLUMN IF NOT EXISTS last_hp_reset_date timestamp with time zone DEFAULT now();

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS player_buddies_last_hp_reset_date_idx 
ON public.player_buddies(last_hp_reset_date);

-- Create a function to reset HP for all buddies (weekly reset)
CREATE OR REPLACE FUNCTION reset_buddy_hp_if_needed()
RETURNS TABLE(buddy_id uuid, reset boolean) AS $$
DECLARE
  v_buddy RECORD;
  v_days_since_reset INTEGER;
BEGIN
  -- For each active buddy where last reset is not today or later
  FOR v_buddy IN 
    SELECT id, last_hp_reset_date, max_hp
    FROM player_buddies
    WHERE is_active = true
    AND (last_hp_reset_date IS NULL OR DATE(last_hp_reset_date) < CURRENT_DATE)
  LOOP
    -- Update HP to max and set reset date
    UPDATE player_buddies
    SET 
      current_hp = v_buddy.max_hp,
      last_hp_reset_date = NOW()
    WHERE id = v_buddy.id;
    
    buddy_id := v_buddy.id;
    reset := true;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get time until next HP reset (for the UI countdown)
CREATE OR REPLACE FUNCTION get_time_until_next_hp_reset(buddy_id_param uuid)
RETURNS TABLE(
  next_reset_timestamp timestamp with time zone,
  hours_remaining INTEGER,
  minutes_remaining INTEGER,
  seconds_remaining INTEGER
) AS $$
DECLARE
  v_last_reset timestamp with time zone;
  v_next_reset timestamp with time zone;
BEGIN
  -- Get the last reset date for this buddy
  SELECT last_hp_reset_date INTO v_last_reset
  FROM player_buddies
  WHERE id = buddy_id_param;
  
  -- If no reset date, next reset is today
  IF v_last_reset IS NULL THEN
    v_next_reset := DATE_TRUNC('day', CURRENT_TIMESTAMP) + INTERVAL '1 day';
  ELSE
    -- Next reset is 24 hours after last reset
    v_next_reset := v_last_reset + INTERVAL '1 day';
  END IF;
  
  -- If next reset has already passed, set it for tomorrow
  IF v_next_reset <= CURRENT_TIMESTAMP THEN
    v_next_reset := DATE_TRUNC('day', CURRENT_TIMESTAMP) + INTERVAL '1 day';
  END IF;
  
  next_reset_timestamp := v_next_reset;
  hours_remaining := EXTRACT(EPOCH FROM (v_next_reset - CURRENT_TIMESTAMP))::INTEGER / 3600;
  minutes_remaining := (EXTRACT(EPOCH FROM (v_next_reset - CURRENT_TIMESTAMP))::INTEGER % 3600) / 60;
  seconds_remaining := EXTRACT(EPOCH FROM (v_next_reset - CURRENT_TIMESTAMP))::INTEGER % 60;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
