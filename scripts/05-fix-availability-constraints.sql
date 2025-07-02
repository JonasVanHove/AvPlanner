-- First, update any existing 'maybe' status to 'unavailable'
UPDATE availability SET status = 'unavailable' WHERE status = 'maybe';

-- Drop the old constraint
ALTER TABLE availability DROP CONSTRAINT IF EXISTS availability_status_check;

-- Add the new constraint with correct status values
ALTER TABLE availability ADD CONSTRAINT availability_status_check 
CHECK (status IN ('available', 'unavailable', 'need_to_check', 'absent', 'holiday'));
