-- Create transactions table for immutable transaction system
-- Run this SQL in your Supabase dashboard SQL editor

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  transaction_id VARCHAR(255) UNIQUE NOT NULL,
  batch_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('HARVEST', 'PURCHASE', 'TRANSFER', 'PROCESSING', 'RETAIL')),
  from_address VARCHAR(255) NOT NULL,
  to_address VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  transaction_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  previous_transaction_hash VARCHAR(255),
  ipfs_hash VARCHAR(255) NOT NULL,
  blockchain_hash VARCHAR(255),
  product_details JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_batch_id ON transactions(batch_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_id ON transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_ipfs_hash ON transactions(ipfs_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(transaction_timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_from_address ON transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_transactions_to_address ON transactions(to_address);

-- Add initial_transaction_hash column to batches table if it doesn't exist
ALTER TABLE batches 
ADD COLUMN IF NOT EXISTS initial_transaction_hash VARCHAR(255);

-- Enable Row Level Security (RLS) for the transactions table
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON transactions
FOR ALL USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT ALL ON transactions TO authenticated;
GRANT USAGE ON SEQUENCE transactions_id_seq TO authenticated;
