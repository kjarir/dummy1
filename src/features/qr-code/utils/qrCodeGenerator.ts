/**
 * QR Code Generator for Purchase Flow
 * Generates QR codes for each stage of the supply chain
 */

import { 
  generateFarmerBatchQR,
  generateDistributorPurchaseQR,
  generateRetailerPurchaseQR,
  generateCertificateViewQR,
  generateSupplyChainQR
} from './qrCodeUtils';

export interface PurchaseQRData {
  batchId: string;
  transactionId: string;
  from: string;
  to: string;
  quantity: number;
  price: number;
  ipfsHash?: string;
  stage: 'farmer' | 'distributor' | 'retailer';
}

/**
 * Generate QR code for farmer batch registration
 */
export async function generateFarmerRegistrationQR(batchData: {
  batchId: string;
  cropType: string;
  variety: string;
  harvestDate: string;
  farmerId: string;
  ipfsHash?: string;
}): Promise<string> {
  return await generateFarmerBatchQR(batchData);
}

/**
 * Generate QR code for distributor purchase
 */
export async function generateDistributorPurchaseQRCode(purchaseData: PurchaseQRData): Promise<string> {
  return await generateDistributorPurchaseQR({
    transactionId: purchaseData.transactionId,
    batchId: purchaseData.batchId,
    from: purchaseData.from,
    to: purchaseData.to,
    quantity: purchaseData.quantity,
    price: purchaseData.price,
    ipfsHash: purchaseData.ipfsHash
  });
}

/**
 * Generate QR code for retailer purchase
 */
export async function generateRetailerPurchaseQRCode(purchaseData: PurchaseQRData): Promise<string> {
  return await generateRetailerPurchaseQR({
    transactionId: purchaseData.transactionId,
    batchId: purchaseData.batchId,
    from: purchaseData.from,
    to: purchaseData.to,
    quantity: purchaseData.quantity,
    price: purchaseData.price,
    ipfsHash: purchaseData.ipfsHash
  });
}

/**
 * Generate QR code for certificate viewing
 */
export async function generateCertificateQRCode(ipfsHash: string, certificateType: 'harvest' | 'purchase' | 'transfer'): Promise<string> {
  return await generateCertificateViewQR(ipfsHash, certificateType);
}

/**
 * Generate QR code for supply chain verification
 */
export async function generateSupplyChainVerificationQR(batchId: string, stage: 'farmer' | 'distributor' | 'retailer'): Promise<string> {
  return await generateSupplyChainQR(batchId, stage);
}

/**
 * Generate QR code for batch details
 */
export async function generateBatchDetailsQR(batchData: {
  batchId: string;
  cropType: string;
  variety: string;
  harvestDate: string;
  farmerId: string;
  currentOwner?: string;
  blockchainHash?: string;
  ipfsHash?: string;
}): Promise<string> {
  const qrData = {
    type: 'batch',
    id: batchData.batchId,
    batchId: batchData.batchId,
    cropType: batchData.cropType,
    variety: batchData.variety,
    harvestDate: batchData.harvestDate,
    farmerId: batchData.farmerId,
    currentOwner: batchData.currentOwner,
    blockchainHash: batchData.blockchainHash,
    ipfsHash: batchData.ipfsHash,
    verificationUrl: `${window.location.origin}/verify?batchId=${batchData.batchId}`,
    timestamp: new Date().toISOString(),
    metadata: {
      description: 'Complete batch information for supply chain tracking'
    }
  };
  
  const { generateQRCodeDataURL } = await import('./qrCodeUtils');
  return await generateQRCodeDataURL(qrData);
}

/**
 * Generate QR code for transaction receipt
 */
export async function generateTransactionReceiptQR(transactionData: {
  transactionId: string;
  batchId: string;
  from: string;
  to: string;
  quantity: number;
  price: number;
  timestamp: string;
  ipfsHash?: string;
  blockchainHash?: string;
}): Promise<string> {
  const qrData = {
    type: 'transaction',
    id: transactionData.transactionId,
    batchId: transactionData.batchId,
    from: transactionData.from,
    to: transactionData.to,
    quantity: transactionData.quantity,
    price: transactionData.price,
    timestamp: transactionData.timestamp,
    ipfsHash: transactionData.ipfsHash,
    blockchainHash: transactionData.blockchainHash,
    verificationUrl: `${window.location.origin}/verify?transactionId=${transactionData.transactionId}`,
    metadata: {
      description: 'Transaction receipt for supply chain verification'
    }
  };
  
  const { generateQRCodeDataURL } = await import('./qrCodeUtils');
  return await generateQRCodeDataURL(qrData);
}

/**
 * Generate QR code for inventory item
 */
export async function generateInventoryQR(inventoryData: {
  inventoryId: string;
  batchId: string;
  ownerId: string;
  ownerType: 'farmer' | 'distributor' | 'retailer';
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
}): Promise<string> {
  const qrData = {
    type: 'inventory',
    id: inventoryData.inventoryId,
    batchId: inventoryData.batchId,
    ownerId: inventoryData.ownerId,
    ownerType: inventoryData.ownerType,
    quantity: inventoryData.quantity,
    purchasePrice: inventoryData.purchasePrice,
    purchaseDate: inventoryData.purchaseDate,
    verificationUrl: `${window.location.origin}/verify?inventoryId=${inventoryData.inventoryId}`,
    timestamp: new Date().toISOString(),
    metadata: {
      description: 'Inventory item for supply chain tracking'
    }
  };
  
  const { generateQRCodeDataURL } = await import('./qrCodeUtils');
  return await generateQRCodeDataURL(qrData);
}
