import { ethers } from 'ethers';
import { logger } from '@/lib/logger';
import { CONTRACT_ADDRESS } from '@/contracts/config';
import AgriTraceABI from '@/contracts/AgriTrace.json';
import { validateInteger } from '@/lib/security';

export interface BlockchainTransaction {
  batchId: string;
  from: string;
  to: string;
  transactionType: 'HARVEST' | 'PURCHASE' | 'TRANSFER';
  quantity: number;
  price: number;
  timestamp: string;
  transactionHash: string;
  blockNumber: number;
  ipfsHash?: string;
}

export class BlockchainTransactionManager {
  private contract: ethers.Contract;
  private provider: ethers.Provider;
  public signer: ethers.Signer | null = null;

  constructor(provider: ethers.Provider, signer?: ethers.Signer) {
    this.provider = provider;
    this.signer = signer || null;
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, AgriTraceABI.abi, signer || provider);
  }

  /**
   * Update the signer and reinitialize contract
   */
  updateSigner(signer: ethers.Signer) {
    this.signer = signer;
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, AgriTraceABI.abi, signer);
  }

  /**
   * Record a harvest transaction on blockchain
   */
  async recordHarvestTransaction(
    batchId: string,
    farmerAddress: string,
    cropType: string,
    variety: string,
    quantity: number,
    price: number,
    ipfsHash: string
  ): Promise<BlockchainTransaction> {
    if (!this.signer) {
      throw new Error('Signer required for blockchain transactions');
    }

    logger.debug('🔍 DEBUG: Recording harvest transaction on blockchain:', {
      batchId,
      farmerAddress,
      cropType,
      variety,
      quantity,
      price,
      ipfsHash
    });

    try {
      // Validate batchId is a valid number (blockchain batch ID)
      const numericBatchId = validateInteger(batchId, { min: 0 });
      
      const tx = await this.contract.recordHarvest(
        numericBatchId,
        farmerAddress,
        cropType,
        variety,
        quantity,
        price,
        ipfsHash
      );

      const receipt = await tx.wait();
      logger.debug('🔍 DEBUG: Harvest transaction receipt:', receipt);
      
      // Get block details for verification
      const block = await this.provider.getBlock(receipt.blockNumber);
      logger.debug('🔍 DEBUG: Block details for verification:', {
        blockNumber: receipt.blockNumber,
        blockHash: block?.hash,
        timestamp: block?.timestamp,
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: receipt.gasPrice?.toString(),
        transactionHash: receipt.hash
      });
      
      // Log verification info for Sepolia Explorer
      logger.debug('🔍 VERIFICATION INFO - Sepolia Explorer:');
      logger.debug(`Transaction Hash: ${receipt.hash}`);
      logger.debug(`Block Number: ${receipt.blockNumber}`);
      logger.debug(`Block Hash: ${block?.hash}`);
      logger.debug(`Explorer URL: https://sepolia.etherscan.io/tx/${receipt.hash}`);

      return {
        batchId,
        from: farmerAddress,
        to: farmerAddress, // Farmer owns the crop initially
        transactionType: 'HARVEST',
        quantity,
        price,
        timestamp: new Date().toISOString(),
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        ipfsHash
      };
    } catch (error) {
      logger.error('Error recording harvest transaction:', error);
      throw error;
    }
  }

  /**
   * Record a purchase transaction on blockchain
   * FIXED: Now accepts actual blockchainBatchId instead of generating fake ID
   */
  async recordPurchaseTransaction(
    batchId: string,
    fromAddress: string,
    toAddress: string,
    quantity: number,
    price: number,
    blockchainBatchId: number, // REQUIRED: Actual blockchain batch ID from registration
    transactionType: 'PURCHASE' | 'TRANSFER' = 'PURCHASE'
  ): Promise<BlockchainTransaction> {
    if (!this.signer) {
      throw new Error('Signer required for blockchain transactions');
    }

    // Validate blockchainBatchId is provided and valid
    if (blockchainBatchId === undefined || blockchainBatchId === null) {
      throw new Error('blockchainBatchId is required. This must be the actual batch ID from blockchain registration.');
    }

    if (!Number.isInteger(blockchainBatchId) || blockchainBatchId < 0) {
      throw new Error(`Invalid blockchainBatchId: ${blockchainBatchId}. Must be a non-negative integer.`);
    }

    logger.debug('🔍 DEBUG: Recording purchase transaction on blockchain:', {
      batchId,
      fromAddress,
      toAddress,
      quantity,
      price,
      blockchainBatchId,
      transactionType
    });

    try {
      // Use the actual blockchain batch ID
      const tx = await this.contract.transferBatch(
        blockchainBatchId,
        toAddress
      );

      const receipt = await tx.wait();
      logger.debug('🔍 DEBUG: Purchase transaction receipt:', receipt);
      
      // Get block details for verification
      const block = await this.provider.getBlock(receipt.blockNumber);
      logger.debug('🔍 DEBUG: Block details for verification:', {
        blockNumber: receipt.blockNumber,
        blockHash: block?.hash,
        timestamp: block?.timestamp,
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: receipt.gasPrice?.toString(),
        transactionHash: receipt.hash
      });
      
      // Log verification info for Sepolia Explorer
      logger.debug('🔍 VERIFICATION INFO - Sepolia Explorer:');
      logger.debug(`Transaction Hash: ${receipt.hash}`);
      logger.debug(`Block Number: ${receipt.blockNumber}`);
      logger.debug(`Block Hash: ${block?.hash}`);
      logger.debug(`Explorer URL: https://sepolia.etherscan.io/tx/${receipt.hash}`);

      return {
        batchId,
        from: fromAddress,
        to: toAddress,
        transactionType,
        quantity,
        price,
        timestamp: new Date().toISOString(),
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      logger.error('Error recording purchase transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction history for a batch from blockchain
   */
  async getBatchTransactionHistory(batchId: string): Promise<BlockchainTransaction[]> {
    logger.debug('🔍 DEBUG: Fetching transaction history for batch:', batchId);

    try {
      // Get harvest events
      const harvestFilter = this.contract.filters.BatchRegistered(batchId);
      const harvestEvents = await this.contract.queryFilter(harvestFilter);

      // Get purchase/transfer events
      const purchaseFilter = this.contract.filters.PurchaseRecorded(batchId);
      const purchaseEvents = await this.contract.queryFilter(purchaseFilter);

      const transactions: BlockchainTransaction[] = [];

      // Process harvest events
      for (const event of harvestEvents) {
        if (event.args) {
          transactions.push({
            batchId: event.args.batchId.toString(),
            from: event.args.farmer,
            to: event.args.farmer, // Farmer owns initially
            transactionType: 'HARVEST',
            quantity: Number(event.args.harvestQuantity),
            price: Number(event.args.price),
            timestamp: new Date().toISOString(),
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber,
            ipfsHash: event.args.ipfsHash
          });
        }
      }

      // Process purchase events
      for (const event of purchaseEvents) {
        if (event.args) {
          transactions.push({
            batchId: event.args.batchId.toString(),
            from: event.args.from,
            to: event.args.to,
            transactionType: 'PURCHASE',
            quantity: Number(event.args.quantity),
            price: Number(event.args.price),
            timestamp: new Date().toISOString(),
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber
          });
        }
      }

      // Sort by block number (chronological order)
      transactions.sort((a, b) => a.blockNumber - b.blockNumber);

      logger.debug('🔍 DEBUG: Found transactions:', transactions);
      return transactions;
    } catch (error) {
      logger.error('Error fetching transaction history:', error);
      return [];
    }
  }

  /**
   * Get current owner of a batch from blockchain
   */
  async getBatchCurrentOwner(batchId: string): Promise<string | null> {
    try {
      const numericBatchId = validateInteger(batchId, { min: 0 });
      const owner = await this.contract.getBatchOwner(numericBatchId);
      return owner;
    } catch (error) {
      logger.error('Error getting batch owner:', error);
      return null;
    }
  }

  /**
   * Verify transaction on blockchain
   */
  async verifyTransaction(transactionHash: string): Promise<boolean> {
    try {
      const tx = await this.provider.getTransaction(transactionHash);
      return tx !== null;
    } catch (error) {
      logger.error('Error verifying transaction:', error);
      return false;
    }
  }

  /**
   * Get transaction details from blockchain
   */
  async getTransactionDetails(transactionHash: string): Promise<any> {
    try {
      const tx = await this.provider.getTransaction(transactionHash);
      const receipt = await this.provider.getTransactionReceipt(transactionHash);
      
      return {
        transaction: tx,
        receipt: receipt
      };
    } catch (error) {
      logger.error('Error getting transaction details:', error);
      return null;
    }
  }
}

// Export singleton instance - will be initialized with MetaMask provider
export let blockchainTransactionManager: BlockchainTransactionManager;

// Initialize with MetaMask provider when available
export const initializeBlockchainManager = (provider: ethers.Provider, signer?: ethers.Signer) => {
  blockchainTransactionManager = new BlockchainTransactionManager(provider, signer);
};

// Clear the blockchain manager
export const clearBlockchainManager = () => {
  blockchainTransactionManager = null as any;
};
