-- Safe Database Migration for AvPlanner
-- This script safely creates missing tables without affecting existing data

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create countries table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.countries (
  code character varying NOT NULL,
  name character varying NOT NULL,
  name_nl character varying,
  name_fr character varying,
  CONSTRAINT countries_pkey PRIMARY KEY (code)
);

-- Insert basic country data if table is empty
INSERT INTO public.countries (code, name, name_nl, name_fr) VALUES
('BE', 'Belgium', 'België', 'Belgique'),
('NL', 'Netherlands', 'Nederland', 'Pays-Bas'),
('FR', 'France', 'Frankrijk', 'France'),
('DE', 'Germany', 'Duitsland', 'Allemagne'),
('UK', 'United Kingdom', 'Verenigd Koninkrijk', 'Royaume-Uni')
ON CONFLICT (code) DO NOTHING;

-- Create teams table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text,
  created_at timestamp with time zone DEFAULT now(),
  password_hash text,
  invite_code text NOT NULL,
  is_password_protected boolean DEFAULT false,
  status text DEFAULT 'active'::text,
  archived_at timestamp with time zone,
  archived_by text,
  created_by uuid,
  auto_holidays_enabled boolean DEFAULT false,
  CONSTRAINT teams_pkey PRIMARY KEY (id),
  CONSTRAINT teams_invite_code_key UNIQUE (invite_code),
  CONSTRAINT teams_status_check CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text]))
);

-- Add foreign key constraint for created_by if auth.users exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'teams_created_by_fkey' 
                      AND table_name = 'teams') THEN
            ALTER TABLE public.teams 
            ADD CONSTRAINT teams_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES auth.users(id);
        END IF;
    END IF;
END $$;

-- Create members table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  first_name text NOT NULL,
  last_name text,
  email text,
  profile_image text,
  auth_user_id uuid,
  profile_image_url text,
  status text DEFAULT 'active'::text,
  last_active timestamp with time zone DEFAULT now(),
  role text DEFAULT 'member'::text,
  order_index integer DEFAULT 0,
  is_hidden boolean DEFAULT false,
  country_code character varying DEFAULT 'BE'::character varying,
  CONSTRAINT members_pkey PRIMARY KEY (id),
  CONSTRAINT members_status_check CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'left'::text])),
  CONSTRAINT members_role_check CHECK (role = ANY (ARRAY['member'::text, 'admin'::text, 'can_edit'::text]))
);

-- Add foreign key constraints for members table
DO $$
BEGIN
    -- Add team_id foreign key
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                  WHERE constraint_name = 'members_team_id_fkey' 
                  AND table_name = 'members') THEN
        ALTER TABLE public.members 
        ADD CONSTRAINT members_team_id_fkey 
        FOREIGN KEY (team_id) REFERENCES public.teams(id);
    END IF;
    
    -- Add auth_user_id foreign key if auth.users exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'members_auth_user_id_fkey' 
                      AND table_name = 'members') THEN
            ALTER TABLE public.members 
            ADD CONSTRAINT members_auth_user_id_fkey 
            FOREIGN KEY (auth_user_id) REFERENCES auth.users(id);
        END IF;
    END IF;
    
    -- Add country_code foreign key
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                  WHERE constraint_name = 'members_country_code_fkey' 
                  AND table_name = 'members') THEN
        ALTER TABLE public.members 
        ADD CONSTRAINT members_country_code_fkey 
        FOREIGN KEY (country_code) REFERENCES public.countries(code);
    END IF;
END $$;

-- Create availability table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.availability (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  member_id uuid,
  date date NOT NULL,
  status text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  changed_by_id uuid,
  auto_holiday boolean DEFAULT false,
  CONSTRAINT availability_pkey PRIMARY KEY (id),
  CONSTRAINT availability_status_check CHECK (status = ANY (ARRAY['available'::text, 'remote'::text, 'unavailable'::text, 'need_to_check'::text, 'absent'::text, 'holiday'::text, 'maybe'::text]))
);

-- Add foreign key for availability table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                  WHERE constraint_name = 'availability_member_id_fkey' 
                  AND table_name = 'availability') THEN
        ALTER TABLE public.availability 
        ADD CONSTRAINT availability_member_id_fkey 
        FOREIGN KEY (member_id) REFERENCES public.members(id);
    END IF;
END $$;

-- Create holidays table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.holidays (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  country_code character varying NOT NULL,
  date date NOT NULL,
  name character varying NOT NULL,
  is_official boolean DEFAULT true,
  custom boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT holidays_pkey PRIMARY KEY (id)
);

-- Add foreign key for holidays table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                  WHERE constraint_name = 'holidays_country_code_fkey' 
                  AND table_name = 'holidays') THEN
        ALTER TABLE public.holidays 
        ADD CONSTRAINT holidays_country_code_fkey 
        FOREIGN KEY (country_code) REFERENCES public.countries(code);
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teams_status ON public.teams(status);
CREATE INDEX IF NOT EXISTS idx_teams_invite_code ON public.teams(invite_code);
CREATE INDEX IF NOT EXISTS idx_members_team_id ON public.members(team_id);
CREATE INDEX IF NOT EXISTS idx_members_auth_user_id ON public.members(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_availability_member_id ON public.availability(member_id);
CREATE INDEX IF NOT EXISTS idx_availability_date ON public.availability(date);
CREATE INDEX IF NOT EXISTS idx_holidays_country_date ON public.holidays(country_code, date);

SELECT 'Database tables created successfully! All existing data preserved.' as result;