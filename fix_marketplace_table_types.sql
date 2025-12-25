-- Fix marketplace_availability table type mismatch
-- Run this if you get the UUID/VARCHAR type error

-- Drop the existing table if it exists with wrong types
DROP TABLE IF EXISTS marketplace_availability CASCADE;

-- Recreate with correct UUID type
CREATE TABLE marketplace_availability (
  id SERIAL PRIMARY KEY,
  batch_id UUID NOT NULL,
  marketplace_type VARCHAR(50) NOT NULL, -- 'farmer_distributor' or 'distributor_retailer'
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(batch_id, marketplace_type)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_marketplace_availability_batch_id ON marketplace_availability(batch_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_availability_type ON marketplace_availability(marketplace_type);
CREATE INDEX IF NOT EXISTS idx_marketplace_availability_available ON marketplace_availability(is_available);

-- Enable Row Level Security
ALTER TABLE marketplace_availability ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON marketplace_availability
FOR ALL USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON marketplace_availability TO authenticated;

-- Recreate the functions with correct types
CREATE OR REPLACE FUNCTION create_batch_marketplace_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into farmer-distributor marketplace by default
  INSERT INTO marketplace_availability (batch_id, marketplace_type, is_available)
  VALUES (NEW.id, 'farmer_distributor', true)
  ON CONFLICT (batch_id, marketplace_type) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger for new batches
DROP TRIGGER IF EXISTS trigger_create_batch_marketplace_availability ON batches;
CREATE TRIGGER trigger_create_batch_marketplace_availability
  AFTER INSERT ON batches
  FOR EACH ROW
  EXECUTE FUNCTION create_batch_marketplace_availability();

-- Function to register batch to distributor-retailer marketplace
CREATE OR REPLACE FUNCTION register_batch_to_retailer_marketplace(batch_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Insert or update marketplace availability for distributor-retailer marketplace
  INSERT INTO marketplace_availability (batch_id, marketplace_type, is_available)
  VALUES (batch_id_param, 'distributor_retailer', true)
  ON CONFLICT (batch_id, marketplace_type) 
  DO UPDATE SET is_available = true, updated_at = NOW();
  
  -- Update batch marketplace status
  UPDATE batches 
  SET marketplace_status = 'distributor_retailer_marketplace'
  WHERE id = batch_id_param;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to remove batch from marketplace after purchase
CREATE OR REPLACE FUNCTION remove_batch_from_marketplace(batch_id_param UUID, marketplace_type_param VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  -- Mark as not available in the specific marketplace
  UPDATE marketplace_availability 
  SET is_available = false, updated_at = NOW()
  WHERE batch_id = batch_id_param AND marketplace_type = marketplace_type_param;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add marketplace_status column to batches table if it doesn't exist
ALTER TABLE batches 
ADD COLUMN IF NOT EXISTS marketplace_status VARCHAR(50) DEFAULT 'farmer_marketplace';

-- Check the table structure
SELECT 'Table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'marketplace_availability' 
ORDER BY ordinal_position;
