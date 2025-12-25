-- Fix inventory table schema to handle marketplace_id properly
-- The issue is that marketplace.id is INTEGER but we're trying to insert UUID

-- First, let's check the current schema
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('retailer_inventory', 'distributor_inventory', 'marketplace')
ORDER BY table_name, ordinal_position;

-- Option 1: Change marketplace_id to UUID in inventory tables
-- This would require changing the marketplace table to use UUID as well

-- Option 2: Use a different approach - store the batch_id instead of marketplace_id
-- This is better because we can always get the marketplace info from the batch

-- Let's drop and recreate the inventory tables with batch_id instead of marketplace_id
DROP TABLE IF EXISTS retailer_inventory CASCADE;
DROP TABLE IF EXISTS distributor_inventory CASCADE;

-- Create distributor_inventory with batch_id (UUID) instead of marketplace_id
CREATE TABLE distributor_inventory (
    id SERIAL PRIMARY KEY,
    distributor_id UUID NOT NULL REFERENCES profiles(id),
    batch_id UUID NOT NULL REFERENCES batches(id),
    quantity_purchased INTEGER NOT NULL,
    purchase_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create retailer_inventory with batch_id (UUID) instead of marketplace_id  
CREATE TABLE retailer_inventory (
    id SERIAL PRIMARY KEY,
    retailer_id UUID NOT NULL REFERENCES profiles(id),
    batch_id UUID NOT NULL REFERENCES batches(id),
    quantity_purchased INTEGER NOT NULL,
    purchase_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_distributor_inventory_distributor_id ON distributor_inventory(distributor_id);
CREATE INDEX idx_distributor_inventory_batch_id ON distributor_inventory(batch_id);
CREATE INDEX idx_retailer_inventory_retailer_id ON retailer_inventory(retailer_id);
CREATE INDEX idx_retailer_inventory_batch_id ON retailer_inventory(batch_id);

-- Enable RLS
ALTER TABLE distributor_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE retailer_inventory ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own distributor inventory" ON distributor_inventory
    FOR SELECT USING (distributor_id = auth.uid()::text);

CREATE POLICY "Users can insert their own distributor inventory" ON distributor_inventory
    FOR INSERT WITH CHECK (distributor_id = auth.uid()::text);

CREATE POLICY "Users can view their own retailer inventory" ON retailer_inventory
    FOR SELECT USING (retailer_id = auth.uid()::text);

CREATE POLICY "Users can insert their own retailer inventory" ON retailer_inventory
    FOR INSERT WITH CHECK (retailer_id = auth.uid()::text);
