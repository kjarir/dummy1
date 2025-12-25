-- Check existing table structures
-- Run this in your Supabase SQL Editor

-- Check all tables
SELECT 'All tables in public schema:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check batches table structure
SELECT 'Batches table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'batches' 
ORDER BY ordinal_position;

-- Check profiles table structure
SELECT 'Profiles table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Check if marketplace table exists
SELECT 'Marketplace table exists:' as info;
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'marketplace'
) as marketplace_exists;

-- If marketplace exists, show its structure
SELECT 'Marketplace table structure (if exists):' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'marketplace' 
ORDER BY ordinal_position;
