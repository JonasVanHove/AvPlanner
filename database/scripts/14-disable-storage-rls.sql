-- ALTERNATIVE: Disable RLS on storage.objects for profile-images bucket
-- WARNING: This allows ANYONE to upload/delete files. Use only for testing!

-- Drop all existing policies for storage.objects
DROP POLICY IF EXISTS "Allow authenticated uploads to profile-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to profile-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to profile-images" ON storage.objects;

-- Disable RLS on storage.objects (WARNING: Security risk!)
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Ensure bucket is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'profile-images';
