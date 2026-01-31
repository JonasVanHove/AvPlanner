-- =====================================================
-- BUDDY BATTLE - Add Heal Center Support
-- Adds last_healed_at column for daily heal tracking
-- =====================================================

-- Add last_healed_at column to player_buddies
ALTER TABLE public.player_buddies 
ADD COLUMN IF NOT EXISTS last_healed_at timestamp with time zone;

-- Add comment
COMMENT ON COLUMN public.player_buddies.last_healed_at IS 'Timestamp of last free daily heal at Heal Center';

-- Confirmation message
DO $$
BEGIN
  RAISE NOTICE 'last_healed_at column added to player_buddies table';
END $$;
