-- Check the actual structure of the batches table
-- Run this in your Supabase SQL Editor

-- Get column information for batches table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'batches' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Also check if there are any constraints
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'batches' 
AND tc.table_schema = 'public';
