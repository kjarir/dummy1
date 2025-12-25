-- Fix all database errors - complete solution
-- Run this in your Supabase SQL Editor

-- Step 1: Drop everything and start fresh
DROP FUNCTION IF EXISTS add_to_marketplace CASCADE;
DROP FUNCTION IF EXISTS purchase_from_marketplace CASCADE;
DROP TABLE IF EXISTS public.marketplace CASCADE;

-- Step 2: Create marketplace table with correct structure
CREATE TABLE public.marketplace (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  batch_id uuid NOT NULL,
  current_seller_id uuid NOT NULL,
  current_seller_type text NOT NULL DEFAULT 'farmer',
  price numeric(15,2) NOT NULL,
  quantity numeric(10,2) NOT NULL,
  status text DEFAULT 'available',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Step 3: Create indexes
CREATE INDEX idx_marketplace_batch_id ON public.marketplace(batch_id);
CREATE INDEX idx_marketplace_seller_id ON public.marketplace(current_seller_id);
CREATE INDEX idx_marketplace_seller_type ON public.marketplace(current_seller_type);
CREATE INDEX idx_marketplace_status ON public.marketplace(status);

-- Step 4: Enable RLS
ALTER TABLE public.marketplace ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
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

-- Step 6: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace TO authenticated;
GRANT USAGE ON SEQUENCE marketplace_id_seq TO authenticated;

-- Step 7: Add foreign key constraints
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
        NULL;
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
        NULL;
    END;
  END IF;
END $$;

-- Step 8: Create the CORRECT RPC function that matches BatchRegistration.tsx
CREATE OR REPLACE FUNCTION add_to_marketplace(
  p_crop_type TEXT,
  p_variety TEXT,
  p_quantity NUMERIC(10,2),
  p_price_per_kg NUMERIC(15,2),
  p_quality_score INTEGER,
  p_harvest_date DATE
) RETURNS BIGINT AS $$
DECLARE
  new_batch_id UUID;
  marketplace_id BIGINT;
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- First, create a batch in the batches table
  INSERT INTO batches (
    farmer_id,
    crop_type,
    variety,
    harvest_quantity,
    price_per_kg,
    harvest_date,
    status,
    current_owner,
    quality_score
  ) VALUES (
    current_user_id,
    p_crop_type,
    p_variety,
    p_quantity,
    p_price_per_kg,
    p_harvest_date,
    'available',
    current_user_id,
    p_quality_score
  ) RETURNING id INTO new_batch_id;
  
  -- Then, add to marketplace
  INSERT INTO marketplace (
    batch_id,
    current_seller_id,
    current_seller_type,
    price,
    quantity,
    status
  ) VALUES (
    new_batch_id,
    current_user_id,
    'farmer',
    p_quantity * p_price_per_kg, -- Total price
    p_quantity,
    'available'
  ) RETURNING id INTO marketplace_id;
  
  RETURN marketplace_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to add to marketplace: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create purchase function
CREATE OR REPLACE FUNCTION purchase_from_marketplace(
  p_marketplace_id BIGINT,
  p_quantity NUMERIC(10,2)
) RETURNS BOOLEAN AS $$
DECLARE
  marketplace_item RECORD;
  new_batch_id UUID;
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
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
    ipfs_certificate_hash,
    quality_score
  )
  SELECT 
    marketplace_item.current_seller_id, -- Original seller becomes farmer_id
    b.crop_type,
    b.variety,
    p_quantity,
    marketplace_item.price / p_quantity, -- Calculate price per kg
    b.harvest_date,
    'available',
    current_user_id, -- Buyer becomes current owner
    b.group_id,
    b.ipfs_certificate_hash,
    b.quality_score
  FROM batches b
  WHERE b.id = marketplace_item.batch_id;
  
  -- Get the new batch ID
  SELECT id INTO new_batch_id 
  FROM batches 
  WHERE current_owner = current_user_id 
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
      current_user_id, -- Buyer
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

-- Step 10: Grant execute permissions
GRANT EXECUTE ON FUNCTION add_to_marketplace(TEXT, TEXT, NUMERIC, NUMERIC, INTEGER, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION purchase_from_marketplace(BIGINT, NUMERIC) TO authenticated;

-- Step 11: Success message
SELECT 'SUCCESS: All database errors fixed! Marketplace and RPC functions created successfully!' as result;

-- Step 12: Verify structure
SELECT 'Marketplace table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'marketplace' 
ORDER BY ordinal_position;

-- Step 13: Check foreign key constraints
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
