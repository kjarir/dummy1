import { transactionManager } from './transactionManager';
import { supabase } from '@/integrations/supabase/client';

/**
 * Harvest Transaction Creator
 * Creates the initial harvest transaction when a farmer registers a crop batch
 */
export class HarvestTransactionCreator {
  private static instance: HarvestTransactionCreator;

  private constructor() {}

  public static getInstance(): HarvestTransactionCreator {
    if (!HarvestTransactionCreator.instance) {
      HarvestTransactionCreator.instance = new HarvestTransactionCreator();
    }
    return HarvestTransactionCreator.instance;
  }

  /**
   * Create harvest transaction for a newly registered batch
   */
  public async createHarvestTransaction(
    batchId: string,
    farmerAddress: string,
    cropType: string,
    variety: string,
    harvestQuantity: number,
    harvestDate: string,
    grading: string = 'Standard',
    certification: string = 'Standard',
    pricePerKg: number = 0
  ): Promise<string> {
    try {
      // Create the harvest transaction
      const harvestTransaction = await transactionManager.createTransaction(
        'HARVEST',
        'Farm', // From: Farm (initial source)
        farmerAddress, // To: Farmer (first owner)
        harvestQuantity,
        harvestQuantity * pricePerKg, // Total price
        batchId,
        {
          crop: cropType,
          variety: variety,
          harvestDate: harvestDate,
          grading: grading,
          certification: certification
        },
        undefined, // No previous transaction (this is the first)
        {
          location: 'Farm Location',
          notes: 'Initial harvest and registration',
          qualityScore: 100
        }
      );

      // Update the batch record with the transaction hash
      await this.updateBatchWithTransactionHash(batchId, harvestTransaction.ipfsHash);

      console.log(`Created harvest transaction for batch ${batchId}: ${harvestTransaction.transactionId}`);
      return harvestTransaction.transactionId;
    } catch (error) {
      console.error('Error creating harvest transaction:', error);
      throw new Error('Failed to create harvest transaction');
    }
  }

  /**
   * Update batch record with transaction hash
   */
  private async updateBatchWithTransactionHash(batchId: string, transactionHash: string): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('batches')
        .update({ 
          initial_transaction_hash: transactionHash,
          updated_at: new Date().toISOString()
        })
        .eq('id', batchId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating batch with transaction hash:', error);
      throw new Error('Failed to update batch with transaction hash');
    }
  }

  /**
   * Get harvest transaction for a batch
   */
  public async getHarvestTransaction(batchId: string): Promise<any> {
    try {
      const transactions = await transactionManager.getBatchTransactions(batchId);
      const harvestTransaction = transactions.find(tx => tx.type === 'HARVEST');
      return harvestTransaction || null;
    } catch (error) {
      console.error('Error getting harvest transaction:', error);
      return null;
    }
  }

  /**
   * Verify harvest transaction exists for a batch
   */
  public async verifyHarvestTransaction(batchId: string): Promise<boolean> {
    try {
      const harvestTransaction = await this.getHarvestTransaction(batchId);
      return harvestTransaction !== null;
    } catch (error) {
      console.error('Error verifying harvest transaction:', error);
      return false;
    }
  }
}

// Export singleton instance
export const harvestTransactionCreator = HarvestTransactionCreator.getInstance();
