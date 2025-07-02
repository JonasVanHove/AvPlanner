-- Add separate name fields and email to members table
ALTER TABLE members 
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT,
ADD COLUMN email TEXT;

-- Update existing members to split names
UPDATE members 
SET 
  first_name = SPLIT_PART(name, ' ', 1),
  last_name = CASE 
    WHEN ARRAY_LENGTH(STRING_TO_ARRAY(name, ' '), 1) > 1 
    THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
    ELSE ''
  END;

-- Make first_name required
ALTER TABLE members ALTER COLUMN first_name SET NOT NULL;

-- Drop old name column
ALTER TABLE members DROP COLUMN name;
