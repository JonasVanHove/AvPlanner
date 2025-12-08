-- =====================================================
-- BUDDY BATTLE - HP TRACKING MIGRATION
-- Adds HP tracking columns to buddy_battles table
-- =====================================================

-- Add HP tracking columns
ALTER TABLE public.buddy_battles 
ADD COLUMN IF NOT EXISTS challenger_hp integer,
ADD COLUMN IF NOT EXISTS opponent_hp integer,
ADD COLUMN IF NOT EXISTS current_turn integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS active_effects jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS player_cooldowns jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS opponent_cooldowns jsonb DEFAULT '{}'::jsonb;

-- Add comments
COMMENT ON COLUMN public.buddy_battles.challenger_hp IS 'Current HP of the challenger buddy during battle';
COMMENT ON COLUMN public.buddy_battles.opponent_hp IS 'Current HP of the opponent (buddy or NPC) during battle';
COMMENT ON COLUMN public.buddy_battles.current_turn IS 'Current turn number in the battle';
COMMENT ON COLUMN public.buddy_battles.active_effects IS 'Active status effects (buffs/debuffs) during battle';
COMMENT ON COLUMN public.buddy_battles.player_cooldowns IS 'Ability cooldowns for the player';
COMMENT ON COLUMN public.buddy_battles.opponent_cooldowns IS 'Ability cooldowns for the opponent';

-- Also make sure RLS is disabled (for anon key access)
ALTER TABLE public.buddy_battles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_buddies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_abilities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_type_abilities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_trainer_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.boss_battle_attempts DISABLE ROW LEVEL SECURITY;

-- Confirmation message
DO $$
BEGIN
  RAISE NOTICE 'HP tracking columns added to buddy_battles table';
  RAISE NOTICE 'RLS disabled on all buddy battle tables';
END $$;
