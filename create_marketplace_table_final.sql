-- Create marketplace table with proper structure and RLS policies
-- Run this in your Supabase SQL Editor

-- Create marketplace table with proper types and constraints
CREATE TABLE IF NOT EXISTS public.marketplace (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  batch_id uuid NOT NULL,  -- This references batches.id (the primary key)
  current_seller_id uuid NOT NULL,
  current_seller_type text NOT NULL DEFAULT 'farmer',
  price numeric(15,2) NOT NULL,
  quantity numeric(10,2) NOT NULL,
  status text DEFAULT 'available',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_marketplace_batch_id ON public.marketplace(batch_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_seller_id ON public.marketplace(current_seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_seller_type ON public.marketplace(current_seller_type);
CREATE INDEX IF NOT EXISTS idx_marketplace_status ON public.marketplace(status);

-- Enable Row Level Security
ALTER TABLE public.marketplace ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow select to authenticated" ON public.marketplace;
DROP POLICY IF EXISTS "Allow insert to authenticated" ON public.marketplace;
DROP POLICY IF EXISTS "Allow update to owner" ON public.marketplace;
DROP POLICY IF EXISTS "Allow delete to owner" ON public.marketplace;

-- RLS policies
-- Allow authenticated users to SELECT all marketplace items
CREATE POLICY "Allow select to authenticated" ON public.marketplace
FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to INSERT marketplace items
CREATE POLICY "Allow insert to authenticated" ON public.marketplace
FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = current_seller_id);

-- Allow authenticated owners to UPDATE their marketplace items
CREATE POLICY "Allow update to owner" ON public.marketplace
FOR UPDATE TO authenticated 
USING ((SELECT auth.uid()) = current_seller_id) 
WITH CHECK ((SELECT auth.uid()) = current_seller_id);

-- Allow authenticated owners to DELETE their marketplace items
CREATE POLICY "Allow delete to owner" ON public.marketplace
FOR DELETE TO authenticated USING ((SELECT auth.uid()) = current_seller_id);

-- Grant table privileges to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace TO authenticated;

-- Grant sequence privileges for the identity column
GRANT USAGE ON SEQUENCE marketplace_id_seq TO authenticated;

-- Add foreign key constraints if referenced tables exist
DO $$
BEGIN
  -- Add foreign key to batches table if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'batches') THEN
    BEGIN
      ALTER TABLE public.marketplace 
      ADD CONSTRAINT marketplace_batch_id_fkey 
      FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN
        -- Foreign key already exists, do nothing
        NULL;
    END;
  END IF;
  
  -- Add foreign key to profiles table if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    BEGIN
      ALTER TABLE public.marketplace 
      ADD CONSTRAINT marketplace_current_seller_id_fkey 
      FOREIGN KEY (current_seller_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN
        -- Foreign key already exists, do nothing
        NULL;
    END;
  END IF;
END $$;

-- Check the final structure
SELECT 'Marketplace table created successfully!' as result;
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
