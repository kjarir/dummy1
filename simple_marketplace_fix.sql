-- Simple fix to work with marketplace table
-- Run this in your Supabase SQL Editor

-- Create a simple function to add batches to marketplace table
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
  total_price NUMERIC(15,2);
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Calculate total price
  total_price := p_quantity * p_price_per_kg;
  
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
  
  -- Then, add to marketplace table
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
    total_price,
    p_quantity,
    'available'
  ) RETURNING id INTO marketplace_id;
  
  RETURN marketplace_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to add to marketplace: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION add_to_marketplace(TEXT, TEXT, NUMERIC, NUMERIC, INTEGER, DATE) TO authenticated;

-- Success message
SELECT 'SUCCESS: Function updated to work with marketplace table!' as result;