-- Update availability status enum to include new statuses
ALTER TABLE availability DROP CONSTRAINT IF EXISTS availability_status_check;
ALTER TABLE availability ADD CONSTRAINT availability_status_check 
CHECK (status IN ('available', 'unavailable', 'need_to_check', 'absent', 'holiday'));

-- Update existing data to match new status names
UPDATE availability SET status = 'unavailable' WHERE status = 'maybe';
