/**
 * Comprehensive QR Code Utilities for AgriTrace
 * Handles QR code generation for the entire farmer-distributor-retailer flow
 */

import QRCode from 'qrcode';

export interface QRCodeData {
  type: 'batch' | 'certificate' | 'transaction' | 'verification';
  id: string;
  batchId?: string;
  ipfsHash?: string;
  blockchainHash?: string;
  timestamp: string;
  metadata?: any;
  verificationUrl?: string;
  certificateUrl?: string;
}

export interface BatchQRData {
  batchId: string;
  cropType: string;
  variety: string;
  harvestDate: string;
  farmerId: string;
  blockchainHash?: string;
  ipfsHash?: string;
  verificationUrl?: string;
}

export interface CertificateQRData {
  certificateId: string;
  batchId: string;
  ipfsHash: string;
  certificateUrl: string;
  timestamp: string;
}

export interface TransactionQRData {
  transactionId: string;
  batchId: string;
  from: string;
  to: string;
  quantity: number;
  price: number;
  timestamp: string;
  blockchainHash?: string;
}

/**
 * Generate QR code data URL for display
 */
export async function generateQRCodeDataURL(data: string | object, size: number = 200): Promise<string> {
  try {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    const qrCodeDataURL = await QRCode.toDataURL(dataString, {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate batch verification QR code
 */
export async function generateBatchVerificationQR(batchId: string): Promise<string> {
  const verificationUrl = `${window.location.origin}/verify?batchId=${batchId}`;
  return await generateQRCodeDataURL(verificationUrl);
}

/**
 * Generate certificate QR code
 */
export async function generateCertificateQR(ipfsHash: string): Promise<string> {
  const certificateUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
  return await generateQRCodeDataURL(certificateUrl);
}

/**
 * Generate comprehensive batch data QR code
 */
export async function generateBatchDataQR(batchData: BatchQRData): Promise<string> {
  const qrData = {
    type: 'batch',
    batchId: batchData.batchId,
    cropType: batchData.cropType,
    variety: batchData.variety,
    harvestDate: batchData.harvestDate,
    farmerId: batchData.farmerId,
    blockchainHash: batchData.blockchainHash,
    ipfsHash: batchData.ipfsHash,
    verificationUrl: batchData.verificationUrl || `${window.location.origin}/verify?batchId=${batchData.batchId}`,
    timestamp: new Date().toISOString()
  };
  
  return await generateQRCodeDataURL(qrData);
}

/**
 * Generate transaction QR code
 */
export async function generateTransactionQR(transactionData: TransactionQRData): Promise<string> {
  const qrData = {
    type: 'transaction',
    ...transactionData,
    timestamp: new Date().toISOString()
  };
  
  return await generateQRCodeDataURL(qrData);
}

/**
 * Generate certificate QR code with metadata
 */
export async function generateCertificateQRWithMetadata(certificateData: CertificateQRData): Promise<string> {
  const qrData = {
    type: 'certificate',
    ...certificateData,
    timestamp: new Date().toISOString()
  };
  
  return await generateQRCodeDataURL(qrData);
}

/**
 * Download QR code as image
 */
export function downloadQRCode(dataURL: string, filename: string): void {
  try {
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error downloading QR code:', error);
    throw new Error('Failed to download QR code');
  }
}

/**
 * Parse QR code data from string
 */
export function parseQRCodeData(qrString: string): QRCodeData | null {
  try {
    const data = JSON.parse(qrString);
    
    // Validate required fields
    if (!data.type || !data.id || !data.timestamp) {
      return null;
    }
    
    // Validate type
    if (!['batch', 'certificate', 'transaction', 'verification'].includes(data.type)) {
      return null;
    }
    
    return data as QRCodeData;
  } catch (error) {
    console.error('Error parsing QR code data:', error);
    return null;
  }
}

/**
 * Generate QR code for farmer batch registration
 */
export async function generateFarmerBatchQR(batchData: {
  batchId: string;
  cropType: string;
  variety: string;
  harvestDate: string;
  farmerId: string;
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
    ipfsHash: batchData.ipfsHash,
    verificationUrl: `${window.location.origin}/verify?batchId=${batchData.batchId}`,
    timestamp: new Date().toISOString(),
    metadata: {
      stage: 'farmer_registration',
      description: 'Farmer batch registration certificate'
    }
  };
  
  return await generateQRCodeDataURL(qrData);
}

/**
 * Generate QR code for distributor purchase
 */
export async function generateDistributorPurchaseQR(transactionData: {
  transactionId: string;
  batchId: string;
  from: string;
  to: string;
  quantity: number;
  price: number;
  ipfsHash?: string;
}): Promise<string> {
  const qrData = {
    type: 'transaction',
    id: transactionData.transactionId,
    batchId: transactionData.batchId,
    from: transactionData.from,
    to: transactionData.to,
    quantity: transactionData.quantity,
    price: transactionData.price,
    ipfsHash: transactionData.ipfsHash,
    verificationUrl: `${window.location.origin}/verify?transactionId=${transactionData.transactionId}`,
    timestamp: new Date().toISOString(),
    metadata: {
      stage: 'distributor_purchase',
      description: 'Distributor purchase transaction certificate'
    }
  };
  
  return await generateQRCodeDataURL(qrData);
}

/**
 * Generate QR code for retailer purchase
 */
export async function generateRetailerPurchaseQR(transactionData: {
  transactionId: string;
  batchId: string;
  from: string;
  to: string;
  quantity: number;
  price: number;
  ipfsHash?: string;
}): Promise<string> {
  const qrData = {
    type: 'transaction',
    id: transactionData.transactionId,
    batchId: transactionData.batchId,
    from: transactionData.from,
    to: transactionData.to,
    quantity: transactionData.quantity,
    price: transactionData.price,
    ipfsHash: transactionData.ipfsHash,
    verificationUrl: `${window.location.origin}/verify?transactionId=${transactionData.transactionId}`,
    timestamp: new Date().toISOString(),
    metadata: {
      stage: 'retailer_purchase',
      description: 'Retailer purchase transaction certificate'
    }
  };
  
  return await generateQRCodeDataURL(qrData);
}

/**
 * Generate QR code for supply chain verification
 */
export async function generateSupplyChainQR(batchId: string, stage: 'farmer' | 'distributor' | 'retailer'): Promise<string> {
  const qrData = {
    type: 'verification',
    id: batchId,
    batchId: batchId,
    verificationUrl: `${window.location.origin}/verify?batchId=${batchId}&stage=${stage}`,
    timestamp: new Date().toISOString(),
    metadata: {
      stage: stage,
      description: `Supply chain verification for ${stage} stage`
    }
  };
  
  return await generateQRCodeDataURL(qrData);
}

/**
 * Generate QR code for certificate viewing
 */
export async function generateCertificateViewQR(ipfsHash: string, certificateType: 'harvest' | 'purchase' | 'transfer'): Promise<string> {
  const certificateUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
  const qrData = {
    type: 'certificate',
    id: ipfsHash,
    ipfsHash: ipfsHash,
    certificateUrl: certificateUrl,
    verificationUrl: `${window.location.origin}/verify?certificate=${ipfsHash}`,
    timestamp: new Date().toISOString(),
    metadata: {
      certificateType: certificateType,
      description: `${certificateType} certificate`
    }
  };
  
  return await generateQRCodeDataURL(qrData);
}