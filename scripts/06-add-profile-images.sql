-- Add profile_image column to members table
ALTER TABLE members ADD COLUMN profile_image TEXT;

-- Add some sample profile images for existing members
UPDATE members SET profile_image = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face' WHERE first_name = 'Jonas';
UPDATE members SET profile_image = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face' WHERE first_name = 'Lode';
