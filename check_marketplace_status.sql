-- Check the actual structure of the marketplace table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'marketplace' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check all data in marketplace table with status
SELECT * FROM marketplace ORDER BY id;

-- Check if status column exists and what values it has
SELECT status, COUNT(*) as count 
FROM marketplace 
GROUP BY status;
