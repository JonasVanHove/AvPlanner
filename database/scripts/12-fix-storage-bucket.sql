-- Fix Supabase Storage for profile images
-- This creates the bucket and sets proper permissions for image uploads
-- Run this in Supabase SQL Editor

-- 1. Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public downloads" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to upload profile images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their profile images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to read profile images" ON storage.objects;

-- 4. Create policies for profile-images bucket
-- Allow anyone (authenticated and anon) to upload images
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'profile-images');

CREATE POLICY "Allow anon uploads" ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'profile-images');

-- Allow anyone to read/view images (public bucket)
CREATE POLICY "Allow public downloads" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'profile-images');

-- Allow authenticated users to update images
CREATE POLICY "Allow authenticated updates" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'profile-images');

-- Allow authenticated users to delete images
CREATE POLICY "Allow authenticated deletes" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'profile-images');

-- 5. Verify the bucket exists and is public
SELECT id, name, public FROM storage.buckets WHERE id = 'profile-images';

-- Expected result: one row with public = true
