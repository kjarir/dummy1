-- Check marketplace table data
SELECT * FROM marketplace ORDER BY created_at DESC;

-- Check if there are any batches that should be in marketplace
SELECT 
  b.id as batch_id,
  b.crop_type,
  b.variety,
  b.status,
  b.current_owner,
  p.full_name as farmer_name
FROM batches b
LEFT JOIN profiles p ON b.farmer_id = p.id
WHERE b.status = 'available'
ORDER BY b.created_at DESC;

-- Check if there are any marketplace entries for these batches
SELECT 
  m.id as marketplace_id,
  m.batch_id,
  m.current_seller_id,
  m.current_seller_type,
  m.status as marketplace_status,
  b.crop_type,
  b.variety
FROM marketplace m
LEFT JOIN batches b ON m.batch_id = b.id
ORDER BY m.created_at DESC;
