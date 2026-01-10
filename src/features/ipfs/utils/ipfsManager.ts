/**
 * Production-ready IPFS Manager
 * Consolidated manager for all IPFS operations with Pinata
 * Replaces all legacy IPFS utility files
 */

import { PINATA_CONFIG } from '@/contracts/config';
import { logger } from '@/lib/logger';
import { sanitizeString, validateInteger, safeJsonParse, sanitizeError } from '@/lib/security';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type GroupFileRow = Tables<'group_files'>;
type GroupFileMetadata = {
  name?: string;
  keyvalues?: Record<string, string>;
};

interface IPFSMetadata {
  name?: string;
  keyvalues?: Record<string, string>;
}

interface IPFSResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

interface GroupInfo {
  id: string;
  name: string;
  files?: Array<{ cid?: string; ipfsHash?: string; IpfsHash?: string; hash?: string }>;
}

interface CertificateMetadata {
  batchId: string;
  transactionType: 'HARVEST' | 'PURCHASE' | 'RETAIL' | 'TRANSFER';
  from: string;
  to: string;
  quantity: number;
  price: number;
  timestamp: string;
  farmerName?: string;
  buyerName?: string;
  sellerName?: string;
  cropType?: string;
  variety?: string;
}

interface BatchData {
  batchId: string;
  farmerName: string;
  cropType: string;
  variety: string;
  harvestQuantity: number;
  harvestDate: string;
  grading: string;
  certification: string;
  pricePerKg: number;
  cropAnalysis?: unknown;
}

interface PurchaseData {
  batchId: string;
  from: string;
  to: string;
  quantity: number;
  pricePerKg: number;
  timestamp: string;
  sellerName?: string;
  buyerName?: string;
}

/**
 * Production IPFS Manager
 * Handles all IPFS operations with proper error handling, logging, and type safety
 */
export class IPFSManager {
  private static instance: IPFSManager;
  private readonly maxRetries = 3;
  private readonly retryDelay = 2000;
  private readonly requestTimeout = 60000;

  private constructor() {
    this.validateConfiguration();
  }

  public static getInstance(): IPFSManager {
    if (!IPFSManager.instance) {
      IPFSManager.instance = new IPFSManager();
    }
    return IPFSManager.instance;
  }

