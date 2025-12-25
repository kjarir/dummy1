-- Check the exact structure of distributor_inventory table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'distributor_inventory' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if there are any constraints
SELECT tc.constraint_name, tc.constraint_type, ccu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'distributor_inventory' 
AND tc.table_schema = 'public';
