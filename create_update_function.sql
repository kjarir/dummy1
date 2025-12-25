-- Create a function to force update batch ownership
-- Run this in your Supabase SQL editor

CREATE OR REPLACE FUNCTION update_batch_owner(
  batch_id UUID,
  new_owner UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Update the batch
  UPDATE batches 
  SET 
    current_owner = new_owner,
    status = 'available',
    updated_at = NOW()
  WHERE id = batch_id;
  
  -- Get the updated batch
  SELECT to_json(b.*) INTO result
  FROM batches b
  WHERE b.id = batch_id;
  
  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_batch_owner(UUID, UUID) TO authenticated;
