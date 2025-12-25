-- Fix RLS policies for marketplace table
-- Run this in your Supabase SQL Editor

-- Enable RLS on marketplace table
ALTER TABLE marketplace ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view available marketplace items" ON marketplace;
DROP POLICY IF EXISTS "Users can insert their own marketplace items" ON marketplace;
DROP POLICY IF EXISTS "Users can update their own marketplace items" ON marketplace;

-- Create policies for marketplace table
CREATE POLICY "Users can view available marketplace items" ON marketplace
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own marketplace items" ON marketplace
  FOR INSERT WITH CHECK (auth.uid() = current_seller_id);

CREATE POLICY "Users can update their own marketplace items" ON marketplace
  FOR UPDATE USING (auth.uid() = current_seller_id);

-- Also ensure batches table has proper RLS
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all batches" ON batches;
DROP POLICY IF EXISTS "Users can insert their own batches" ON batches;
DROP POLICY IF EXISTS "Users can update their own batches" ON batches;

-- Create policies for batches table
CREATE POLICY "Users can view all batches" ON batches
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own batches" ON batches
  FOR INSERT WITH CHECK (auth.uid() = farmer_id);

CREATE POLICY "Users can update their own batches" ON batches
  FOR UPDATE USING (auth.uid() = farmer_id OR auth.uid() = current_owner);

-- Success message
SELECT 'SUCCESS: RLS policies updated for marketplace and batches tables!' as result;
