-- Fix complete marketplace flow for farmer->distributor->retailer
-- Run this in your Supabase SQL Editor

-- Add marketplace_status column to batches table
ALTER TABLE batches 
ADD COLUMN IF NOT EXISTS marketplace_status VARCHAR(50) DEFAULT 'farmer_marketplace';

-- Check current state of all batches
SELECT id, current_owner, farmer_id, status, marketplace_status, crop_type, variety, created_at
FROM batches 
ORDER BY created_at DESC;

-- Fix the current batch ownership and marketplace status
UPDATE batches 
SET 
  current_owner = 'dd98cfed-9c37-4c3a-83c3-fe5f8d830bf1',
  status = 'available',
  marketplace_status = 'distributor_marketplace',
  updated_at = NOW()
WHERE id = '6cd7cbb7-803f-42c1-a817-7be587ae6442';

-- Also fix any other batches with null current_owner
UPDATE batches 
SET 
  current_owner = 'dd98cfed-9c37-4c3a-83c3-fe5f8d830bf1',
  status = 'available',
  marketplace_status = 'distributor_marketplace',
  updated_at = NOW()
WHERE current_owner IS NULL;

-- Verify the update
SELECT id, current_owner, farmer_id, status, marketplace_status, crop_type, variety
FROM batches 
WHERE id = '6cd7cbb7-803f-42c1-a817-7be587ae6442';

-- Check all batches with their marketplace status
SELECT id, current_owner, farmer_id, status, marketplace_status, crop_type, variety,
       CASE 
         WHEN marketplace_status = 'farmer_marketplace' THEN 'FARMER_MARKETPLACE'
         WHEN marketplace_status = 'distributor_marketplace' THEN 'DISTRIBUTOR_MARKETPLACE'
         WHEN marketplace_status = 'retailer_marketplace' THEN 'RETAILER_MARKETPLACE'
         ELSE 'UNKNOWN'
       END as marketplace_display
FROM batches 
WHERE status = 'available'
ORDER BY created_at DESC;

-- Check what should appear in retailer marketplace
SELECT id, current_owner, farmer_id, status, marketplace_status, crop_type, variety
FROM batches 
WHERE status = 'available' 
  AND marketplace_status = 'distributor_marketplace'
  AND current_owner != farmer_id;

-- Final verification - this should show the batch as available for retailers
SELECT 
  id, 
  current_owner, 
  farmer_id, 
  status, 
  marketplace_status, 
  crop_type, 
  variety,
  CASE 
    WHEN current_owner = farmer_id THEN 'FARMER_OWNED'
    WHEN current_owner != farmer_id AND current_owner IS NOT NULL THEN 'DISTRIBUTOR_OWNED'
    WHEN current_owner IS NULL THEN 'NO_OWNER'
    ELSE 'UNKNOWN'
  END as ownership_status
FROM batches;
