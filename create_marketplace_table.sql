-- Create marketplace table with proper structure
-- Run this in your Supabase SQL Editor

-- First, let's check what tables exist
SELECT 'Existing tables:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check if marketplace table exists and its structure
SELECT 'Marketplace table structure (if exists):' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'marketplace' 
ORDER BY ordinal_position;

-- Create marketplace table if it doesn't exist
CREATE TABLE IF NOT EXISTS marketplace (
  id SERIAL PRIMARY KEY,
  batch_id UUID NOT NULL,
  current_seller_id UUID NOT NULL,
  current_seller_type VARCHAR(50) NOT NULL, -- 'farmer', 'distributor', 'retailer'
  price DECIMAL(15,2) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'available', -- 'available', 'sold', 'removed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_batch_id ON marketplace(batch_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_seller_id ON marketplace(current_seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_seller_type ON marketplace(current_seller_type);
CREATE INDEX IF NOT EXISTS idx_marketplace_status ON marketplace(status);

-- Enable RLS
ALTER TABLE marketplace ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all operations for authenticated users" ON marketplace
FOR ALL USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON marketplace TO authenticated;
GRANT USAGE ON SEQUENCE marketplace_id_seq TO authenticated;

-- Add foreign key constraints if the referenced tables exist
DO $$
BEGIN
  -- Check if batches table exists and add foreign key
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'batches') THEN
    BEGIN
      ALTER TABLE marketplace 
      ADD CONSTRAINT marketplace_batch_id_fkey 
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN
        -- Foreign key already exists, do nothing
        NULL;
    END;
  END IF;
  
  -- Check if profiles table exists and add foreign key
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    BEGIN
      ALTER TABLE marketplace 
      ADD CONSTRAINT marketplace_current_seller_id_fkey 
      FOREIGN KEY (current_seller_id) REFERENCES profiles(id) ON DELETE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN
        -- Foreign key already exists, do nothing
        NULL;
    END;
  END IF;
END $$;

-- Check the final structure
SELECT 'Final marketplace table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'marketplace' 
ORDER BY ordinal_position;

-- Check foreign key constraints
SELECT 'Foreign key constraints:' as info;
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'marketplace';
