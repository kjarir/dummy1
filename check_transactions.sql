-- Check if there are any transactions in the database
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10;

-- Check if there are any group_files (certificates)
SELECT * FROM group_files ORDER BY created_at DESC LIMIT 10;

-- Check the structure of transactions table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check the structure of group_files table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'group_files' 
AND table_schema = 'public'
ORDER BY ordinal_position;
