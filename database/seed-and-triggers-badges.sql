-- Seed and triggers for user_badges
-- 1) Seed existing members by running check_and_award_badges(member_id, team_id)
-- 2) Add trigger to run check_and_award_badges on availability INSERT/UPDATE

BEGIN;

-- 1) Seed badges for all existing members (idempotent)
DO $$
DECLARE
  r RECORD;
  v_res JSONB;
BEGIN
  RAISE NOTICE 'Seeding badges for existing members...';
  FOR r IN SELECT id, team_id FROM public.members LOOP
    -- call the function that checks and awards badges for this member/team
    BEGIN
      v_res := check_and_award_badges(r.id, r.team_id);
      RAISE NOTICE 'Processed member % (team %): %', r.id, r.team_id, v_res;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed processing member %: %', r.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- 2) Trigger function to evaluate badges when availability changes
CREATE OR REPLACE FUNCTION public.trigger_check_and_award_on_availability()
RETURNS trigger AS $$
DECLARE
  v_team_id UUID;
BEGIN
  -- Determine the team for the member
  SELECT team_id INTO v_team_id FROM public.members WHERE id = NEW.member_id;

  IF v_team_id IS NOT NULL THEN
    -- Run the badge-check function; ignore result
    PERFORM check_and_award_badges(NEW.member_id, v_team_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on availability: run after insert or when status/changed_by_id updates
DROP TRIGGER IF EXISTS trg_award_badges_on_availability ON public.availability;
CREATE TRIGGER trg_award_badges_on_availability
AFTER INSERT OR UPDATE OF status, changed_by_id ON public.availability
FOR EACH ROW
EXECUTE FUNCTION public.trigger_check_and_award_on_availability();

COMMIT;

-- Notes:
-- - Run this file once after deploying the gamification schema to populate the
--   `user_badges` table for existing members.
-- - The trigger will ensure badge checks run whenever availability rows are inserted
--   or when the status/changed_by_id columns are updated.
-- - This script intentionally uses the server-side functions defined in
--   `gamification-schema.sql` (check_and_award_badges, etc.). Ensure those
--   functions exist before applying this migration.
