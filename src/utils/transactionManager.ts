import { supabase } from '@/integrations/supabase/client';
import { ipfsService } from './ipfs';
import { SupplyChainTransaction, TransactionChain, OwnershipRecord } from '@/types/transaction';
import { nameResolver } from './nameResolver';
import { blockchainTransactionManager } from './blockchainTransactionManager';

/**
 * Immutable Transaction Manager
 * Handles creation and retrieval of immutable transaction records
 */
export class TransactionManager {
  private static instance: TransactionManager;

  private constructor() {
    // No need to store ipfsService instance as it's already a singleton
  }

  public static getInstance(): TransactionManager {
    if (!TransactionManager.instance) {
      TransactionManager.instance = new TransactionManager();
    }
    return TransactionManager.instance;
  }

  /**
   * Clean up transaction data to fix existing issues
   */
  private cleanTransactionData(transaction: any, farmerName?: string): any {
    let from = transaction.from;
    let to = transaction.to;
    
    // Fix common issues with dynamic resolution
    if (from === 'Farm') {
      from = 'Farm Location';
    }
    if (from === 'Unknown Farmer' || from === 'Unknown Seller') {
      from = 'Unknown User';
    }
    if (to === 'Unknown Farmer' || to === 'Unknown Buyer') {
      to = 'Unknown User';
    }
    
    // Special handling for harvest transactions - force farmer name in both fields
    if (transaction.type === 'HARVEST') {
      // If "from" is "Farm Location", replace with actual farmer name
      if (from === 'Farm Location' && farmerName) {
        from = farmerName;
        console.log('🔍 DEBUG: Fixed harvest transaction from Farm Location to:', farmerName);
      }
      // If "to" is "Farm Location", replace with actual farmer name
      if (to === 'Farm Location' && farmerName) {
        to = farmerName;
        console.log('🔍 DEBUG: Fixed harvest transaction to Farm Location to:', farmerName);
      }
    }
    
    return {
      ...transaction,
      from,
      to
    };
  }

  /**
   * Create a new immutable transaction record
   */
  public async createTransaction(
    type: SupplyChainTransaction['type'],
    from: string,
    to: string,
    quantity: number,
    price: number,
    batchId: string,
    productDetails: SupplyChainTransaction['productDetails'],
    previousTransactionHash?: string,
    metadata?: SupplyChainTransaction['metadata']
  ): Promise<SupplyChainTransaction> {
    try {
      // Generate unique transaction ID
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create transaction object
      const transaction: SupplyChainTransaction = {
        transactionId,
        type,
        from,
        to,
        quantity,
        price,
        timestamp: new Date().toISOString(),
        previousTransactionHash,
        batchId,
        productDetails,
        metadata,
        ipfsHash: '', // Will be set after IPFS upload
        blockchainHash: undefined
      };

      // Upload transaction to IPFS
      const transactionBlob = new Blob([JSON.stringify(transaction, null, 2)], {
        type: 'application/json'
      });
      
      const ipfsResponse = await ipfsService.uploadFile(
        transactionBlob,
        `transaction_${transactionId}.json`,
        {
          name: `Transaction ${transactionId}`,
          keyvalues: {
            batchId: batchId,
            type: type,
            transactionId: transactionId
          }
        }
      );

      // Update transaction with IPFS hash
      transaction.ipfsHash = ipfsResponse.IpfsHash;

      // Store transaction in database
      await this.storeTransactionInDatabase(transaction);

      console.log(`Created transaction ${transactionId} with IPFS hash: ${transaction.ipfsHash}`);
      return transaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw new Error('Failed to create transaction');
    }
  }

