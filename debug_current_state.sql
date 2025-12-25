-- Debug current state of batches
SELECT id, current_owner, farmer_id, status, marketplace_status, crop_type, variety
FROM batches 
ORDER BY created_at DESC;
