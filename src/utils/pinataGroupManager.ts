import { IPFSService } from './ipfs';
import { PINATA_CONFIG } from '@/contracts/config';

/**
 * Pinata Group Manager
 * Manages PDF certificates using Pinata's grouping feature
 */
export class PinataGroupManager {
  private static instance: PinataGroupManager;
  private ipfsService: IPFSService;

  private constructor() {
    this.ipfsService = IPFSService.getInstance();
  }

  public static getInstance(): PinataGroupManager {
    if (!PinataGroupManager.instance) {
      PinataGroupManager.instance = new PinataGroupManager();
    }
    return PinataGroupManager.instance;
  }

  /**
   * Create a new group for a batch
   */
  public async createBatchGroup(batchId: string, farmerName: string): Promise<string> {
    try {
      const groupName = `batch-${batchId}-${farmerName}`;
      const groupDescription = `Supply chain certificates for batch ${batchId} by ${farmerName}`;
      
      // Create group in Pinata
      const groupResponse = await this.createPinataGroup(groupName, groupDescription);
      
      console.log(`Created Pinata group for batch ${batchId}: ${groupResponse.groupId}`);
      return groupResponse.groupId;
    } catch (error) {
      console.error('Error creating batch group:', error);
      throw new Error('Failed to create batch group');
    }
  }

  /**
   * Upload certificate to existing group
   */
  public async uploadCertificateToGroup(
    groupId: string,
    pdfBlob: Blob,
    transactionType: 'HARVEST' | 'PURCHASE' | 'TRANSFER',
    transactionDetails: {
      from: string;
      to: string;
      quantity: number;
      price: number;
      timestamp: string;
    }
  ): Promise<string> {
    try {
      const fileName = `${transactionType.toLowerCase()}_${Date.now()}.pdf`;
      const metadata = {
        name: fileName,
        keyvalues: {
          groupId: groupId,
          transactionType: transactionType,
          from: transactionDetails.from,
          to: transactionDetails.to,
          quantity: transactionDetails.quantity.toString(),
          price: transactionDetails.price.toString(),
          timestamp: transactionDetails.timestamp
        }
      };

      // Upload to IPFS
      const uploadResponse = await this.ipfsService.uploadFile(pdfBlob, fileName, metadata);
      
      // Add to group
      await this.addToPinataGroup(groupId, uploadResponse.IpfsHash);
      
      console.log(`Uploaded ${transactionType} certificate to group ${groupId}: ${uploadResponse.IpfsHash}`);
      return uploadResponse.IpfsHash;
    } catch (error) {
      console.error('Error uploading certificate to group:', error);
      throw new Error('Failed to upload certificate to group');
    }
  }

  /**
   * Get all certificates in a group
   */
  public async getGroupCertificates(groupId: string): Promise<any[]> {
    try {
      const response = await fetch(`https://api.pinata.cloud/data/pinList?metadata[keyvalues][groupId]={"value":"${groupId}","op":"eq"}`, {
        method: 'GET',
        headers: {
          'pinata_api_key': PINATA_CONFIG.apiKey,
          'pinata_secret_api_key': PINATA_CONFIG.apiSecret
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch group certificates');
      }

      const data = await response.json();
      return data.rows || [];
    } catch (error) {
      console.error('Error getting group certificates:', error);
      return [];
    }
  }

  /**
   * Get group information
   */
  public async getGroupInfo(groupId: string): Promise<any> {
    try {
      const response = await fetch(`https://api.pinata.cloud/data/groups/${groupId}`, {
        method: 'GET',
        headers: {
          'pinata_api_key': PINATA_CONFIG.apiKey,
          'pinata_secret_api_key': PINATA_CONFIG.apiSecret
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch group info');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting group info:', error);
      return null;
    }
  }

  /**
   * Create a group in Pinata
   */
  private async createPinataGroup(name: string, description: string): Promise<{ groupId: string }> {
    const response = await fetch('https://api.pinata.cloud/data/groups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': import.meta.env.VITE_PINATA_API_KEY || '',
        'pinata_secret_api_key': import.meta.env.VITE_PINATA_SECRET_KEY || ''
      },
      body: JSON.stringify({
        name: name,
        description: description
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create Pinata group');
    }

    return await response.json();
  }

  /**
   * Add a file to a Pinata group
   */
  private async addToPinataGroup(groupId: string, ipfsHash: string): Promise<void> {
    const response = await fetch(`https://api.pinata.cloud/data/groups/${groupId}/pins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': import.meta.env.VITE_PINATA_API_KEY || '',
        'pinata_secret_api_key': import.meta.env.VITE_PINATA_SECRET_KEY || ''
      },
      body: JSON.stringify({
        ipfsHash: ipfsHash
      })
    });

    if (!response.ok) {
      throw new Error('Failed to add file to Pinata group');
    }
  }

  /**
   * Generate certificate URL for viewing
   */
  public getCertificateUrl(ipfsHash: string): string {
    return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
  }

  /**
   * Generate group verification URL
   */
  public getGroupVerificationUrl(groupId: string): string {
    return `https://gateway.pinata.cloud/ipfs/?group=${groupId}`;
  }
}

// Export singleton instance
export const pinataGroupManager = PinataGroupManager.getInstance();
