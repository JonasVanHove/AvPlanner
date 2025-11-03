-- Add birth_date column to members and create v2 profile update function
BEGIN;

-- 1) Add birth_date to members if not exists
ALTER TABLE members
ADD COLUMN IF NOT EXISTS birth_date date;

-- 2) New function: update_user_profile_v2 with birth date support and safe COALESCE updates
DROP FUNCTION IF EXISTS update_user_profile_v2(text, text, text, text, date);
CREATE OR REPLACE FUNCTION update_user_profile_v2(
  user_email text,
  new_first_name text DEFAULT NULL,
  new_last_name text DEFAULT NULL,
  new_profile_image text DEFAULT NULL,
  new_birth_date date DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  updated_count integer := 0;
BEGIN
  UPDATE members 
  SET 
    first_name = COALESCE(new_first_name, first_name),
    last_name = COALESCE(new_last_name, last_name),
    profile_image = COALESCE(new_profile_image, profile_image),
    birth_date = COALESCE(new_birth_date, birth_date),
    last_active = now()
  WHERE email = user_email OR auth_user_id = (SELECT id FROM auth.users WHERE email = user_email);

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'updated_records', updated_count
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grants
GRANT EXECUTE ON FUNCTION update_user_profile_v2(text, text, text, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_profile_v2(text, text, text, text, date) TO anon;

COMMIT;
