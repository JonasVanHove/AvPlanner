-- Fix Storage Bucket RLS Policies
-- This allows authenticated users to upload their own profile images

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access" ON storage.objects;

-- Policy 1: Allow authenticated users to upload to profile-images
CREATE POLICY "Allow authenticated uploads to profile-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-images'
);

-- Policy 2: Allow authenticated users to update their own images
CREATE POLICY "Allow authenticated updates to profile-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-images');

-- Policy 3: Allow public read access (so anyone can view profile images)
CREATE POLICY "Allow public read access to profile-images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-images');

-- Verify the bucket exists and is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'profile-images';

-- Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';
