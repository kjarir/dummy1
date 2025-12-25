-- Fix inventory tables by dropping and recreating with correct types
-- This will fix the UUID to INTEGER casting issue

-- First, drop the existing tables (they're empty anyway)
DROP TABLE IF EXISTS distributor_inventory CASCADE;
DROP TABLE IF EXISTS retailer_inventory CASCADE;

-- Recreate distributor_inventory with INTEGER marketplace_id
CREATE TABLE distributor_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    distributor_id UUID NOT NULL REFERENCES profiles(id),
    marketplace_id INTEGER NOT NULL REFERENCES marketplace(id),
    quantity_purchased NUMERIC NOT NULL,
    purchase_price NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recreate retailer_inventory with INTEGER marketplace_id
CREATE TABLE retailer_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    retailer_id UUID NOT NULL REFERENCES profiles(id),
    marketplace_id INTEGER NOT NULL REFERENCES marketplace(id),
    quantity_purchased NUMERIC NOT NULL,
    purchase_price NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE distributor_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE retailer_inventory ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for distributor_inventory
CREATE POLICY "Enable read access for authenticated users" ON distributor_inventory
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON distributor_inventory
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON distributor_inventory
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create RLS policies for retailer_inventory
CREATE POLICY "Enable read access for authenticated users" ON retailer_inventory
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON retailer_inventory
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON retailer_inventory
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Verify the structure
SELECT 
    table_name,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('distributor_inventory', 'retailer_inventory') 
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
