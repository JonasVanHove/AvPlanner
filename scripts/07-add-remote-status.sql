-- Add remote status to availability table constraint
ALTER TABLE availability DROP CONSTRAINT IF EXISTS availability_status_check;
ALTER TABLE availability ADD CONSTRAINT availability_status_check 
CHECK (status IN ('available', 'remote', 'unavailable', 'need_to_check', 'absent', 'holiday', 'maybe'));