  /**
   * Store transaction in database
   */
  private async storeTransactionInDatabase(transaction: SupplyChainTransaction): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('transactions')
        .insert({
          transaction_id: transaction.transactionId,
          batch_id: transaction.batchId,
          type: transaction.type,
          from_address: transaction.from,
          to_address: transaction.to,
          quantity: transaction.quantity,
          price: transaction.price,
          transaction_timestamp: transaction.timestamp,
          previous_transaction_hash: transaction.previousTransactionHash,
          ipfs_hash: transaction.ipfsHash,
          product_details: transaction.productDetails,
          metadata: transaction.metadata
        });

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Transactions table does not exist. Please run the database migration first.');
        }
        throw error;
      }
    } catch (error) {
      console.error('Error storing transaction in database:', error);
      throw new Error('Failed to store transaction in database');
    }
  }

  /**
   * Get transaction by ID
   */
  public async getTransaction(transactionId: string): Promise<SupplyChainTransaction | null> {
    try {
      const { data, error } = await (supabase as any)
        .from('transactions')
        .select('*')
        .eq('transaction_id', transactionId)
        .single();

      if (error || !data) {
        return null;
      }

      return this.mapDatabaseToTransaction(data);
    } catch (error) {
      console.error('Error getting transaction:', error);
      return null;
    }
  }

  /**
   * Get transaction by IPFS hash
   */
  public async getTransactionByIPFSHash(ipfsHash: string): Promise<SupplyChainTransaction | null> {
    try {
      const { data, error } = await (supabase as any)
        .from('transactions')
        .select('*')
        .eq('ipfs_hash', ipfsHash)
        .single();

      if (error || !data) {
        return null;
      }

      return this.mapDatabaseToTransaction(data);
    } catch (error) {
      console.error('Error getting transaction by IPFS hash:', error);
      return null;
    }
  }

  /**
   * Get all transactions for a batch using group-based system
   */
  public async getBatchTransactions(batchId: string): Promise<SupplyChainTransaction[]> {
    try {
      console.log('Getting batch transactions for batch:', batchId);
      
      // First, get the batch data to find the group_id
      const { data: batch, error: batchError } = await (supabase as any)
        .from('batches')
        .select(`
          *,
          profiles:farmer_id (
            full_name,
            farm_location
          )
        `)
        .eq('id', batchId)
        .single();

      if (batchError || !batch) {
        console.warn('Batch not found:', batchId);
        return [];
      }

      // If batch has a group_id, get files from group_files table
      if (batch.group_id) {
        const { data: groupFiles, error: groupError } = await (supabase as any)
          .from('group_files')
          .select('*')
          .eq('group_id', batch.group_id)
          .order('created_at', { ascending: true });

        if (groupError) {
          console.error('Error fetching group files:', groupError);
          return [];
        }

        // Convert group files to transaction format
        const transactions: SupplyChainTransaction[] = [];
        
        // Get farmer name from batch data - make it truly dynamic
        let farmerName = null;
        console.log('🔍 DEBUG: Batch data:', batch);
        console.log('🔍 DEBUG: Batch profiles:', batch.profiles);
        console.log('🔍 DEBUG: Batch farmer_id:', batch.farmer_id);
        
        if (batch.profiles?.full_name) {
          farmerName = batch.profiles.full_name;
          console.log('🔍 DEBUG: Using farmer name from batch.profiles:', farmerName);
        } else if (batch.farmer_id) {
          // Try to get farmer name from profiles table
          try {
            const { data: farmerProfile } = await (supabase as any)
              .from('profiles')
              .select('full_name')
              .eq('id', batch.farmer_id)
              .single();
            
            if (farmerProfile?.full_name) {
              farmerName = farmerProfile.full_name;
              console.log('🔍 DEBUG: Using farmer name from profiles table:', farmerName);
            }
          } catch (error) {
            console.warn('Could not fetch farmer profile:', error);
          }
        }
        
        // If still no farmer name found, try to get from user_id
        if (!farmerName && batch.user_id) {
          try {
            const { data: userProfile } = await (supabase as any)
              .from('profiles')
              .select('full_name')
              .eq('user_id', batch.user_id)
              .single();
            
            if (userProfile?.full_name) {
              farmerName = userProfile.full_name;
              console.log('🔍 DEBUG: Using farmer name from user_id:', farmerName);
            }
          } catch (error) {
            console.warn('Could not fetch user profile:', error);
          }
        }
        
        console.log('🔍 DEBUG: Final farmer name:', farmerName);
        
        for (const file of groupFiles || []) {
          // Parse metadata if it's a string
          let parsedMetadata = file.metadata;
          if (typeof file.metadata === 'string') {
            try {
              parsedMetadata = JSON.parse(file.metadata);
            } catch (e) {
              console.warn('Failed to parse metadata:', file.metadata);
              parsedMetadata = {};
            }
          }
          
          // Get identifiers from metadata
          const fromIdentifier = parsedMetadata?.from || parsedMetadata?.keyvalues?.from;
          const toIdentifier = parsedMetadata?.to || parsedMetadata?.keyvalues?.to;
          const storedFarmerName = parsedMetadata?.farmerName || parsedMetadata?.keyvalues?.farmerName;
          const storedBuyerName = parsedMetadata?.buyerName || parsedMetadata?.keyvalues?.buyerName;
          
          // Resolve names dynamically from stored data and database
          let fromName = null;
          let toName = null;
          
          if (file.transaction_type === 'HARVEST') {
            // For harvest transactions: Farmer harvests and owns the crop
            fromName = storedFarmerName || farmerName || await nameResolver.resolveName(fromIdentifier || 'Unknown Farmer');
            toName = storedFarmerName || farmerName || await nameResolver.resolveName(toIdentifier || 'Unknown Farmer');
            console.log('🔍 DEBUG: HARVEST transaction - fromName:', fromName, 'toName:', toName);
          } else if (file.transaction_type === 'PURCHASE') {
            // For purchase transactions: Get actual seller and buyer names
            fromName = storedFarmerName || farmerName || await nameResolver.resolveName(fromIdentifier || 'Unknown Seller');
            toName = storedBuyerName || await nameResolver.resolveName(toIdentifier || 'Unknown Buyer');
            console.log('🔍 DEBUG: PURCHASE transaction - fromName:', fromName, 'toName:', toName);
            console.log('🔍 DEBUG: storedFarmerName:', storedFarmerName, 'farmerName:', farmerName);
            console.log('🔍 DEBUG: storedBuyerName:', storedBuyerName, 'toIdentifier:', toIdentifier);
          } else {
            // For other transactions, use name resolver for both
            fromName = await nameResolver.resolveName(fromIdentifier || 'Unknown');
            toName = await nameResolver.resolveName(toIdentifier || 'Unknown');
            console.log('🔍 DEBUG: OTHER transaction - fromName:', fromName, 'toName:', toName);
          }
          
          // Ensure we have valid names - fallback to dynamic resolution if needed
          if (!fromName || fromName === 'Unknown' || fromName === 'Unknown Farmer') {
            fromName = farmerName || 'Unknown User';
          }
          if (!toName || toName === 'Unknown' || toName === 'Unknown Farmer') {
            toName = farmerName || 'Unknown User';
          }
          
          const transaction: SupplyChainTransaction = {
            transactionId: file.id,
            type: file.transaction_type as SupplyChainTransaction['type'],
            from: fromName,
            to: toName,
            quantity: parseInt(parsedMetadata?.quantity || parsedMetadata?.keyvalues?.quantity || '0'),
            price: parseFloat(parsedMetadata?.price || parsedMetadata?.keyvalues?.price || '0'),
            timestamp: file.created_at,
            previousTransactionHash: undefined,
            batchId: file.batch_id || batchId,
            productDetails: {
              crop: batch.crop_type,
              variety: batch.variety,
              grading: batch.grading
            },
            metadata: parsedMetadata,
            ipfsHash: file.ipfs_hash,
            blockchainHash: undefined
          };
          
          // Clean up the transaction data before adding
          const cleanedTransaction = this.cleanTransactionData(transaction, farmerName);
          transactions.push(cleanedTransaction);
        }

        console.log(`Found ${transactions.length} transactions for batch ${batchId}`);
        return transactions;
      }

      // Fallback: try to get from transactions table if it exists
      try {
        const { data, error } = await (supabase as any)
          .from('transactions')
          .select('*')
          .eq('batch_id', batchId)
          .order('transaction_timestamp', { ascending: true });

        if (error) {
          console.warn('Transactions table not available, returning empty array for batch:', batchId);
          return [];
        }

        return (data || []).map((record: any) => this.mapDatabaseToTransaction(record));
      } catch (error) {
        console.warn('Transactions table not available in group-based system, returning empty array for batch:', batchId);
        return [];
      }
    } catch (error) {
      console.error('Error getting batch transactions:', error);
      return [];
    }
  }

  /**
   * Build complete transaction chain for a batch
   */
  public async getTransactionChain(batchId: string): Promise<TransactionChain> {
    try {
      const transactions = await this.getBatchTransactions(batchId);
      
      if (transactions.length === 0) {
        // Return empty chain instead of throwing error
        return {
          batchId,
          transactions: [],
          currentOwners: {},
          totalQuantity: 0,
          availableQuantity: 0
        };
      }

      // Get farmer name for cleanup
      let farmerName = null;
      try {
        const { data: batch } = await (supabase as any)
          .from('batches')
          .select('profiles(full_name), farmer_id, user_id')
          .eq('id', batchId)
          .single();
        
        if (batch?.profiles?.full_name) {
          farmerName = batch.profiles.full_name;
        } else if (batch?.farmer_id) {
          const { data: farmerProfile } = await (supabase as any)
            .from('profiles')
            .select('full_name')
            .eq('id', batch.farmer_id)
            .single();
          if (farmerProfile?.full_name) {
            farmerName = farmerProfile.full_name;
          }
        }
      } catch (error) {
        console.warn('Could not fetch farmer name for transaction cleanup:', error);
      }

      // Final cleanup of all transactions
      const cleanedTransactions = transactions.map(transaction => this.cleanTransactionData(transaction, farmerName));

      // Calculate current ownership
      const currentOwners: { [owner: string]: { quantity: number; lastTransaction: string } } = {};
      let totalQuantity = 0;
      let availableQuantity = 0;

      // Process transactions in order
      for (const transaction of cleanedTransactions) {
        if (transaction.type === 'HARVEST') {
          // Initial harvest - farmer owns everything (farmer is the "to" field)
          currentOwners[transaction.to] = {
            quantity: transaction.quantity,
            lastTransaction: transaction.transactionId
          };
          totalQuantity = transaction.quantity;
          availableQuantity = transaction.quantity;
        } else if (transaction.type === 'PURCHASE' || transaction.type === 'TRANSFER') {
          // Transfer ownership
          if (currentOwners[transaction.from]) {
            currentOwners[transaction.from].quantity -= transaction.quantity;
            if (currentOwners[transaction.from].quantity <= 0) {
              delete currentOwners[transaction.from];
            }
          }

          if (currentOwners[transaction.to]) {
            currentOwners[transaction.to].quantity += transaction.quantity;
          } else {
            currentOwners[transaction.to] = {
              quantity: transaction.quantity,
              lastTransaction: transaction.transactionId
            };
          }

          availableQuantity -= transaction.quantity;
        }
      }

      return {
        batchId,
        transactions: cleanedTransactions,
        currentOwners,
        totalQuantity,
        availableQuantity: Math.max(0, availableQuantity)
      };
    } catch (error) {
      console.error('Error building transaction chain:', error);
      throw new Error('Failed to build transaction chain');
    }
  }

  /**
   * Get blockchain transaction history for a batch
   */
  async getBlockchainTransactionHistory(batchId: string): Promise<any[]> {
    try {
      console.log('🔍 DEBUG: Fetching blockchain transaction history for batch:', batchId);
      const blockchainTransactions = await blockchainTransactionManager.getBatchTransactionHistory(batchId);
      console.log('🔍 DEBUG: Blockchain transactions:', blockchainTransactions);
      return blockchainTransactions;
    } catch (error) {
      console.error('Error fetching blockchain transaction history:', error);
      return [];
    }
  }

  /**
   * Get complete transaction history (database + blockchain)
   */
  async getCompleteTransactionHistory(batchId: string): Promise<any[]> {
    try {
      console.log('🔍 DEBUG: Fetching complete transaction history for batch:', batchId);
      
      // Get database transactions
      const dbTransactions = await this.getBatchTransactions(batchId);
      console.log('🔍 DEBUG: Database transactions:', dbTransactions);
      
      // Get blockchain transactions
      const blockchainTransactions = await this.getBlockchainTransactionHistory(batchId);
      console.log('🔍 DEBUG: Blockchain transactions:', blockchainTransactions);
      
      // Merge and sort by timestamp
      const allTransactions = [...dbTransactions, ...blockchainTransactions];
      allTransactions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      console.log('🔍 DEBUG: Complete transaction history:', allTransactions);
      return allTransactions;
    } catch (error) {
      console.error('Error fetching complete transaction history:', error);
      return [];
    }
  }

  /**
   * Get ownership history for a batch
   */
  public async getOwnershipHistory(batchId: string): Promise<OwnershipRecord[]> {
    try {
      const chain = await this.getTransactionChain(batchId);
      const ownershipHistory: OwnershipRecord[] = [];

      for (const transaction of chain.transactions) {
        if (transaction.type === 'HARVEST' || transaction.type === 'PURCHASE' || transaction.type === 'TRANSFER') {
          // For all transactions, the "to" field becomes the owner
          ownershipHistory.push({
            owner: transaction.to,
            quantity: transaction.quantity,
            transactionId: transaction.transactionId,
            transaction_timestamp: transaction.timestamp,
            type: transaction.type
          });
        }
      }

      return ownershipHistory;
    } catch (error) {
      console.error('Error getting ownership history:', error);
      return [];
    }
  }

  /**
   * Map database record to transaction object
   */
  private mapDatabaseToTransaction(data: any): SupplyChainTransaction {
    const transaction = {
      transactionId: data.transaction_id,
      type: data.type,
      from: data.from_address,
      to: data.to_address,
      quantity: data.quantity,
      price: data.price,
      timestamp: data.transaction_timestamp,
      previousTransactionHash: data.previous_transaction_hash,
      batchId: data.batch_id,
      productDetails: data.product_details,
      metadata: data.metadata,
      ipfsHash: data.ipfs_hash,
      blockchainHash: data.blockchain_hash
    };
    
    // Clean up the transaction data
    return this.cleanTransactionData(transaction);
  }

  /**
   * Verify transaction chain integrity
   */
  public async verifyTransactionChain(batchId: string): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      const chain = await this.getTransactionChain(batchId);
      const errors: string[] = [];

      // Check if first transaction is HARVEST
      if (chain.transactions.length === 0) {
        errors.push('No transactions found');
        return { isValid: false, errors };
      }

      if (chain.transactions[0].type !== 'HARVEST') {
        errors.push('First transaction must be HARVEST');
      }

      // Check transaction linking
      for (let i = 1; i < chain.transactions.length; i++) {
        const current = chain.transactions[i];
        const previous = chain.transactions[i - 1];
        
        if (current.previousTransactionHash !== previous.ipfsHash) {
          errors.push(`Transaction ${current.transactionId} has incorrect previous hash`);
        }
      }

      // Check quantity consistency
      let runningTotal = 0;
      for (const transaction of chain.transactions) {
        if (transaction.type === 'HARVEST') {
          runningTotal = transaction.quantity;
        } else if (transaction.type === 'PURCHASE' || transaction.type === 'TRANSFER') {
          runningTotal -= transaction.quantity;
          if (runningTotal < 0) {
            errors.push(`Transaction ${transaction.transactionId} exceeds available quantity`);
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      console.error('Error verifying transaction chain:', error);
      return {
        isValid: false,
        errors: ['Failed to verify transaction chain']
      };
    }
  }
}

// Export singleton instance
export const transactionManager = TransactionManager.getInstance();
