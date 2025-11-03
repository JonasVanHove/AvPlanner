-- Migration to fix database schema for Holiday Management
-- Run this SQL in your Supabase SQL editor

-- 1. Add multilingual columns to countries table
ALTER TABLE public.countries 
ADD COLUMN IF NOT EXISTS name_nl character varying,
ADD COLUMN IF NOT EXISTS name_fr character varying;

-- 2. Add unique constraint to availability table (if not exists)
ALTER TABLE public.availability 
DROP CONSTRAINT IF EXISTS availability_member_date_unique;

ALTER TABLE public.availability 
ADD CONSTRAINT availability_member_date_unique 
UNIQUE (member_id, date);

-- 3. Add foreign key constraint between members and countries
-- First, let's make sure all existing members have valid country codes
-- Set any invalid country_codes to 'BE' (Belgium) as default
UPDATE public.members 
SET country_code = 'BE' 
WHERE country_code NOT IN (SELECT code FROM public.countries) 
   OR country_code IS NULL;

-- Now add the foreign key constraint
ALTER TABLE public.members 
DROP CONSTRAINT IF EXISTS members_country_code_fkey;

ALTER TABLE public.members 
ADD CONSTRAINT members_country_code_fkey 
FOREIGN KEY (country_code) REFERENCES public.countries(code);

-- 4. Insert some basic countries if they don't exist
INSERT INTO public.countries (code, name, name_nl, name_fr) 
VALUES 
  ('BE', 'Belgium', 'België', 'Belgique'),
  ('NL', 'Netherlands', 'Nederland', 'Pays-Bas'),
  ('FR', 'France', 'Frankrijk', 'France'),
  ('DE', 'Germany', 'Duitsland', 'Allemagne'),
  ('UK', 'United Kingdom', 'Verenigd Koninkrijk', 'Royaume-Uni'),
  ('US', 'United States', 'Verenigde Staten', 'États-Unis'),
  ('ES', 'Spain', 'Spanje', 'Espagne'),
  ('IT', 'Italy', 'Italië', 'Italie')
ON CONFLICT (code) DO UPDATE SET
  name_nl = EXCLUDED.name_nl,
  name_fr = EXCLUDED.name_fr;

-- 5. Insert some sample holidays for Belgium (2024-2026)
INSERT INTO public.holidays (country_code, date, name, is_official) 
VALUES 
  -- Belgium 2024
  ('BE', '2024-01-01', 'New Year''s Day', true),
  ('BE', '2024-04-01', 'Easter Monday', true),
  ('BE', '2024-05-01', 'Labour Day', true),
  ('BE', '2024-05-09', 'Ascension Day', true),
  ('BE', '2024-05-20', 'Whit Monday', true),
  ('BE', '2024-07-21', 'National Day', true),
  ('BE', '2024-08-15', 'Assumption of Mary', true),
  ('BE', '2024-11-01', 'All Saints'' Day', true),
  ('BE', '2024-11-11', 'Armistice Day', true),
  ('BE', '2024-12-25', 'Christmas Day', true),
  
  -- Belgium 2025
  ('BE', '2025-01-01', 'New Year''s Day', true),
  ('BE', '2025-04-21', 'Easter Monday', true),
  ('BE', '2025-05-01', 'Labour Day', true),
  ('BE', '2025-05-29', 'Ascension Day', true),
  ('BE', '2025-06-09', 'Whit Monday', true),
  ('BE', '2025-07-21', 'National Day', true),
  ('BE', '2025-08-15', 'Assumption of Mary', true),
  ('BE', '2025-11-01', 'All Saints'' Day', true),
  ('BE', '2025-11-11', 'Armistice Day', true),
  ('BE', '2025-12-25', 'Christmas Day', true),
  
  -- Netherlands 2024
  ('NL', '2024-01-01', 'New Year''s Day', true),
  ('NL', '2024-03-29', 'Good Friday', true),
  ('NL', '2024-04-01', 'Easter Monday', true),
  ('NL', '2024-04-27', 'King''s Day', true),
  ('NL', '2024-05-05', 'Liberation Day', true),
  ('NL', '2024-05-09', 'Ascension Day', true),
  ('NL', '2024-05-20', 'Whit Monday', true),
  ('NL', '2024-12-25', 'Christmas Day', true),
  ('NL', '2024-12-26', 'Boxing Day', true),
  
  -- Netherlands 2025
  ('NL', '2025-01-01', 'New Year''s Day', true),
  ('NL', '2025-04-18', 'Good Friday', true),
  ('NL', '2025-04-21', 'Easter Monday', true),
  ('NL', '2025-04-27', 'King''s Day', true),
  ('NL', '2025-05-05', 'Liberation Day', true),
  ('NL', '2025-05-29', 'Ascension Day', true),
  ('NL', '2025-06-09', 'Whit Monday', true),
  ('NL', '2025-12-25', 'Christmas Day', true),
  ('NL', '2025-12-26', 'Boxing Day', true)
