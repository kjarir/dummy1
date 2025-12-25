import { supabase } from '@/integrations/supabase/client';
import { SupplyChainTransaction, EnhancedBatchData } from './certificateGenerator';
import { createUpdatedCertificate } from './ipfsRealityCheck';

/**
 * Store a new supply chain transaction
 */
export const recordSupplyChainTransaction = async (
  batchId: string,
  transaction: Omit<SupplyChainTransaction, 'id' | 'timestamp'>
): Promise<string> => {
  try {
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullTransaction: SupplyChainTransaction = {
      ...transaction,
      id: transactionId,
      timestamp: new Date().toISOString()
    };

    // Get existing batch data
    const { data: batch, error: fetchError } = await (supabase as any)
      .from('batches')
      .select('lab_test_results, harvest_quantity')
      .eq('id', batchId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Parse existing transaction history from lab_test_results field or create new array
    let transactionHistory: SupplyChainTransaction[] = [];
    if (batch?.lab_test_results && batch.lab_test_results.includes('| SupplyChain:')) {
      try {
        const historyPart = batch.lab_test_results.split('| SupplyChain:')[1];
        transactionHistory = JSON.parse(historyPart);
      } catch (e) {
        console.warn('Failed to parse existing transaction history, starting fresh');
        transactionHistory = [];
      }
    }

    // Add new transaction
    transactionHistory.push(fullTransaction);

    // Update batch with new transaction history in lab_test_results field
    const originalLabTest = batch.lab_test_results ? batch.lab_test_results.split('| SupplyChain:')[0] : '';
    const updatedLabTest = `${originalLabTest} | SupplyChain:${JSON.stringify(transactionHistory)}`;

    // Update batch with new transaction history
    const { error: updateError } = await (supabase as any)
      .from('batches')
      .update({ 
        lab_test_results: updatedLabTest
      })
      .eq('id', batchId);

    if (updateError) {
      throw updateError;
    }

    // Create a new certificate version with new transaction data
    // Note: We cannot update existing IPFS files - we create new ones
    try {
      await createUpdatedCertificate(batchId);
      console.log(`Created new certificate version for batch ${batchId} with new transaction`);
    } catch (certError) {
      console.warn('Failed to create new certificate version:', certError);
      // Don't fail the transaction if certificate creation fails
    }

    return transactionId;
  } catch (error) {
    console.error('Error recording supply chain transaction:', error);
    throw new Error('Failed to record supply chain transaction');
  }
};

/**
 * Get supply chain transaction history for a batch
 */
export const getSupplyChainHistory = async (batchId: string): Promise<SupplyChainTransaction[]> => {
  try {
    const { data: batch, error } = await (supabase as any)
      .from('batches')
      .select('lab_test_results')
      .eq('id', batchId)
      .single();

    if (error) {
      throw error;
    }

    if (!batch?.lab_test_results || !batch.lab_test_results.includes('| SupplyChain:')) {
      return [];
    }

    try {
      const historyPart = batch.lab_test_results.split('| SupplyChain:')[1];
      const transactions = JSON.parse(historyPart);
      
      // Fix existing transaction data issues with dynamic resolution
      return transactions.map((transaction: any) => {
        let from = transaction.from;
        let to = transaction.to;
        
        if (from === 'Farm') {
          from = 'Farm Location';
        }
        if (from === 'Unknown Farmer' || from === 'Unknown Seller') {
          from = 'Unknown User';
        }
        if (to === 'Unknown Farmer' || to === 'Unknown Buyer') {
          to = 'Unknown User';
        }
        
        return {
          ...transaction,
          from,
          to
        };
      });
    } catch (e) {
      console.warn('Failed to parse supply chain history from lab_test_results field');
      return [];
    }
  } catch (error) {
    console.error('Error fetching supply chain history:', error);
    return [];
  }
};

/**
 * Create initial harvest transaction when batch is registered
 */
export const createHarvestTransaction = async (
  batchId: string,
  farmerName: string,
  quantity: number,
  price: number,
  location?: string
): Promise<string> => {
  return await recordSupplyChainTransaction(batchId, {
    type: 'harvest',
    from: farmerName,
    to: farmerName,
    quantity,
    price,
    location: location || 'Farm Location',
    notes: 'Initial harvest and registration'
  });
};

/**
 * Create purchase transaction when someone buys the product
 */
export const createPurchaseTransaction = async (
  batchId: string,
  fromOwner: string,
  toBuyer: string,
  quantity: number,
  unitPrice: number,
  deliveryAddress: string
): Promise<string> => {
  const totalPrice = quantity * unitPrice;
  
  return await recordSupplyChainTransaction(batchId, {
    type: 'purchase',
    from: fromOwner,
    to: toBuyer,
    quantity,
    price: totalPrice,
    location: deliveryAddress,
    notes: `Purchase of ${quantity}kg at ₹${unitPrice}/kg`
  });
};

/**
 * Create processing transaction (e.g., when product goes to processing facility)
 */
export const createProcessingTransaction = async (
  batchId: string,
  fromOwner: string,
  toProcessor: string,
  quantity: number,
  processingFee: number,
  location?: string
): Promise<string> => {
  return await recordSupplyChainTransaction(batchId, {
    type: 'processing',
    from: fromOwner,
    to: toProcessor,
    quantity,
    price: processingFee,
    location: location || 'Processing Facility',
    notes: 'Product processing and quality enhancement'
  });
};

/**
 * Create retail transaction (e.g., when product reaches retail store)
 */
export const createRetailTransaction = async (
  batchId: string,
  fromOwner: string,
  toRetailer: string,
  quantity: number,
  retailPrice: number,
  location?: string
): Promise<string> => {
  return await recordSupplyChainTransaction(batchId, {
    type: 'retail',
    from: fromOwner,
    to: toRetailer,
    quantity,
    price: retailPrice,
    location: location || 'Retail Store',
    notes: 'Product available for retail sale'
  });
};

/**
 * Get enhanced batch data with transaction history for certificate generation
 */
export const getEnhancedBatchData = async (batchId: string): Promise<EnhancedBatchData | null> => {
  try {
    const { data: batch, error } = await (supabase as any)
      .from('batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (error || !batch) {
      return null;
    }

    // Get transaction history
    const transactionHistory = await getSupplyChainHistory(batchId);

    // Calculate current quantity by subtracting sold quantities from harvest quantity
    let currentQuantity = batch.harvest_quantity || 0;
    if (transactionHistory.length > 0) {
      const soldQuantity = transactionHistory
        .filter(tx => tx.type === 'purchase' || tx.type === 'transfer')
        .reduce((sum, tx) => sum + tx.quantity, 0);
      currentQuantity = Math.max(0, currentQuantity - soldQuantity);
    }

    // Get the latest owner from transaction history
    let currentOwner = batch.farmer || 'Unknown';
    if (transactionHistory.length > 0) {
      const latestTransaction = transactionHistory[transactionHistory.length - 1];
      if (latestTransaction.type === 'purchase' || latestTransaction.type === 'transfer') {
        currentOwner = latestTransaction.to;
      }
    }

    // Convert to enhanced batch data format
    const enhancedBatch: EnhancedBatchData = {
      id: batch.blockchain_id || batch.blockchain_batch_id || parseInt(batchId),
      farmer: batch.farmer || 'Unknown',
      crop: batch.crop_type || '',
      variety: batch.variety || '',
      harvestQuantity: batch.harvest_quantity?.toString() || '',
      sowingDate: batch.sowing_date || '',
      harvestDate: batch.harvest_date || '',
      freshnessDuration: batch.freshness_duration?.toString() || '7',
      grading: batch.grading || 'Standard',
      certification: batch.certification || 'Standard',
      labTest: batch.lab_test_results || '',
      price: Math.floor((batch.price_per_kg || 0) * 100), // Convert to paise
      ipfsHash: batch.ipfs_hash || batch.ipfs_certificate_hash || '',
      languageDetected: batch.language_detected || '',
      summary: batch.summary || '',
      callStatus: batch.call_status || '',
      offTopicCount: batch.off_topic_count || 0,
      currentOwner: currentOwner,
      transactionHistory,
      currentQuantity: currentQuantity,
      originalQuantity: batch.harvest_quantity || 0
    };

    return enhancedBatch;
  } catch (error) {
    console.error('Error getting enhanced batch data:', error);
    return null;
  }
};

/**
 * Generate current certificate with latest transaction history
 * This generates a fresh certificate with current data
 */
export const generateCurrentCertificate = async (batchId: string): Promise<Blob | null> => {
  try {
    // Always generate from current batch data to ensure we have the latest information
    const enhancedBatchData = await getEnhancedBatchData(batchId);
    if (!enhancedBatchData) {
      throw new Error('Batch not found');
    }

    const { generatePDFCertificate } = await import('./certificateGenerator');
    return await generatePDFCertificate(enhancedBatchData);
  } catch (error) {
    console.error('Error generating current certificate:', error);
    return null;
  }
};
