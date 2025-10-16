-- Database Structure Check Script
-- Run this first to see what tables currently exist in your database

-- Check what tables exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check if any team-related tables exist with different names
SELECT 
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name ILIKE '%team%'
ORDER BY table_name;

-- Check for any member-related tables
SELECT 
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name ILIKE '%member%'
ORDER BY table_name;

-- Check for availability tables
SELECT 
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name ILIKE '%availab%'
ORDER BY table_name;

-- If tables exist, show their structure
-- Uncomment these lines one by one to check structure of existing tables:

-- \d teams;
-- \d members;
-- \d availability;
-- \d countries;
-- \d holidays;