-- FIX PURCHASE FLOW - Run this in Supabase SQL Editor
-- This will fix the distributor inventory and marketplace issues

-- Step 1: Check current state of all batches
SELECT 'CURRENT BATCH STATE:' as info;
SELECT id, current_owner, farmer_id, status, marketplace_status, crop_type, variety
FROM batches 
ORDER BY created_at DESC;

-- Step 2: Fix the batch ownership for distributor
-- Replace 'YOUR_DISTRIBUTOR_ID' with your actual distributor user ID
UPDATE batches 
SET 
  current_owner = 'dd98cfed-9c37-4c3a-83c3-fe5f8d830bf1', -- Your distributor ID
  status = 'available',
  marketplace_status = 'distributor_inventory'
WHERE id = '6bf16e80-fe3b-446a-86a1-3af587f49e33'; -- Your batch ID

-- Step 3: Add batch to distributor-retailer marketplace
INSERT INTO marketplace_availability (batch_id, marketplace_type, is_available)
VALUES ('6bf16e80-fe3b-446a-86a1-3af587f49e33', 'distributor_retailer', true)
ON CONFLICT (batch_id, marketplace_type) 
DO UPDATE SET is_available = true, updated_at = NOW();

-- Step 4: Verify the fix
SELECT 'AFTER FIX - BATCH STATE:' as info;
SELECT id, current_owner, farmer_id, status, marketplace_status, crop_type, variety
FROM batches 
WHERE id = '6bf16e80-fe3b-446a-86a1-3af587f49e33';

SELECT 'AFTER FIX - MARKETPLACE AVAILABILITY:' as info;
SELECT * FROM marketplace_availability 
WHERE batch_id = '6bf16e80-fe3b-446a-86a1-3af587f49e33';

-- Step 5: Check what should appear in distributor inventory
SELECT 'DISTRIBUTOR INVENTORY CHECK:' as info;
SELECT id, current_owner, farmer_id, status, crop_type, variety
FROM batches 
WHERE current_owner = 'dd98cfed-9c37-4c3a-83c3-fe5f8d830bf1'
  AND status = 'available';

-- Step 6: Check what should appear in retailer marketplace
SELECT 'RETAILER MARKETPLACE CHECK:' as info;
SELECT ma.*, b.crop_type, b.variety, b.current_owner, b.farmer_id
FROM marketplace_availability ma
JOIN batches b ON ma.batch_id = b.id
WHERE ma.marketplace_type = 'distributor_retailer' 
  AND ma.is_available = true
  AND b.current_owner = 'dd98cfed-9c37-4c3a-83c3-fe5f8d830bf1';
