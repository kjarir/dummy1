import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { ipfsService } from '@/features/ipfs/utils/ipfs';
import { SupplyChainTransaction, TransactionChain, OwnershipRecord } from '@/types/transaction';
import { nameResolver } from '@/features/blockchain/utils/nameResolver';
import { blockchainTransactionManager } from './blockchainTransactionManager';
import { logger } from '@/lib/logger';
import { sanitizeError, sanitizeString, isValidUUID } from '@/lib/security';

type TransactionRow = Tables<'transactions'>;
type BatchRow = Tables<'batches'>;
type ProfileRow = Tables<'profiles'>;
type GroupFileRow = Tables<'group_files'>;

type BatchWithProfile = BatchRow & {
  profiles?: Pick<ProfileRow, 'full_name' | 'farm_location'> | null;
};

/**
 * TransactionType Enum - Replace hardcoded strings
 */
export enum TransactionType {
  HARVEST = 'HARVEST',
  PURCHASE = 'PURCHASE',
  TRANSFER = 'TRANSFER',
  PROCESSING = 'PROCESSING',
  RETAIL = 'RETAIL'
}

/**
 * Format profile name with user type prefix
 */
function formatProfileName(profile: Pick<ProfileRow, 'full_name' | 'user_type'>): string {
  if (!profile.full_name) {
    return 'Unknown User';
  }
  
  let name = profile.full_name.trim();
  
  if (profile.user_type) {
    const userTypePrefix = profile.user_type.charAt(0).toUpperCase() + profile.user_type.slice(1);
    // Check if name already starts with user type to avoid duplication
    if (!name.toLowerCase().startsWith(profile.user_type.toLowerCase())) {
      name = `${userTypePrefix} - ${name}`;
    }
  }
  
  return name;
}

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
   * Create a new immutable transaction record
   * DATA INTEGRITY FIX: Validates from/to before saving, throws error if invalid
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
      // DATA INTEGRITY: Validate that from and to are not "Unknown" or empty
      const sanitizedFrom = sanitizeString(from || '', 500).trim();
      const sanitizedTo = sanitizeString(to || '', 500).trim();
      
      if (!sanitizedFrom || sanitizedFrom === '' || sanitizedFrom.toLowerCase() === 'unknown' || sanitizedFrom.toLowerCase() === 'unknown user' || sanitizedFrom.toLowerCase() === 'unknown farmer' || sanitizedFrom.toLowerCase() === 'unknown seller') {
        throw new Error('Invalid "from" field. Cannot be empty, "Unknown", "Unknown User", "Unknown Farmer", or "Unknown Seller".');
      }
      
      if (!sanitizedTo || sanitizedTo === '' || sanitizedTo.toLowerCase() === 'unknown' || sanitizedTo.toLowerCase() === 'unknown user' || sanitizedTo.toLowerCase() === 'unknown farmer' || sanitizedTo.toLowerCase() === 'unknown buyer') {
        throw new Error('Invalid "to" field. Cannot be empty, "Unknown", "Unknown User", "Unknown Farmer", or "Unknown Buyer".');
      }
      
      // Generate unique transaction ID
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create transaction object with validated data
      const transaction: SupplyChainTransaction = {
        transactionId,
        type,
        from: sanitizedFrom,
        to: sanitizedTo,
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

      // Created transaction persisted with IPFS hash
      return transaction;
    } catch (error) {
      logger.error('Error creating transaction', error);
      throw new Error(sanitizeError(error));
    }
  }

  /**
   * Store transaction in database
   */
  private async storeTransactionInDatabase(transaction: SupplyChainTransaction): Promise<void> {
    try {
      const { error } = await supabase
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
          previous_transaction_hash: transaction.previousTransactionHash ?? null,
          ipfs_hash: transaction.ipfsHash,
          product_details: transaction.productDetails,
          metadata: transaction.metadata ?? null,
        } satisfies Tables<'transactions'>);

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Transactions table does not exist. Please run the database migration first.');
        }
        throw error;
      }
    } catch (error) {
      logger.error('Error storing transaction in database', error);
      throw new Error('Failed to store transaction in database');
    }
  }

  /**
   * Get transaction by ID
   */
  public async getTransaction(transactionId: string): Promise<SupplyChainTransaction | null> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('transaction_id', transactionId)
        .single();

      if (error || !data) {
        logger.debug('Transaction not found', { transactionId: sanitizeString(transactionId, 100) });
        return null;
      }

      return this.mapDatabaseToTransaction(data);
    } catch (error) {
      logger.error('Error getting transaction', error);
      return null;
    }
  }

  /**
   * Get transaction by IPFS hash
   */
  public async getTransactionByIPFSHash(ipfsHash: string): Promise<SupplyChainTransaction | null> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('ipfs_hash', ipfsHash)
        .single();

      if (error || !data) {
        logger.debug('Transaction not found by IPFS hash', { ipfsHash: sanitizeString(ipfsHash, 100) });
        return null;
      }

      return this.mapDatabaseToTransaction(data);
    } catch (error) {
      logger.error('Error getting transaction by IPFS hash', error);
      return null;
    }
  }

  /**
   * Get all transactions for a batch using group-based system
   * PERFORMANCE FIX: Implemented batch fetching to eliminate N+1 queries
   */
  public async getBatchTransactions(batchId: string): Promise<SupplyChainTransaction[]> {
    try {
      // First, get the batch data to find the group_id
      const { data: batchData, error: batchError } = await supabase
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

      if (batchError || !batchData) {
        logger.warn('Batch not found', { batchId: sanitizeString(batchId, 100) });
        return [];
      }

      const batch: BatchWithProfile = {
        ...batchData,
        profiles: batchData.profiles || null
      };

      // Get farmer name from batch data
      const farmerName = batch.profiles?.full_name || null;

      // If batch has a group_id, get files from group_files table
      if (batch.group_id) {
        // Fetch ALL transaction types from group_files
        const { data: groupFiles, error: groupError } = await supabase
          .from('group_files')
          .select('*')
          .eq('group_id', batch.group_id)
          .in('transaction_type', [TransactionType.HARVEST, TransactionType.PURCHASE, TransactionType.RETAIL, TransactionType.TRANSFER])
          .order('created_at', { ascending: true });

        if (groupError) {
          logger.error('Error fetching group files', groupError);
          return [];
        }

        if (!groupFiles || groupFiles.length === 0) {
          return [];
        }

        // PERFORMANCE FIX: Batch Fetching Pattern - Collect all UUIDs first
        const profileIds = new Set<string>();
        
        // First pass: Collect all unique profile IDs (UUIDs) from metadata
        for (const file of groupFiles) {
          let parsedMetadata: Record<string, unknown> | null = null;
          
          if (typeof file.metadata === 'string') {
            try {
              parsedMetadata = JSON.parse(file.metadata) as Record<string, unknown>;
            } catch (e) {
              logger.warn('Failed to parse metadata', { error: e, metadata: typeof file.metadata === 'string' ? file.metadata.substring(0, 100) : 'non-string' });
              parsedMetadata = {};
            }
          } else if (file.metadata && typeof file.metadata === 'object') {
            parsedMetadata = file.metadata as Record<string, unknown>;
          }
          
          const fromIdentifier = parsedMetadata?.from || parsedMetadata?.keyvalues?.from;
          const toIdentifier = parsedMetadata?.to || parsedMetadata?.keyvalues?.to;
          
          // Collect UUIDs (profile IDs) for batch fetching
          if (fromIdentifier && typeof fromIdentifier === 'string' && isValidUUID(fromIdentifier)) {
            profileIds.add(fromIdentifier);
          }
          if (toIdentifier && typeof toIdentifier === 'string' && isValidUUID(toIdentifier)) {
            profileIds.add(toIdentifier);
          }
        }

        // PERFORMANCE FIX: Single batch query to fetch all profiles at once
        const profileMap = new Map<string, Pick<ProfileRow, 'full_name' | 'user_type'>>();
        
        if (profileIds.size > 0) {
          try {
            const profileIdArray = Array.from(profileIds);
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('id, full_name, user_type')
              .in('id', profileIdArray);
            
            if (!profilesError && profiles) {
              for (const profile of profiles) {
                if (profile.id && profile.full_name) {
                  profileMap.set(profile.id, {
                    full_name: profile.full_name,
                    user_type: profile.user_type || null
                  });
                }
              }
            } else {
              logger.warn('Error fetching profiles in batch', profilesError);
            }
          } catch (batchFetchError) {
            logger.error('Error in batch profile fetch', batchFetchError);
          }
        }

        // Also add farmer profile to map if available
        if (batch.farmer_id && isValidUUID(batch.farmer_id)) {
          if (!profileMap.has(batch.farmer_id) && batch.profiles?.full_name) {
            profileMap.set(batch.farmer_id, {
              full_name: batch.profiles.full_name,
              user_type: null
            });
          }
        }

        // Second pass: Build transactions using the profile map for instant lookup
        const transactions: SupplyChainTransaction[] = [];
        
        for (const file of groupFiles) {
          // Parse metadata if it's a string
          let parsedMetadata: Record<string, unknown> | null = null;
          if (typeof file.metadata === 'string') {
            try {
              parsedMetadata = JSON.parse(file.metadata) as Record<string, unknown>;
            } catch (e) {
              logger.warn('Failed to parse metadata', { error: e, metadata: typeof file.metadata === 'string' ? file.metadata.substring(0, 100) : 'non-string' });
              parsedMetadata = {};
            }
          } else if (file.metadata && typeof file.metadata === 'object') {
            parsedMetadata = file.metadata as Record<string, unknown>;
          }
          
          // Get identifiers from metadata
          const fromIdentifier = parsedMetadata?.from || parsedMetadata?.keyvalues?.from;
          const toIdentifier = parsedMetadata?.to || parsedMetadata?.keyvalues?.to;
          const storedFarmerName = parsedMetadata?.farmerName || parsedMetadata?.keyvalues?.farmerName;
          const storedBuyerName = parsedMetadata?.buyerName || parsedMetadata?.keyvalues?.buyerName;
          
          // Resolve names using the profile map (instant lookup, no database calls)
          let fromName: string | null = null;
          let toName: string | null = null;
          
          if (file.transaction_type === TransactionType.HARVEST) {
            // For harvest transactions: Farmer harvests and owns the crop
            if (storedFarmerName && typeof storedFarmerName === 'string') {
              fromName = storedFarmerName;
              toName = storedFarmerName;
            } else if (farmerName) {
              fromName = farmerName;
              toName = farmerName;
            } else if (fromIdentifier && isValidUUID(fromIdentifier) && profileMap.has(fromIdentifier)) {
              const profile = profileMap.get(fromIdentifier)!;
              fromName = formatProfileName(profile);
              toName = fromName;
            } else {
              // Fallback to name resolver for non-UUID identifiers
              fromName = await nameResolver.resolveName(fromIdentifier || 'Unknown Farmer');
              toName = fromName;
            }
          } else if (file.transaction_type === TransactionType.PURCHASE || file.transaction_type === TransactionType.RETAIL) {
            // For purchase/retail transactions: Get actual seller and buyer names from map
            // Resolve seller (from)
            if (fromIdentifier && isValidUUID(fromIdentifier) && profileMap.has(fromIdentifier)) {
              const profile = profileMap.get(fromIdentifier)!;
              fromName = formatProfileName(profile);
            } else if (storedFarmerName && typeof storedFarmerName === 'string') {
              fromName = storedFarmerName;
            } else if (farmerName) {
              fromName = farmerName;
            } else {
              fromName = await nameResolver.resolveName(fromIdentifier || 'Unknown Seller');
            }
            
            // Resolve buyer (to)
            if (toIdentifier && isValidUUID(toIdentifier) && profileMap.has(toIdentifier)) {
              const profile = profileMap.get(toIdentifier)!;
              toName = formatProfileName(profile);
            } else if (storedBuyerName && typeof storedBuyerName === 'string') {
              toName = storedBuyerName;
            } else {
              toName = await nameResolver.resolveName(toIdentifier || 'Unknown Buyer');
            }
          } else {
            // For other transactions, use name resolver for both
            if (fromIdentifier && isValidUUID(fromIdentifier) && profileMap.has(fromIdentifier)) {
              const profile = profileMap.get(fromIdentifier)!;
              fromName = formatProfileName(profile);
            } else {
              fromName = await nameResolver.resolveName(fromIdentifier || 'Unknown');
            }
            
            if (toIdentifier && isValidUUID(toIdentifier) && profileMap.has(toIdentifier)) {
              const profile = profileMap.get(toIdentifier)!;
              toName = formatProfileName(profile);
            } else {
              toName = await nameResolver.resolveName(toIdentifier || 'Unknown');
            }
          }
          
          // Final validation: Ensure we have valid names (no "Unknown" allowed)
          if (!fromName || fromName === 'Unknown' || fromName === 'Unknown Farmer' || fromName === 'Unknown Seller') {
            fromName = farmerName || 'Invalid From Address';
          }
          if (!toName || toName === 'Unknown' || toName === 'Unknown Farmer' || toName === 'Unknown Buyer') {
            toName = farmerName || 'Invalid To Address';
          }
          
          const transaction: SupplyChainTransaction = {
            transactionId: file.id,
            type: file.transaction_type as SupplyChainTransaction['type'],
            from: fromName,
            to: toName,
            quantity: typeof parsedMetadata?.quantity === 'number' 
              ? parsedMetadata.quantity 
              : typeof parsedMetadata?.keyvalues?.quantity === 'number'
                ? parsedMetadata.keyvalues.quantity
                : parseInt(String(parsedMetadata?.quantity || parsedMetadata?.keyvalues?.quantity || '0'), 10),
            price: typeof parsedMetadata?.price === 'number'
              ? parsedMetadata.price
              : typeof parsedMetadata?.keyvalues?.price === 'number'
                ? parsedMetadata.keyvalues.price
                : parseFloat(String(parsedMetadata?.price || parsedMetadata?.keyvalues?.price || '0')),
            timestamp: file.created_at,
            previousTransactionHash: undefined,
            batchId: file.batch_id || batchId,
            productDetails: {
              crop: batch.crop_type || '',
              variety: batch.variety || '',
              grading: batch.grading || '',
              harvestDate: batch.harvest_date || ''
            },
            metadata: parsedMetadata,
            ipfsHash: file.ipfs_hash || '',
            blockchainHash: undefined
          };
          
          transactions.push(transaction);
        }

        // Also check transactions table for any additional transactions
        try {
          const { data: dbTransactions, error: dbError } = await supabase
            .from('transactions')
            .select('*')
            .eq('batch_id', batchId)
            .order('transaction_timestamp', { ascending: true });
          
          if (!dbError && dbTransactions && dbTransactions.length > 0) {
            // PERFORMANCE FIX: Batch fetch profiles for transactions table records
            const transactionProfileIds = new Set<string>();
            
            for (const record of dbTransactions) {
              if (record.from_address && isValidUUID(record.from_address)) {
                transactionProfileIds.add(record.from_address);
              }
              if (record.to_address && isValidUUID(record.to_address)) {
                transactionProfileIds.add(record.to_address);
              }
            }
            
            // Batch fetch profiles for transaction table records
            const transactionProfileMap = new Map<string, Pick<ProfileRow, 'full_name' | 'user_type'>>();
            
            if (transactionProfileIds.size > 0) {
              const transactionProfileIdArray = Array.from(transactionProfileIds);
              const { data: transactionProfiles, error: transactionProfilesError } = await supabase
                .from('profiles')
                .select('id, full_name, user_type')
                .in('id', transactionProfileIdArray);
              
              if (!transactionProfilesError && transactionProfiles) {
                for (const profile of transactionProfiles) {
                  if (profile.id && profile.full_name) {
                    transactionProfileMap.set(profile.id, {
                      full_name: profile.full_name,
                      user_type: profile.user_type || null
                    });
                  }
                }
              }
            }
            
            // Map transactions using the profile map
            const dbTransactionsMapped = dbTransactions.map((record: TransactionRow) => {
              let fromName = record.from_address || '';
              let toName = record.to_address || '';
              
              // Resolve using profile map (instant lookup)
              if (record.from_address && isValidUUID(record.from_address) && transactionProfileMap.has(record.from_address)) {
                const profile = transactionProfileMap.get(record.from_address)!;
                fromName = formatProfileName(profile);
              }
              
              if (record.to_address && isValidUUID(record.to_address) && transactionProfileMap.has(record.to_address)) {
                const profile = transactionProfileMap.get(record.to_address)!;
                toName = formatProfileName(profile);
              }
              
              return this.mapDatabaseToTransaction({
                ...record,
                from_address: fromName,
                to_address: toName
              });
            });
            
            // Merge and deduplicate by transaction ID
            const allTransactions = [...transactions];
            for (const dbTx of dbTransactionsMapped) {
              if (!allTransactions.find(t => t.transactionId === dbTx.transactionId)) {
                allTransactions.push(dbTx);
              }
            }
            
            // Sort by timestamp
            allTransactions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            
            return allTransactions;
          }
        } catch (dbError) {
          logger.warn('Could not fetch from transactions table', { error: dbError, batchId: sanitizeString(batchId, 100) });
        }
        
        return transactions;
      }

      // Fallback: try to get from transactions table if it exists
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('batch_id', sanitizeString(batchId, 100))
          .order('transaction_timestamp', { ascending: true });

        if (error) {
          logger.warn('Transactions table not available', { batchId: sanitizeString(batchId, 100) });
          return [];
        }

        if (!data || data.length === 0) {
          return [];
        }

        // PERFORMANCE FIX: Batch fetch profiles for fallback transactions
        const fallbackProfileIds = new Set<string>();
        
        for (const record of data) {
          if (record.from_address && isValidUUID(record.from_address)) {
            fallbackProfileIds.add(record.from_address);
          }
          if (record.to_address && isValidUUID(record.to_address)) {
            fallbackProfileIds.add(record.to_address);
          }
        }
        
        const fallbackProfileMap = new Map<string, Pick<ProfileRow, 'full_name' | 'user_type'>>();
        
        if (fallbackProfileIds.size > 0) {
          const fallbackProfileIdArray = Array.from(fallbackProfileIds);
          const { data: fallbackProfiles, error: fallbackProfilesError } = await supabase
            .from('profiles')
            .select('id, full_name, user_type')
            .in('id', fallbackProfileIdArray);
          
          if (!fallbackProfilesError && fallbackProfiles) {
            for (const profile of fallbackProfiles) {
              if (profile.id && profile.full_name) {
                fallbackProfileMap.set(profile.id, {
                  full_name: profile.full_name,
                  user_type: profile.user_type || null
                });
              }
            }
          }
        }
        
        // Map transactions using the profile map
        const transactionsWithNames = data.map((record) => {
          let fromName = record.from_address || '';
          let toName = record.to_address || '';
          
          // Resolve using profile map (instant lookup)
          if (record.from_address && isValidUUID(record.from_address) && fallbackProfileMap.has(record.from_address)) {
            const profile = fallbackProfileMap.get(record.from_address)!;
            fromName = formatProfileName(profile);
          }
          
          if (record.to_address && isValidUUID(record.to_address) && fallbackProfileMap.has(record.to_address)) {
            const profile = fallbackProfileMap.get(record.to_address)!;
            toName = formatProfileName(profile);
          }
          
          return this.mapDatabaseToTransaction({
            ...record,
            from_address: fromName,
            to_address: toName
          });
        });
        
        return transactionsWithNames;
      } catch (error) {
        logger.warn('Transactions table not available in group-based system', { batchId: sanitizeString(batchId, 100) });
        return [];
      }
    } catch (error) {
      logger.error('Error getting batch transactions', error);
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

      // Calculate current ownership
      const currentOwners: { [owner: string]: { quantity: number; lastTransaction: string } } = {};
      let totalQuantity = 0;
      let availableQuantity = 0;

      // Process transactions in order
      for (const transaction of transactions) {
        if (transaction.type === TransactionType.HARVEST) {
          // Initial harvest - farmer owns everything (farmer is the "to" field)
          currentOwners[transaction.to] = {
            quantity: transaction.quantity,
            lastTransaction: transaction.transactionId
          };
          totalQuantity = transaction.quantity;
          availableQuantity = transaction.quantity;
        } else if (transaction.type === TransactionType.PURCHASE || transaction.type === TransactionType.RETAIL || transaction.type === TransactionType.TRANSFER) {
          // Transfer ownership - RETAIL is when retailer buys from distributor
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
        transactions,
        currentOwners,
        totalQuantity,
        availableQuantity: Math.max(0, availableQuantity)
      };
    } catch (error) {
      logger.error('Error building transaction chain', error);
      throw new Error(sanitizeError(error));
    }
  }

  /**
   * Get blockchain transaction history for a batch
   */
  async getBlockchainTransactionHistory(batchId: string): Promise<SupplyChainTransaction[]> {
    try {
      const sanitizedBatchId = sanitizeString(batchId, 100);
      if (!sanitizedBatchId) {
        logger.warn('Invalid batch ID for blockchain transaction history', { batchId });
        return [];
      }
      const blockchainTransactions = await blockchainTransactionManager.getBatchTransactionHistory(sanitizedBatchId);
      return blockchainTransactions;
    } catch (error) {
      logger.error('Error fetching blockchain transaction history', error);
      return [];
    }
  }

  /**
   * Get complete transaction history (database + blockchain)
   */
  async getCompleteTransactionHistory(batchId: string): Promise<SupplyChainTransaction[]> {
    try {
      const sanitizedBatchId = sanitizeString(batchId, 100);
      if (!sanitizedBatchId) {
        logger.warn('Invalid batch ID for complete transaction history', { batchId });
        return [];
      }
      // Get database transactions
      const dbTransactions = await this.getBatchTransactions(sanitizedBatchId);
      // Get blockchain transactions
      const blockchainTransactions = await this.getBlockchainTransactionHistory(sanitizedBatchId);
      // Merge and sort by timestamp
      const allTransactions = [...dbTransactions, ...blockchainTransactions];
      allTransactions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      return allTransactions;
    } catch (error) {
      logger.error('Error fetching complete transaction history', error);
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
        if (transaction.type === TransactionType.HARVEST || transaction.type === TransactionType.PURCHASE || transaction.type === TransactionType.TRANSFER) {
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
      logger.error('Error getting ownership history', error);
      return [];
    }
  }

  /**
   * Map database record to transaction object
   */
  private mapDatabaseToTransaction(data: TransactionRow): SupplyChainTransaction {
    const transaction: SupplyChainTransaction = {
      transactionId: data.transaction_id,
      type: (data.type || 'UNKNOWN') as SupplyChainTransaction['type'],
      from: data.from_address ?? 'Invalid From Address',
      to: data.to_address ?? 'Invalid To Address',
      quantity: data.quantity ?? 0,
      price: data.price ?? 0,
      timestamp: data.transaction_timestamp || new Date().toISOString(),
      previousTransactionHash: data.previous_transaction_hash ?? undefined,
      batchId: data.batch_id ?? '',
      productDetails: (data.product_details && typeof data.product_details === 'object' 
        ? data.product_details as SupplyChainTransaction['productDetails']
        : {
            crop: '',
            variety: '',
            harvestDate: '',
          }),
      metadata: (data.metadata && typeof data.metadata === 'object' 
        ? data.metadata as SupplyChainTransaction['metadata']
        : undefined),
      ipfsHash: data.ipfs_hash ?? '',
      blockchainHash: data.blockchain_hash ?? undefined
    };
    
    return transaction;
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

      if (chain.transactions[0].type !== TransactionType.HARVEST) {
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
        if (transaction.type === TransactionType.HARVEST) {
          runningTotal = transaction.quantity;
        } else if (transaction.type === TransactionType.PURCHASE || transaction.type === TransactionType.TRANSFER) {
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
      logger.error('Error verifying transaction chain', error);
      return {
        isValid: false,
        errors: ['Failed to verify transaction chain']
      };
    }
  }
}

// Export singleton instance
export const transactionManager = TransactionManager.getInstance();
