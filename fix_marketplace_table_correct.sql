-- Fix marketplace table to work with existing batches table structure
-- Run this in your Supabase SQL Editor

-- First, let's check what columns actually exist in the batches table
SELECT 'Checking batches table structure:' as step;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'batches' 
ORDER BY ordinal_position;

-- Drop the marketplace table if it exists (to start fresh)
DROP TABLE IF EXISTS public.marketplace CASCADE;

-- Create marketplace table with correct structure
CREATE TABLE public.marketplace (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  batch_id uuid NOT NULL,  -- This will reference batches.id
  current_seller_id uuid NOT NULL,
  current_seller_type text NOT NULL DEFAULT 'farmer',
  price numeric(15,2) NOT NULL,
  quantity numeric(10,2) NOT NULL,
  status text DEFAULT 'available',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_marketplace_batch_id ON public.marketplace(batch_id);
CREATE INDEX idx_marketplace_seller_id ON public.marketplace(current_seller_id);
CREATE INDEX idx_marketplace_seller_type ON public.marketplace(current_seller_type);
CREATE INDEX idx_marketplace_status ON public.marketplace(status);

-- Enable Row Level Security
ALTER TABLE public.marketplace ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow select to authenticated" ON public.marketplace
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert to authenticated" ON public.marketplace
FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = current_seller_id);

CREATE POLICY "Allow update to owner" ON public.marketplace
FOR UPDATE TO authenticated 
USING ((SELECT auth.uid()) = current_seller_id) 
WITH CHECK ((SELECT auth.uid()) = current_seller_id);

CREATE POLICY "Allow delete to owner" ON public.marketplace
FOR DELETE TO authenticated USING ((SELECT auth.uid()) = current_seller_id);

-- Grant table privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace TO authenticated;
GRANT USAGE ON SEQUENCE marketplace_id_seq TO authenticated;

-- Add foreign key constraints (only if the referenced tables exist)
DO $$
BEGIN
  -- Add foreign key to batches table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'batches') THEN
    BEGIN
      ALTER TABLE public.marketplace 
      ADD CONSTRAINT marketplace_batch_id_fkey 
      FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN
        NULL; -- Foreign key already exists
    END;
  END IF;
  
  -- Add foreign key to profiles table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    BEGIN
      ALTER TABLE public.marketplace 
      ADD CONSTRAINT marketplace_current_seller_id_fkey 
      FOREIGN KEY (current_seller_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN
        NULL; -- Foreign key already exists
    END;
  END IF;
END $$;

-- Create RPC functions for marketplace operations
CREATE OR REPLACE FUNCTION add_to_marketplace(
  p_batch_id UUID,
  p_seller_id UUID,
  p_seller_type TEXT,
  p_price NUMERIC(15,2),
  p_quantity NUMERIC(10,2)
) RETURNS BOOLEAN AS $$
BEGIN
  -- Insert into marketplace table
  INSERT INTO marketplace (
    batch_id,
    current_seller_id,
    current_seller_type,
    price,
    quantity,
    status
  ) VALUES (
    p_batch_id,
    p_seller_id,
    p_seller_type,
    p_price,
    p_quantity,
    'available'
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to purchase from marketplace
CREATE OR REPLACE FUNCTION purchase_from_marketplace(
  p_marketplace_id BIGINT,
  p_quantity NUMERIC(10,2)
) RETURNS BOOLEAN AS $$
DECLARE
  marketplace_item RECORD;
  new_batch_id UUID;
BEGIN
  -- Get marketplace item details
  SELECT * INTO marketplace_item 
  FROM marketplace 
  WHERE id = p_marketplace_id AND status = 'available';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Marketplace item not found or not available';
  END IF;
  
  IF marketplace_item.quantity < p_quantity THEN
    RAISE EXCEPTION 'Insufficient quantity available';
  END IF;
  
  -- Create new batch for buyer (copy from original batch)
  INSERT INTO batches (
    farmer_id,
    crop_type,
    variety,
    harvest_quantity,
    price_per_kg,
    harvest_date,
    status,
    current_owner,
    group_id,
    ipfs_certificate_hash
  )
  SELECT 
    marketplace_item.current_seller_id, -- Original seller becomes farmer_id
    b.crop_type,
    b.variety,
    p_quantity,
    marketplace_item.price / p_quantity, -- Calculate price per kg
    b.harvest_date,
    'available',
    marketplace_item.current_seller_id, -- Buyer becomes current owner
    b.group_id,
    b.ipfs_certificate_hash
  FROM batches b
  WHERE b.id = marketplace_item.batch_id;
  
  -- Get the new batch ID
  SELECT id INTO new_batch_id 
  FROM batches 
  WHERE current_owner = marketplace_item.current_seller_id 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Update marketplace item quantity or mark as sold
  IF marketplace_item.quantity = p_quantity THEN
    -- Sold out
    UPDATE marketplace 
    SET status = 'sold', quantity = 0
    WHERE id = p_marketplace_id;
  ELSE
    -- Reduce quantity
    UPDATE marketplace 
    SET quantity = quantity - p_quantity
    WHERE id = p_marketplace_id;
  END IF;
  
  -- Create transaction record (if transactions table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transactions') THEN
    INSERT INTO transactions (
      batch_id,
      buyer_id,
      seller_id,
      transaction_type,
      quantity,
      price
    ) VALUES (
      new_batch_id,
      marketplace_item.current_seller_id, -- Buyer
      marketplace_item.current_seller_id, -- Seller (from marketplace)
      'PURCHASE',
      p_quantity,
      marketplace_item.price * (p_quantity / marketplace_item.quantity)
    );
  END IF;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Purchase failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION add_to_marketplace TO authenticated;
GRANT EXECUTE ON FUNCTION purchase_from_marketplace TO authenticated;

-- Check the final structure
SELECT 'Marketplace table and RPC functions created successfully!' as result;

-- Verify the marketplace table structure
SELECT 'Final marketplace table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'marketplace' 
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
