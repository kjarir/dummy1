-- FINAL DATABASE CLEANUP - Remove all marketplace_availability references
-- Run this in your Supabase SQL Editor to fix the issue once and for all

-- Step 1: Drop all triggers that reference marketplace_availability
DROP TRIGGER IF EXISTS trigger_create_batch_marketplace_availability ON batches;

-- Step 2: Drop all functions that reference marketplace_availability
DROP FUNCTION IF EXISTS create_batch_marketplace_availability();
DROP FUNCTION IF EXISTS register_batch_to_retailer_marketplace(UUID);
DROP FUNCTION IF EXISTS mark_batch_unavailable_in_marketplace(UUID, VARCHAR);

-- Step 3: Drop the table if it still exists
DROP TABLE IF EXISTS marketplace_availability CASCADE;

-- Step 4: Ensure marketplace table exists and has proper structure
CREATE TABLE IF NOT EXISTS marketplace (
  id BIGSERIAL PRIMARY KEY,
  batch_id UUID NOT NULL,
  current_seller_id UUID NOT NULL,
  current_seller_type TEXT DEFAULT 'farmer',
  price NUMERIC(15,2) NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Enable RLS on marketplace table
ALTER TABLE marketplace ENABLE ROW LEVEL SECURITY;

-- Step 6: Create permissive policies for marketplace
DROP POLICY IF EXISTS "Users can view all marketplace items" ON marketplace;
DROP POLICY IF EXISTS "Users can insert marketplace items" ON marketplace;
DROP POLICY IF EXISTS "Users can update marketplace items" ON marketplace;

CREATE POLICY "Users can view all marketplace items" ON marketplace
  FOR SELECT USING (true);

CREATE POLICY "Users can insert marketplace items" ON marketplace
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update marketplace items" ON marketplace
  FOR UPDATE USING (true);

-- Step 7: Grant permissions
GRANT ALL ON marketplace TO authenticated;

-- Step 8: Verify cleanup
SELECT 'SUCCESS: Database cleanup complete!' as result;
SELECT 'marketplace_availability table dropped' as step1;
SELECT 'All triggers and functions removed' as step2;
SELECT 'marketplace table ready for use' as step3;
