-- Create RPC functions for marketplace operations
-- Run this in your Supabase SQL Editor

-- Function to add batch to marketplace
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
    current_seller_type,x
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
  
  -- Create transaction record
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
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Purchase failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION add_to_marketplace TO authenticated;
GRANT EXECUTE ON FUNCTION purchase_from_marketplace TO authenticated;

-- Test the functions
SELECT 'RPC functions created successfully!' as result;
