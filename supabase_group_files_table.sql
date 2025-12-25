-- Create group_files table to track files uploaded to Pinata groups
-- This table stores references to files uploaded to groups for the verification system

CREATE TABLE IF NOT EXISTS group_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    ipfs_hash TEXT NOT NULL,
    file_size INTEGER,
    transaction_type TEXT NOT NULL, -- 'HARVEST' or 'PURCHASE'
    batch_id TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_group_files_group_id ON group_files(group_id);
CREATE INDEX IF NOT EXISTS idx_group_files_batch_id ON group_files(batch_id);
CREATE INDEX IF NOT EXISTS idx_group_files_transaction_type ON group_files(transaction_type);
CREATE INDEX IF NOT EXISTS idx_group_files_created_at ON group_files(created_at);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_group_files_updated_at 
    BEFORE UPDATE ON group_files 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE group_files IS 'Stores references to files uploaded to Pinata groups for verification system';
COMMENT ON COLUMN group_files.group_id IS 'Pinata group ID where the file is stored';
COMMENT ON COLUMN group_files.file_name IS 'Original file name';
COMMENT ON COLUMN group_files.ipfs_hash IS 'IPFS hash (CID) of the uploaded file';
COMMENT ON COLUMN group_files.file_size IS 'File size in bytes';
COMMENT ON COLUMN group_files.transaction_type IS 'Type of transaction: HARVEST or PURCHASE';
COMMENT ON COLUMN group_files.batch_id IS 'Associated batch ID';
COMMENT ON COLUMN group_files.metadata IS 'Additional metadata stored as JSON';
