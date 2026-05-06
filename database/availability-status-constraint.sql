-- Update availability status constraint to allow school
-- Run this in the Supabase SQL editor or your migration pipeline.

ALTER TABLE public.availability
  DROP CONSTRAINT IF EXISTS availability_status_check;

ALTER TABLE public.availability
  ADD CONSTRAINT availability_status_check
  CHECK (status IN (
    'available',
    'remote',
    'school',
    'unavailable',
    'need_to_check',
    'absent',
    'holiday',
    'maybe'
  ));
