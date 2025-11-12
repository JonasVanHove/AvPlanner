-- Update user_badges table to include new activity badge types
-- This script updates the CHECK constraint to allow activity badges

-- First, drop the old constraint
ALTER TABLE public.user_badges 
DROP CONSTRAINT IF EXISTS user_badges_badge_type_check;

-- Add the new constraint with all badge types
ALTER TABLE public.user_badges
ADD CONSTRAINT user_badges_badge_type_check 
CHECK (badge_type IN (
  'timely_completion',
  'helped_other',
  'streak_3',
  'streak_10',
  'perfect_month',
  'activity_10',
  'activity_50',
  'activity_100',
  'activity_500',
  'activity_1000'
));

-- Verify the constraint was updated
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.user_badges'::regclass 
AND conname = 'user_badges_badge_type_check';
