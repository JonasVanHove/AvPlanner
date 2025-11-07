-- Create order move RPCs for members reordering within a team
-- Qualified table names to avoid schema ambiguity

-- 0) Ensure order_index column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'order_index'
  ) THEN
    ALTER TABLE public.members ADD COLUMN order_index integer DEFAULT 0;
    -- Initialize order_index per team by created_at if needed
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY team_id ORDER BY created_at, id) - 1 AS rn
      FROM public.members
    )
    UPDATE public.members m
    SET order_index = r.rn
    FROM ranked r
    WHERE r.id = m.id;
  END IF;
END$$;

-- Ensure we can redefine functions even if the return type changed previously
-- (Postgres cannot change a function's return type with CREATE OR REPLACE)
DROP FUNCTION IF EXISTS public.move_member_up(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.move_member_down(uuid, uuid, text);
-- Also drop potential older signatures without the optional email arg
DROP FUNCTION IF EXISTS public.move_member_up(uuid, uuid);
DROP FUNCTION IF EXISTS public.move_member_down(uuid, uuid);

-- 1) Move member up: swap with previous member by order_index within the same team
CREATE OR REPLACE FUNCTION public.move_member_up(
  team_id_param uuid,
  member_id_param uuid,
  user_email text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  cur_idx integer;
  prev_member_id uuid;
  prev_idx integer;
BEGIN
  -- Get current index
  SELECT order_index INTO cur_idx
  FROM public.members
  WHERE id = member_id_param AND team_id = team_id_param;

  IF cur_idx IS NULL THEN
    RAISE EXCEPTION 'Member not found or missing order_index';
  END IF;

  -- Find previous member
  SELECT id, order_index INTO prev_member_id, prev_idx
  FROM public.members
  WHERE team_id = team_id_param AND order_index < cur_idx
  ORDER BY order_index DESC
  LIMIT 1;

  IF prev_member_id IS NULL THEN
    -- Already at top
    RETURN;
  END IF;

  -- Swap indices atomically
  UPDATE public.members SET order_index = prev_idx WHERE id = member_id_param;
  UPDATE public.members SET order_index = cur_idx WHERE id = prev_member_id;
END;
$$;

-- 2) Move member down: swap with next member by order_index within the same team
CREATE OR REPLACE FUNCTION public.move_member_down(
  team_id_param uuid,
  member_id_param uuid,
  user_email text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  cur_idx integer;
  next_member_id uuid;
  next_idx integer;
BEGIN
  -- Get current index
  SELECT order_index INTO cur_idx
  FROM public.members
  WHERE id = member_id_param AND team_id = team_id_param;

  IF cur_idx IS NULL THEN
    RAISE EXCEPTION 'Member not found or missing order_index';
  END IF;

  -- Find next member
  SELECT id, order_index INTO next_member_id, next_idx
  FROM public.members
  WHERE team_id = team_id_param AND order_index > cur_idx
  ORDER BY order_index ASC
  LIMIT 1;

  IF next_member_id IS NULL THEN
    -- Already at bottom
    RETURN;
  END IF;

  -- Swap indices atomically
  UPDATE public.members SET order_index = next_idx WHERE id = member_id_param;
  UPDATE public.members SET order_index = cur_idx WHERE id = next_member_id;
END;
$$;

-- 3) Optional: Grant execute to anon/authenticated roles (Supabase default allows via RPC)
-- No explicit GRANT needed for PostgREST; ensure RLS allows UPDATE on public.members for caller.
