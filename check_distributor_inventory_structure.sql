-- Check the structure of distributor_inventory table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'distributor_inventory' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if there are any existing records
SELECT * FROM distributor_inventory;
