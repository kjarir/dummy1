-- EMERGENCY FIX - Run this immediately in Supabase SQL Editor
-- This will fix everything and make your batch show up in the marketplace

-- Step 1: Add marketplace_status column if it doesn't exist
ALTER TABLE batches 
ADD COLUMN IF NOT EXISTS marketplace_status VARCHAR(50) DEFAULT 'farmer_marketplace';

-- Step 2: Fix the existing batch to show in farmer-distributor marketplace
UPDATE batches 
SET 
  marketplace_status = 'farmer_marketplace',
  status = 'available'
WHERE id = '6bf16e80-fe3b-446a-86a1-3af587f49e33';

-- Step 3: Create marketplace_availability table with correct types
DROP TABLE IF EXISTS marketplace_availability CASCADE;

CREATE TABLE marketplace_availability (
  id SERIAL PRIMARY KEY,
  batch_id UUID NOT NULL,
  marketplace_type VARCHAR(50) NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(batch_id, marketplace_type)
);

-- Step 4: Add your batch to farmer-distributor marketplace
INSERT INTO marketplace_availability (batch_id, marketplace_type, is_available)
VALUES ('6bf16e80-fe3b-446a-86a1-3af587f49e33', 'farmer_distributor', true)
ON CONFLICT (batch_id, marketplace_type) DO NOTHING;

-- Step 5: Enable RLS and permissions
ALTER TABLE marketplace_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON marketplace_availability
FOR ALL USING (auth.role() = 'authenticated');

GRANT ALL ON marketplace_availability TO authenticated;

-- Step 6: Verify everything is working
SELECT 'BATCH STATUS:' as info;
SELECT id, current_owner, farmer_id, status, marketplace_status, crop_type, variety
FROM batches 
WHERE id = '6bf16e80-fe3b-446a-86a1-3af587f49e33';

SELECT 'MARKETPLACE AVAILABILITY:' as info;
SELECT * FROM marketplace_availability 
WHERE batch_id = '6bf16e80-fe3b-446a-86a1-3af587f49e33';
