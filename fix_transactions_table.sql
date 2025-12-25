-- Fix transactions table with simple schema
-- Run this in your Supabase SQL editor

-- Drop existing transactions table if it exists
DROP TABLE IF EXISTS transactions CASCADE;

-- Create a simple transactions table
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  batch_id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_transactions_batch_id ON transactions(batch_id);
CREATE INDEX idx_transactions_buyer_id ON transactions(buyer_id);
CREATE INDEX idx_transactions_seller_id ON transactions(seller_id);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all operations for authenticated users" ON transactions
FOR ALL USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON transactions TO authenticated;
GRANT USAGE ON SEQUENCE transactions_id_seq TO authenticated;