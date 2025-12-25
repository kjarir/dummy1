-- Check current inventory table schemas
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('retailer_inventory', 'distributor_inventory', 'marketplace')
ORDER BY table_name, ordinal_position;
