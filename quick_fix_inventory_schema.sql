-- Quick fix: Change marketplace_id from UUID to INTEGER in distributor_inventory
ALTER TABLE distributor_inventory 
ALTER COLUMN marketplace_id TYPE INTEGER USING marketplace_id::INTEGER;

-- Do the same for retailer_inventory
ALTER TABLE retailer_inventory 
ALTER COLUMN marketplace_id TYPE INTEGER USING marketplace_id::INTEGER;

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('distributor_inventory', 'retailer_inventory') 
AND column_name = 'marketplace_id'
AND table_schema = 'public';
