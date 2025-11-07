-- Check the profile_image column configuration in members table

-- 1. Check column data type and size
SELECT 
    table_name,
    column_name, 
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'members' 
AND column_name = 'profile_image';

-- 2. Check a sample of existing profile_image data lengths
SELECT 
    id,
    first_name,
    last_name,
    LENGTH(profile_image) as image_data_length,
    SUBSTRING(profile_image, 1, 50) as image_preview
FROM members
WHERE profile_image IS NOT NULL
ORDER BY LENGTH(profile_image) DESC
LIMIT 5;

-- 3. If profile_image is VARCHAR with a limit, we need to change it to TEXT
-- Run this if the column is not already TEXT:
-- ALTER TABLE members 
-- ALTER COLUMN profile_image TYPE TEXT;
