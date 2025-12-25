-- Check current marketplace data
SELECT * FROM marketplace ORDER BY id;

-- Check the status values
SELECT status, COUNT(*) as count FROM marketplace GROUP BY status;

-- Update all marketplace records to have status 'available' so they show up
UPDATE marketplace SET status = 'available' WHERE status = 'sold';

-- Verify the update
SELECT * FROM marketplace ORDER BY id;
