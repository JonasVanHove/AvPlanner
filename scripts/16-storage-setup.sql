-- Storage bucket configuratie voor profiel afbeeldingen
-- Run dit in je Supabase SQL Editor na het maken van de storage bucket

-- Stap 1: Maak storage bucket 'profile-images' in de Supabase dashboard
-- Ga naar Storage > Create a new bucket
-- Naam: profile-images
-- Public: true (zodat afbeeldingen publiek toegankelijk zijn)

-- Stap 2: RLS policies voor storage bucket
-- Deze policies zorgen ervoor dat alleen geauthenticeerde users hun eigen profielfoto's kunnen uploaden

-- Policy voor READ access (iedereen kan profielfoto's zien)
CREATE POLICY "Public profile images are viewable by everyone" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-images');

-- Policy voor INSERT access (alleen ingelogde users kunnen uploaden)
CREATE POLICY "Users can upload their own profile images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profile-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy voor UPDATE access (users kunnen hun eigen afbeeldingen updaten)
CREATE POLICY "Users can update their own profile images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'profile-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy voor DELETE access (users kunnen hun eigen afbeeldingen verwijderen)
CREATE POLICY "Users can delete their own profile images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'profile-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Stap 3: Helper functie om oude profielfoto's te verwijderen
CREATE OR REPLACE FUNCTION cleanup_old_profile_images()
RETURNS TRIGGER AS $$
BEGIN
  -- Verwijder oude profielfoto uit storage als er een nieuwe wordt ingesteld
  IF OLD.profile_image_url IS NOT NULL 
     AND NEW.profile_image_url IS NOT NULL 
     AND OLD.profile_image_url != NEW.profile_image_url
     AND OLD.profile_image_url LIKE '%supabase%' THEN
    
    -- Extract filename from URL and delete from storage
    -- Dit is een vereenvoudigde versie - in productie zou je een meer robuuste cleanup willen
    PERFORM pg_notify('cleanup_storage', OLD.profile_image_url);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Stap 4: Trigger om oude profielfoto's op te ruimen
CREATE TRIGGER cleanup_profile_images_trigger
  BEFORE UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_profile_images();

-- Stap 5: Functie om profielfoto URL te valideren
CREATE OR REPLACE FUNCTION validate_profile_image_url(url TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Valideer dat URL van je eigen storage bucket komt
  IF url IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if URL is from your Supabase storage
  IF url LIKE '%supabase.co/storage/v1/object/public/profile-images/%' THEN
    RETURN TRUE;
  END IF;
  
  -- Allow external URLs (voor flexibiliteit)
  IF url LIKE 'https://%' THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Stap 6: Voeg constraint toe aan members tabel
ALTER TABLE members 
ADD CONSTRAINT valid_profile_image_url 
CHECK (validate_profile_image_url(profile_image_url));

-- Instructies voor gebruik:
-- 1. Maak eerst 'profile-images' bucket in Supabase Storage dashboard
-- 2. Zet bucket op 'Public' in de settings
-- 3. Run dit script om de RLS policies toe te voegen
-- 4. Test het uploaden van profielfoto's via de applicatie

-- Test queries:
-- SELECT * FROM storage.objects WHERE bucket_id = 'profile-images';
-- SELECT * FROM storage.buckets WHERE name = 'profile-images';
