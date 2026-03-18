-- =====================================================
-- BUDDY BATTLE - Add last_healed_at Column
-- Tracks when a buddy was last healed (daily cooldown)
-- =====================================================

-- Add last_healed_at column to player_buddies
ALTER TABLE public.player_buddies 
ADD COLUMN IF NOT EXISTS last_healed_at timestamptz;

COMMENT ON COLUMN public.player_buddies.last_healed_at IS 'When the buddy was last healed (for daily heal cooldown)';

DO $$
BEGIN
  RAISE NOTICE 'Added last_healed_at column to player_buddies table';
END $$;
