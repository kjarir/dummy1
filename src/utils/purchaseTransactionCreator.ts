import { transactionManager } from './transactionManager';
import { SupplyChainTransaction } from '@/types/transaction';

/**
 * Purchase Transaction Creator
 * Creates purchase transactions when someone buys from the current owner
 */
export class PurchaseTransactionCreator {
  private static instance: PurchaseTransactionCreator;

  private constructor() {}

  public static getInstance(): PurchaseTransactionCreator {
    if (!PurchaseTransactionCreator.instance) {
      PurchaseTransactionCreator.instance = new PurchaseTransactionCreator();
    }
    return PurchaseTransactionCreator.instance;
  }

  /**
   * Create purchase transaction
   */
  public async createPurchaseTransaction(
    batchId: string,
    fromOwner: string,
    toBuyer: string,
    quantity: number,
    unitPrice: number,
    deliveryAddress: string,
    notes?: string
  ): Promise<string> {
    try {
      // Get the current transaction chain to find the last transaction
      const chain = await transactionManager.getTransactionChain(batchId);
      
      if (chain.transactions.length === 0) {
        throw new Error('No harvest transaction found for this batch');
      }

      // Get the last transaction to link to
      const lastTransaction = chain.transactions[chain.transactions.length - 1];
      
      // Verify the seller has enough quantity
      if (!chain.currentOwners[fromOwner] || chain.currentOwners[fromOwner].quantity < quantity) {
        throw new Error('Insufficient quantity available for purchase');
      }

      // Get product details from the harvest transaction
      const harvestTransaction = chain.transactions.find(tx => tx.type === 'HARVEST');
      if (!harvestTransaction) {
        throw new Error('Harvest transaction not found');
      }

      // Create the purchase transaction
      const purchaseTransaction = await transactionManager.createTransaction(
        'PURCHASE',
        fromOwner,
        toBuyer,
        quantity,
        quantity * unitPrice,
        batchId,
        harvestTransaction.productDetails,
        lastTransaction.ipfsHash, // Link to previous transaction
        {
          location: deliveryAddress,
          notes: notes || `Purchase of ${quantity}kg at ₹${unitPrice}/kg`,
          qualityScore: harvestTransaction.metadata?.qualityScore || 100
        }
      );

      console.log(`Created purchase transaction for batch ${batchId}: ${purchaseTransaction.transactionId}`);
      return purchaseTransaction.transactionId;
    } catch (error) {
      console.error('Error creating purchase transaction:', error);
      throw new Error('Failed to create purchase transaction');
    }
  }

  /**
   * Get available quantity for purchase from a specific owner
   */
  public async getAvailableQuantityFromOwner(batchId: string, owner: string): Promise<number> {
    try {
      const chain = await transactionManager.getTransactionChain(batchId);
      return chain.currentOwners[owner]?.quantity || 0;
    } catch (error) {
      console.error('Error getting available quantity from owner:', error);
      return 0;
    }
  }

  /**
   * Get current owners and their quantities
   */
  public async getCurrentOwners(batchId: string): Promise<{ [owner: string]: number }> {
    try {
      const chain = await transactionManager.getTransactionChain(batchId);
      return Object.fromEntries(
        Object.entries(chain.currentOwners).map(([owner, data]) => [owner, data.quantity])
      );
    } catch (error) {
      console.error('Error getting current owners:', error);
      return {};
    }
  }

  /**
   * Verify if a purchase is valid
   */
  public async verifyPurchase(
    batchId: string,
    fromOwner: string,
    quantity: number
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      const chain = await transactionManager.getTransactionChain(batchId);
      
      // Check if batch exists
      if (chain.transactions.length === 0) {
        return { isValid: false, error: 'Batch not found' };
      }

      // Check if seller exists
      if (!chain.currentOwners[fromOwner]) {
        return { isValid: false, error: 'Seller not found' };
      }

      // Check if seller has enough quantity
      if (chain.currentOwners[fromOwner].quantity < quantity) {
        return { 
          isValid: false, 
          error: `Insufficient quantity. Available: ${chain.currentOwners[fromOwner].quantity}kg, Requested: ${quantity}kg` 
        };
      }

      // Check if quantity is positive
      if (quantity <= 0) {
        return { isValid: false, error: 'Quantity must be greater than 0' };
      }

      return { isValid: true };
    } catch (error) {
      console.error('Error verifying purchase:', error);
      return { isValid: false, error: 'Failed to verify purchase' };
    }
  }

  /**
   * Get purchase history for a batch
   */
  public async getPurchaseHistory(batchId: string): Promise<SupplyChainTransaction[]> {
    try {
      const transactions = await transactionManager.getBatchTransactions(batchId);
      return transactions.filter(tx => tx.type === 'PURCHASE');
    } catch (error) {
      console.error('Error getting purchase history:', error);
      return [];
    }
  }

  /**
   * Get total sold quantity
   */
  public async getTotalSoldQuantity(batchId: string): Promise<number> {
    try {
      const chain = await transactionManager.getTransactionChain(batchId);
      return chain.totalQuantity - chain.availableQuantity;
    } catch (error) {
      console.error('Error getting total sold quantity:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const purchaseTransactionCreator = PurchaseTransactionCreator.getInstance();
