-- Fix batch ownership issue for complete supply chain flow
-- Run this in your Supabase SQL Editor

-- Check current state of all batches
SELECT id, current_owner, farmer_id, status, crop_type, variety, created_at
FROM batches 
ORDER BY created_at DESC;

-- Check the specific batch that was purchased
SELECT id, current_owner, farmer_id, status, crop_type, variety 
FROM batches 
WHERE id = '0d02e2d6-27d9-4521-805e-15f81e67e74c';

-- Update the specific batch ownership to the distributor
UPDATE batches 
SET 
  current_owner = 'dd98cfed-9c37-4c3a-83c3-fe5f8d830bf1',
  status = 'available',
  updated_at = NOW()
WHERE id = '0d02e2d6-27d9-4521-805e-15f81e67e74c';

-- Verify the specific update
SELECT id, current_owner, farmer_id, status, crop_type, variety 
FROM batches 
WHERE id = '0d02e2d6-27d9-4521-805e-15f81e67e74c';

-- Check all batches with null current_owner
SELECT id, current_owner, farmer_id, status, crop_type, variety
FROM batches 
WHERE current_owner IS NULL;

-- Update all batches with null current_owner to the distributor (if they should be)
UPDATE batches 
SET 
  current_owner = 'dd98cfed-9c37-4c3a-83c3-fe5f8d830bf1',
  status = 'available',
  updated_at = NOW()
WHERE current_owner IS NULL;

-- Check distributor-owned batches (should show in retailer marketplace)
SELECT id, current_owner, farmer_id, status, crop_type, variety,
       CASE 
         WHEN current_owner != farmer_id AND current_owner IS NOT NULL THEN 'DISTRIBUTOR_OWNED'
         WHEN current_owner = farmer_id THEN 'FARMER_OWNED'
         WHEN current_owner IS NULL THEN 'NO_OWNER'
         ELSE 'UNKNOWN'
       END as ownership_status
FROM batches 
WHERE status = 'available'
ORDER BY created_at DESC;

-- Final verification - this should show the batch as DISTRIBUTOR_OWNED
SELECT id, current_owner, farmer_id, status, crop_type, variety,
       CASE 
         WHEN current_owner != farmer_id AND current_owner IS NOT NULL THEN 'DISTRIBUTOR_OWNED'
         WHEN current_owner = farmer_id THEN 'FARMER_OWNED'
         WHEN current_owner IS NULL THEN 'NO_OWNER'
         ELSE 'UNKNOWN'
       END as ownership_status
FROM batches;
