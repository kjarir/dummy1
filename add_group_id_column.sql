-- Add group_id column to batches table
-- Run this SQL in your Supabase dashboard SQL editor

ALTER TABLE batches ADD COLUMN IF NOT EXISTS group_id VARCHAR(255);
