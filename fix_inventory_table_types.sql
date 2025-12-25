-- Fix the distributor_inventory table to use integer marketplace_id instead of UUID
-- First, let's check the current structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'distributor_inventory' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Drop the existing table and recreate with correct types
DROP TABLE IF EXISTS distributor_inventory CASCADE;

CREATE TABLE distributor_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    distributor_id UUID NOT NULL REFERENCES profiles(id),
    marketplace_id INTEGER NOT NULL REFERENCES marketplace(id),
    quantity_purchased NUMERIC NOT NULL,
    purchase_price NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies
ALTER TABLE distributor_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON distributor_inventory
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON distributor_inventory
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON distributor_inventory
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Do the same for retailer_inventory
DROP TABLE IF EXISTS retailer_inventory CASCADE;

CREATE TABLE retailer_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    retailer_id UUID NOT NULL REFERENCES profiles(id),
    marketplace_id INTEGER NOT NULL REFERENCES marketplace(id),
    quantity_purchased NUMERIC NOT NULL,
    purchase_price NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for retailer_inventory
ALTER TABLE retailer_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON retailer_inventory
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON retailer_inventory
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON retailer_inventory
    FOR UPDATE USING (auth.role() = 'authenticated');
