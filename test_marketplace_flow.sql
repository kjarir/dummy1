-- Test the complete marketplace flow
-- Run this after creating the marketplace structure

-- 1. Check if marketplace_availability table exists and has data
SELECT 'Step 1: Check marketplace_availability table' as step;
SELECT * FROM marketplace_availability ORDER BY created_at DESC;

-- 2. Check current batches and their marketplace status
SELECT 'Step 2: Check current batches' as step;
SELECT id, current_owner, farmer_id, status, marketplace_status, crop_type, variety
FROM batches 
ORDER BY created_at DESC;

-- 3. Test registering a batch to retailer marketplace (replace with actual batch ID)
SELECT 'Step 3: Test registering batch to retailer marketplace' as step;
-- SELECT register_batch_to_retailer_marketplace('YOUR_BATCH_ID_HERE');

-- 4. Check if batch appears in distributor-retailer marketplace
SELECT 'Step 4: Check distributor-retailer marketplace' as step;
SELECT ma.*, b.crop_type, b.variety, b.current_owner, b.farmer_id
FROM marketplace_availability ma
JOIN batches b ON ma.batch_id = b.id
WHERE ma.marketplace_type = 'distributor_retailer' 
  AND ma.is_available = true
ORDER BY ma.created_at DESC;

-- 5. Check farmer-distributor marketplace
SELECT 'Step 5: Check farmer-distributor marketplace' as step;
SELECT ma.*, b.crop_type, b.variety, b.current_owner, b.farmer_id
FROM marketplace_availability ma
JOIN batches b ON ma.batch_id = b.id
WHERE ma.marketplace_type = 'farmer_distributor' 
  AND ma.is_available = true
ORDER BY ma.created_at DESC;