ON CONFLICT DO NOTHING;

-- 6. Create RPC functions for holiday management

-- Drop existing functions first to avoid type conflicts
DROP FUNCTION IF EXISTS public.get_team_upcoming_holidays(uuid, integer);
DROP FUNCTION IF EXISTS public.apply_auto_holidays(uuid, date, date);
DROP FUNCTION IF EXISTS public.remove_auto_holidays(uuid, date, date);

-- Function to get upcoming holidays for a team
CREATE OR REPLACE FUNCTION public.get_team_upcoming_holidays(
  target_team_id uuid,
  days_ahead integer DEFAULT 365
)
RETURNS TABLE (
  holiday_id uuid,
  holiday_name text,
  holiday_date date,
  country_code text,
  country_name text,
  member_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id as holiday_id,
    h.name as holiday_name,
    h.date as holiday_date,
    h.country_code,
    c.name as country_name,
    COUNT(m.id) as member_count
  FROM public.holidays h
  JOIN public.countries c ON h.country_code = c.code
  JOIN public.members m ON m.country_code = h.country_code 
    AND m.team_id = target_team_id 
    AND m.status = 'active'
  WHERE h.date BETWEEN CURRENT_DATE AND (CURRENT_DATE + days_ahead * INTERVAL '1 day')
  GROUP BY h.id, h.name, h.date, h.country_code, c.name
  ORDER BY h.date;
END;
$$;

-- Function to apply auto holidays for a team
CREATE OR REPLACE FUNCTION public.apply_auto_holidays(
  target_team_id uuid,
  start_date date DEFAULT CURRENT_DATE,
  end_date date DEFAULT (CURRENT_DATE + INTERVAL '1 year')
)
RETURNS TABLE (
  applied_count integer,
  details json
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  applied_count integer := 0;
  holiday_record record;
  member_record record;
BEGIN
  -- Loop through all holidays in the date range
  FOR holiday_record IN 
    SELECT h.id, h.date, h.country_code, h.name
    FROM public.holidays h
    WHERE h.date BETWEEN start_date AND end_date
  LOOP
    -- Apply holiday to all active team members from the same country
    FOR member_record IN 
      SELECT m.id 
      FROM public.members m 
      WHERE m.team_id = target_team_id 
        AND m.status = 'active'
        AND m.country_code = holiday_record.country_code
    LOOP
      -- Insert or update availability as holiday
      INSERT INTO public.availability (member_id, date, status, auto_holiday, created_at, updated_at)
      VALUES (member_record.id, holiday_record.date, 'holiday', true, NOW(), NOW())
      ON CONFLICT (member_id, date) 
      DO UPDATE SET 
        status = 'holiday',
        auto_holiday = true,
        updated_at = NOW()
      WHERE availability.auto_holiday = true OR availability.status != 'holiday';
      
      applied_count := applied_count + 1;
    END LOOP;
  END LOOP;
  
  RETURN QUERY SELECT applied_count, json_build_object('applied_count', applied_count);
END;
$$;

-- Function to remove auto holidays for a team
CREATE OR REPLACE FUNCTION public.remove_auto_holidays(
  target_team_id uuid,
  start_date date DEFAULT CURRENT_DATE,
  end_date date DEFAULT (CURRENT_DATE + INTERVAL '1 year')
)
RETURNS TABLE (
  removed_count integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  removed_count integer := 0;
BEGIN
  -- Remove auto-applied holidays for team members in date range
  DELETE FROM public.availability a
  USING public.members m
  WHERE a.member_id = m.id
    AND m.team_id = target_team_id
    AND a.date BETWEEN start_date AND end_date
    AND a.status = 'holiday'
    AND a.auto_holiday = true;
    
  GET DIAGNOSTICS removed_count = ROW_COUNT;
  
  RETURN QUERY SELECT removed_count;
END;
$$;

-- 7. Verify the setup
SELECT 
  'Countries' as table_name,
  COUNT(*) as count
FROM public.countries
UNION ALL
SELECT 
  'Holidays' as table_name,
  COUNT(*) as count  
FROM public.holidays
UNION ALL
SELECT 
  'Members with country_code' as table_name,
  COUNT(*) as count
FROM public.members 
WHERE country_code IS NOT NULL;