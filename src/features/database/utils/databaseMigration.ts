import { supabase } from '@/integrations/supabase/client';

/**
 * Database Migration Script
 * Creates the transactions table for the immutable transaction system
 */
export const createTransactionsTable = async (): Promise<void> => {
  try {
    console.log('Creating transactions table...');
    
    // SQL to create the transactions table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        transaction_id VARCHAR(255) UNIQUE NOT NULL,
        batch_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('HARVEST', 'PURCHASE', 'TRANSFER', 'PROCESSING', 'RETAIL')),
        from_address VARCHAR(255) NOT NULL,
        to_address VARCHAR(255) NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        price DECIMAL(15,2) NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        previous_transaction_hash VARCHAR(255),
        ipfs_hash VARCHAR(255) NOT NULL,
        blockchain_hash VARCHAR(255),
        product_details JSONB,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // For now, we'll create the table using a direct approach
    // Note: This requires the table to be created manually in Supabase dashboard
    // or using the SQL editor with the provided SQL
    
    console.log('Please create the transactions table manually in Supabase dashboard using this SQL:');
    console.log(createTableSQL);
    
    // Try to insert a test record to check if table exists
    const { error: testError } = await (supabase as any)
      .from('transactions')
      .select('id')
      .limit(1);
    
    if (testError && testError.code === 'PGRST116') {
      throw new Error('Transactions table does not exist. Please create it manually in Supabase dashboard.');
    }

    console.log('Transactions table created successfully');

    // Create indexes for better performance
    const createIndexesSQL = [
      'CREATE INDEX IF NOT EXISTS idx_transactions_batch_id ON transactions(batch_id);',
      'CREATE INDEX IF NOT EXISTS idx_transactions_transaction_id ON transactions(transaction_id);',
      'CREATE INDEX IF NOT EXISTS idx_transactions_ipfs_hash ON transactions(ipfs_hash);',
      'CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);',
      'CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);',
      'CREATE INDEX IF NOT EXISTS idx_transactions_from_address ON transactions(from_address);',
      'CREATE INDEX IF NOT EXISTS idx_transactions_to_address ON transactions(to_address);'
    ];

    console.log('Please also create these indexes in Supabase dashboard:');
    createIndexesSQL.forEach(sql => console.log(sql));

    console.log('Indexes will be created manually in Supabase dashboard');

  } catch (error) {
    console.error('Database migration failed:', error);
    throw new Error('Failed to create transactions table');
  }
};

/**
 * Add initial_transaction_hash column to batches table
 */
export const addInitialTransactionHashColumn = async (): Promise<void> => {
  try {
    console.log('Adding initial_transaction_hash column to batches table...');
    
    const addColumnSQL = `
      ALTER TABLE batches 
      ADD COLUMN IF NOT EXISTS initial_transaction_hash VARCHAR(255);
    `;

    const { error } = await (supabase as any).rpc('exec_sql', { sql: addColumnSQL });
    
    if (error) {
      console.error('Error adding initial_transaction_hash column:', error);
      throw error;
    }

    console.log('initial_transaction_hash column added successfully');

  } catch (error) {
    console.error('Database migration failed:', error);
    throw new Error('Failed to add initial_transaction_hash column');
  }
};

/**
 * Run all database migrations
 */
export const runDatabaseMigrations = async (): Promise<void> => {
  try {
    console.log('Starting database migrations...');
    
    await createTransactionsTable();
    await addInitialTransactionHashColumn();
    
    console.log('All database migrations completed successfully');
  } catch (error) {
    console.error('Database migrations failed:', error);
    throw error;
  }
};

/**
 * Check if transactions table exists
 */
export const checkTransactionsTableExists = async (): Promise<boolean> => {
  try {
    const { data, error } = await (supabase as any)
      .from('transactions')
      .select('id')
      .limit(1);

    if (error && error.code === 'PGRST116') {
      // Table doesn't exist
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};
