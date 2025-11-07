-- Fix for "Database error saving new user" during signup
-- This script creates the necessary trigger to automatically create a user profile
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- STEP 1: Create or update the users table
-- If table exists, this will only add missing columns
CREATE TABLE IF NOT EXISTS public.users (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  profile_image_url text,
  birth_date date,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add columns if they don't exist (safe for existing tables)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'first_name') THEN
    ALTER TABLE public.users ADD COLUMN first_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'last_name') THEN
    ALTER TABLE public.users ADD COLUMN last_name text;
  END IF;
END $$;

-- STEP 2: Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Ensure table owner is postgres (owner bypasses RLS by default)
ALTER TABLE public.users OWNER TO postgres;

-- STEP 3: Create RLS policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.users;

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert their own profile (important for the trigger)
CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- STEP 4: Create the function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
    updated_at = timezone('utc'::text, now());
  
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth.users insert
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN new;
END;
$$;

-- Ensure function owner is postgres (matches owner-bypass expectations)
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- 5. Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 6. Create the trigger to automatically create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

-- 7b. Fallback insert policy to allow trigger to insert (in case owner-bypass is forced)
DROP POLICY IF EXISTS "Users insert via trigger (postgres)" ON public.users;
CREATE POLICY "Users insert via trigger (postgres)" ON public.users
  FOR INSERT TO postgres
  WITH CHECK (true);

-- Verification query (optional - you can run this separately to check)
-- SELECT 
--   trigger_name, 
--   event_manipulation, 
--   event_object_table, 
--   action_statement
-- FROM information_schema.triggers
-- WHERE trigger_name = 'on_auth_user_created';
