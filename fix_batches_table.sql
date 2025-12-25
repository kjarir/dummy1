-- Fix batches table with proper schema
-- Run this in your Supabase SQL editor

-- Add missing columns to batches table
ALTER TABLE batches ADD COLUMN IF NOT EXISTS current_owner UUID;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS crop_type VARCHAR(255);
ALTER TABLE batches ADD COLUMN IF NOT EXISTS variety VARCHAR(255);
ALTER TABLE batches ADD COLUMN IF NOT EXISTS harvest_quantity DECIMAL(10,2);
ALTER TABLE batches ADD COLUMN IF NOT EXISTS price_per_kg DECIMAL(10,2);
ALTER TABLE batches ADD COLUMN IF NOT EXISTS harvest_date DATE;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS certification_level VARCHAR(50) DEFAULT 'Standard';
ALTER TABLE batches ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'available';
ALTER TABLE batches ADD COLUMN IF NOT EXISTS group_id VARCHAR(255);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_batches_current_owner ON batches(current_owner);
CREATE INDEX IF NOT EXISTS idx_batches_farmer_id ON batches(farmer_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_crop_type ON batches(crop_type);
CREATE INDEX IF NOT EXISTS idx_batches_group_id ON batches(group_id);

-- Update existing batches to have current_owner = farmer_id if current_owner is null
UPDATE batches SET current_owner = farmer_id WHERE current_owner IS NULL AND farmer_id IS NOT NULL;
