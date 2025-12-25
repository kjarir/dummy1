-- Drop all marketplace_availability references from database
-- Run this in your Supabase SQL Editor

-- Drop all triggers that reference marketplace_availability
DROP TRIGGER IF EXISTS trigger_create_batch_marketplace_availability ON batches;

-- Drop all functions that reference marketplace_availability
DROP FUNCTION IF EXISTS create_batch_marketplace_availability();
DROP FUNCTION IF EXISTS register_batch_to_retailer_marketplace(UUID);
DROP FUNCTION IF EXISTS mark_batch_unavailable_in_marketplace(UUID, VARCHAR);

-- Drop the table if it still exists
DROP TABLE IF EXISTS marketplace_availability CASCADE;

-- Success message
SELECT 'SUCCESS: All marketplace_availability references removed from database!' as result;
