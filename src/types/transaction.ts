/**
 * Immutable Transaction System Types
 * Each transaction is an immutable record that builds the supply chain history
 */

export interface SupplyChainTransaction {
  transactionId: string;
  type: 'HARVEST' | 'PURCHASE' | 'TRANSFER' | 'PROCESSING' | 'RETAIL';
  from: string;
  to: string;
  quantity: number;
  price: number;
  timestamp: string;
  previousTransactionHash?: string;
  batchId: string;
  productDetails: {
    crop: string;
    variety: string;
    harvestDate: string;
    grading?: string;
    certification?: string;
  };
  metadata?: {
    location?: string;
    notes?: string;
    qualityScore?: number;
    storageConditions?: string;
    processingDetails?: string;
  };
  ipfsHash: string;
  blockchainHash?: string;
}

export interface TransactionChain {
  batchId: string;
  transactions: SupplyChainTransaction[];
  currentOwners: {
    [owner: string]: {
      quantity: number;
      lastTransaction: string;
    };
  };
  totalQuantity: number;
  availableQuantity: number;
}

export interface OwnershipRecord {
  owner: string;
  quantity: number;
  transactionId: string;
  timestamp: string;
  type: string;
}

export interface CertificateData {
  batchId: string;
  productDetails: {
    crop: string;
    variety: string;
    harvestDate: string;
    grading: string;
    certification: string;
  };
  ownershipHistory: OwnershipRecord[];
  currentOwners: {
    [owner: string]: number;
  };
  transactionChain: SupplyChainTransaction[];
  totalQuantity: number;
  availableQuantity: number;
  createdAt: string;
  lastUpdated: string;
}