  /**
   * Validate Pinata configuration
   */
  private validateConfiguration(): void {
    if (!PINATA_CONFIG.jwt) {
      throw new Error('PINATA_JWT environment variable is required');
    }

    // Validate JWT format (basic check)
    const jwtParts = PINATA_CONFIG.jwt.split('.');
    if (jwtParts.length !== 3) {
      throw new Error('Invalid PINATA_JWT format');
    }

    // Check expiration (basic check)
    try {
      const payload = safeJsonParse<{ exp?: number }>(atob(jwtParts[1]), {});
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        logger.warn('PINATA_JWT token may be expired. Please update your configuration.');
      }
    } catch (error) {
      logger.warn('Could not validate JWT expiration');
    }
  }

  /**
   * Generate a unique group name
   */
  private generateGroupName(farmerName: string, cropType: string, variety: string): string {
    const safeFarmerName = sanitizeString(farmerName || 'unknown_farmer', 50);
    const safeCropType = sanitizeString(cropType || 'unknown_crop', 50);
    const safeVariety = sanitizeString(variety || 'unknown_variety', 50);

    // Clean farmer name - handle Ethereum addresses
    let cleanFarmerName = safeFarmerName;
    if (safeFarmerName.startsWith('0x')) {
      cleanFarmerName = `addr_${safeFarmerName.slice(-8).toLowerCase()}`;
    } else {
      cleanFarmerName = safeFarmerName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    }

    const cleanCropType = safeCropType.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const cleanVariety = safeVariety.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const timestamp = Date.now();
    
    const groupName = `${cleanFarmerName}_${cleanCropType}_${cleanVariety}_${timestamp}`;
    
    // Ensure group name is not too long (Pinata limit is 100 characters)
    if (groupName.length > 80) {
      return groupName.substring(0, 80);
    }
    
    return groupName;
  }

  /**
   * Create a Pinata group
   */
  public async createGroup(groupName: string): Promise<string> {
    const sanitizedName = sanitizeString(groupName, 100);
    
    if (!sanitizedName || sanitizedName.trim().length === 0) {
      throw new Error('Group name cannot be empty');
    }

    try {
      logger.debug('Creating Pinata group', { groupName: sanitizedName });

      const response = await fetch('https://api.pinata.cloud/v3/groups/public', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${PINATA_CONFIG.jwt}`,
        },
        body: JSON.stringify({ name: sanitizedName }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Failed to create group', { status: response.status, error: errorText });
        throw new Error(`Failed to create group: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.data?.id) {
        logger.debug('Group created successfully', { groupId: data.data.id });
        return data.data.id;
      }
      
      throw new Error('No group ID in response');
    } catch (error) {
      logger.error('Error creating group', error);
      throw new Error('Failed to create Pinata group');
    }
  }

  /**
   * Upload file to IPFS group (single-step operation)
   */
  public async uploadFileToGroup(
    groupId: string,
    fileBlob: Blob,
    fileName: string,
    metadata?: IPFSMetadata
  ): Promise<string> {
    // Validate inputs
    const sanitizedGroupId = sanitizeString(groupId, 100);
    const sanitizedFileName = sanitizeString(fileName, 255);

    if (!sanitizedGroupId) {
      throw new Error('Invalid group ID');
    }

    if (!fileBlob || fileBlob.size === 0) {
      throw new Error('Invalid file: file is empty');
    }

    // Validate file size (max 100MB)
    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    if (fileBlob.size > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    logger.debug('Uploading file to group', {
      groupId: sanitizedGroupId,
      fileName: sanitizedFileName,
      fileSize: fileBlob.size,
    });

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

        const formData = new FormData();
        formData.append('file', fileBlob, sanitizedFileName);
        formData.append('network', 'public');
        formData.append('group_id', sanitizedGroupId);

        if (metadata) {
          const pinataMetadata = {
            name: sanitizedFileName,
            keyvalues: {
              ...metadata.keyvalues,
              groupId: sanitizedGroupId,
            },
          };
          formData.append('metadata', JSON.stringify(pinataMetadata));
        }

        const response = await fetch('https://uploads.pinata.cloud/v3/files', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${PINATA_CONFIG.jwt}`,
          },
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Don't retry on 4xx errors (client errors)
          if (response.status >= 400 && response.status < 500) {
            const errorText = await response.text();
            logger.error('Client error uploading file', { status: response.status });
            throw new Error('Failed to upload file: Invalid request');
          }

          // Retry on 5xx errors (server errors)
          if (response.status >= 500 && attempt < this.maxRetries) {
            const waitTime = this.retryDelay * attempt;
            logger.warn(`Server error, retrying in ${waitTime}ms`, { attempt, status: response.status });
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }

          throw new Error(`Upload failed: ${response.status}`);
        }

        const responseText = await response.text();
        const data = safeJsonParse<{ data?: { IpfsHash?: string; ipfsHash?: string } }>(responseText, {});

        const ipfsHash = data.data?.IpfsHash || data.data?.ipfsHash;
        
        if (!ipfsHash) {
          throw new Error('No IPFS hash in response');
        }

        // Store file reference in database (non-blocking)
        this.storeFileReference(sanitizedGroupId, sanitizedFileName, ipfsHash, fileBlob.size, metadata).catch(
          error => logger.warn('Failed to store file reference', error)
        );

        logger.debug('File uploaded successfully', { ipfsHash, groupId: sanitizedGroupId });
        return ipfsHash;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < this.maxRetries && lastError.message.includes('network') || lastError.message.includes('aborted')) {
          const waitTime = this.retryDelay * attempt;
          logger.warn(`Upload failed, retrying in ${waitTime}ms`, { attempt, error: lastError.message });
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        break;
      }
    }

    logger.error('Failed to upload file after retries', { error: lastError });
    throw new Error(lastError?.message || 'Failed to upload file to IPFS');
  }

  /**
   * Upload harvest certificate to a new group
   */
  public async uploadHarvestCertificate(
    batchData: BatchData
  ): Promise<{ pdfBlob: Blob; groupId: string; ipfsHash: string }> {
    try {
      // Generate group name and create group
      const groupName = this.generateGroupName(
        batchData.farmerName,
        batchData.cropType,
        batchData.variety
      );
      
      const groupId = await this.createGroup(groupName);

      // Generate PDF
      const pdfBlob = await this.createHarvestPDF(batchData, groupId, groupName);

      // Upload to group
      const fileName = `harvest_certificate_${batchData.batchId}_${Date.now()}.pdf`;
      const metadata: IPFSMetadata = {
        keyvalues: {
          batchId: batchData.batchId,
          transactionType: 'HARVEST',
          from: 'Farm',
          to: batchData.farmerName,
          quantity: batchData.harvestQuantity.toString(),
          price: (batchData.harvestQuantity * batchData.pricePerKg).toString(),
          timestamp: new Date().toISOString(),
          cropType: batchData.cropType,
          variety: batchData.variety,
          type: 'certificate',
          groupId,
          groupName,
          farmerName: batchData.farmerName,
        },
      };

      const ipfsHash = await this.uploadFileToGroup(groupId, pdfBlob, fileName, metadata);

      logger.debug('Harvest certificate uploaded', { batchId: batchData.batchId, groupId, ipfsHash });
      
      return { pdfBlob, groupId, ipfsHash };
    } catch (error) {
      logger.error('Error uploading harvest certificate', error);
      throw new Error(sanitizeError(error));
    }
  }

  /**
   * Upload purchase certificate to existing group
   */
  public async uploadPurchaseCertificate(
    groupId: string,
    purchaseData: PurchaseData
  ): Promise<{ pdfBlob: Blob; ipfsHash: string }> {
    try {
      const sanitizedGroupId = sanitizeString(groupId, 100);
      
      if (!sanitizedGroupId) {
        throw new Error('Invalid group ID');
      }

      // Generate PDF
      const pdfBlob = await this.createPurchasePDF(purchaseData, sanitizedGroupId);

      // Upload to group
      const fileName = `purchase_certificate_${purchaseData.batchId}_${Date.now()}.pdf`;
      const metadata: IPFSMetadata = {
        keyvalues: {
          batchId: purchaseData.batchId,
          transactionType: 'PURCHASE',
          from: purchaseData.from,
          to: purchaseData.to,
          quantity: purchaseData.quantity.toString(),
          price: (purchaseData.quantity * purchaseData.pricePerKg).toString(),
          timestamp: purchaseData.timestamp,
          type: 'certificate',
          groupId: sanitizedGroupId,
          farmerName: purchaseData.sellerName || purchaseData.from,
          buyerName: purchaseData.buyerName || purchaseData.to,
          sellerName: purchaseData.sellerName || purchaseData.from,
          fromId: purchaseData.from,
          toId: purchaseData.to,
        },
      };

      const ipfsHash = await this.uploadFileToGroup(sanitizedGroupId, pdfBlob, fileName, metadata);

      logger.debug('Purchase certificate uploaded', { batchId: purchaseData.batchId, groupId: sanitizedGroupId, ipfsHash });
      
      return { pdfBlob, ipfsHash };
    } catch (error) {
      logger.error('Error uploading purchase certificate', error);
      throw new Error(sanitizeError(error));
    }
  }

  /**
   * Get group certificates from database
   */
  public async getGroupCertificates(groupId: string): Promise<GroupFileRow[]> {
    try {
      const sanitizedGroupId = sanitizeString(groupId, 100);
      
      if (!sanitizedGroupId) {
        throw new Error('Invalid group ID');
      }

      const { data, error } = await supabase
        .from('group_files')
        .select('*')
        .eq('group_id', sanitizedGroupId)
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Error fetching group certificates', error);
        return [];
      }

      logger.debug('Group certificates fetched', { groupId: sanitizedGroupId, count: data?.length || 0 });
      
      return data || [];
    } catch (error) {
      logger.error('Error getting group certificates', error);
      return [];
    }
  }

  /**
   * Get group information from Pinata
   */
  public async getGroupInfo(groupId: string): Promise<GroupInfo | null> {
    try {
      const sanitizedGroupId = sanitizeString(groupId, 100);
      
      if (!sanitizedGroupId) {
        return null;
      }

      const response = await fetch(`https://api.pinata.cloud/v3/groups/public/${sanitizedGroupId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${PINATA_CONFIG.jwt}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        logger.error('Error fetching group info', { status: response.status });
        return null;
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      logger.error('Error getting group info', error);
      return null;
    }
  }

  /**
   * Get certificate URL from IPFS hash
   */
  public getCertificateUrl(ipfsHash: string): string {
    const cleanHash = sanitizeString(ipfsHash, 100).replace(/^.*\/ipfs\//, '').replace(/[^a-zA-Z0-9]/g, '');
    
    if (cleanHash.length < 10) {
      throw new Error('Invalid IPFS hash format');
    }
    
    return `${PINATA_CONFIG.gatewayUrl}${cleanHash}`;
  }

  /**
   * Create harvest PDF certificate
   */
  private async createHarvestPDF(
    batchData: BatchData,
    groupId: string,
    groupName: string
  ): Promise<Blob> {
    const { jsPDF } = await import('jspdf');
    
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;
    
    // Header
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('AGRITRACE HARVEST CERTIFICATE', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('- Department of Agriculture & Farmers Empowerment', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;
    
    // Certificate details
    pdf.setFontSize(10);
    pdf.text(`Certificate No: ATC-${batchData.batchId}-${new Date().getFullYear()}`, 20, yPosition);
    pdf.text(`Date of Issue: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - 20, yPosition, { align: 'right' });
    yPosition += 15;
    
    // Product information
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('This is to certify that:', 20, yPosition);
    yPosition += 15;
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    
    const productInfo = [
      { label: 'Product Name', value: `${batchData.cropType} - ${batchData.variety}` },
      { label: 'Batch Identification Number', value: `ATC-${batchData.batchId}-${new Date().getFullYear()}` },
      { label: 'Harvest Quantity', value: `${batchData.harvestQuantity} kg` },
      { label: 'Harvest Date', value: new Date(batchData.harvestDate).toLocaleDateString('en-IN') },
      { label: 'Quality Grade', value: batchData.grading },
      { label: 'Certification Level', value: batchData.certification },
      { label: 'Price per Kg', value: `₹${batchData.pricePerKg}` },
      { label: 'Total Value', value: `₹${batchData.harvestQuantity * batchData.pricePerKg}` },
    ];
    
    productInfo.forEach((info) => {
      if (yPosition > pageHeight - 30) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${info.label}:`, 20, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(info.value, 80, yPosition);
      yPosition += 8;
    });
    
    // Footer
    const finalY = pageHeight - 20;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.text(`Group ID: ${groupId}`, 20, finalY);
    pdf.text(`Generated: ${new Date().toISOString()}`, pageWidth - 20, finalY, { align: 'right' });
    
    return pdf.output('blob');
  }

  /**
   * Create purchase PDF certificate
   */
  private async createPurchasePDF(
    purchaseData: PurchaseData,
    groupId: string
  ): Promise<Blob> {
    const { jsPDF } = await import('jspdf');
    
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPosition = 20;
    
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('AGRITRACE PURCHASE CERTIFICATE', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    
    const purchaseInfo = [
      { label: 'Batch ID', value: purchaseData.batchId },
      { label: 'From', value: purchaseData.sellerName || purchaseData.from },
      { label: 'To', value: purchaseData.buyerName || purchaseData.to },
      { label: 'Quantity', value: `${purchaseData.quantity} kg` },
      { label: 'Price per Kg', value: `₹${purchaseData.pricePerKg}` },
      { label: 'Total Price', value: `₹${purchaseData.quantity * purchaseData.pricePerKg}` },
      { label: 'Transaction Date', value: new Date(purchaseData.timestamp).toLocaleDateString('en-IN') },
      { label: 'Group ID', value: groupId },
    ];
    
    purchaseInfo.forEach((info) => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${info.label}:`, 20, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(info.value, 80, yPosition);
      yPosition += 10;
    });
    
    return pdf.output('blob');
  }

  /**
   * Store file reference in database (non-blocking)
   */
  private async storeFileReference(
    groupId: string,
    fileName: string,
    ipfsHash: string,
    fileSize: number,
    metadata?: IPFSMetadata
  ): Promise<void> {
    try {
      const fileData = {
        group_id: groupId,
        file_name: fileName,
        ipfs_hash: ipfsHash,
        file_size: fileSize,
        transaction_type: metadata?.keyvalues?.transactionType || 'UNKNOWN',
        batch_id: metadata?.keyvalues?.batchId || null,
        metadata: JSON.stringify(metadata || {}),
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('group_files')
        .insert(fileData);

      if (error) {
        logger.warn('Failed to store file reference', { error: error.message });
      } else {
        logger.debug('File reference stored successfully', { ipfsHash });
      }
    } catch (error) {
      logger.warn('Error storing file reference', error);
    }
  }
}

// Export singleton instance
export const ipfsManager = IPFSManager.getInstance();

