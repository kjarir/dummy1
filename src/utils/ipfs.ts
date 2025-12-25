import axios from 'axios';
import { PINATA_CONFIG } from '@/contracts/config';

/**
 * IPFS Service using Pinata
 */
export interface PinataMetadata {
  name?: string;
  keyvalues?: Record<string, string>;
}

export interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

export class IPFSService {
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    this.apiKey = PINATA_CONFIG.apiKey;
    this.apiSecret = PINATA_CONFIG.apiSecret;
  }

  /**
   * Upload file to IPFS via Pinata
   */
  public async uploadFile(
    file: File | Blob,
    fileName: string,
    metadata?: PinataMetadata
  ): Promise<PinataResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file, fileName);

      if (metadata) {
        formData.append('pinataMetadata', JSON.stringify(metadata));
      }

      const pinataOptions = {
        cidVersion: 1,
      };
      formData.append('pinataOptions', JSON.stringify(pinataOptions));

      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          headers: {
            'pinata_api_key': this.apiKey,
            'pinata_secret_api_key': this.apiSecret,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error uploading file to IPFS:', error);
      throw new Error('Failed to upload file to IPFS');
    }
  }

  /**
   * Upload certificate to IPFS
   */
  public async uploadCertificate(
    pdfBlob: Blob,
    batchId: string,
    metadata?: any
  ): Promise<string> {
    try {
      const fileName = `certificate_${batchId}_${Date.now()}.pdf`;
      const pinataMetadata: PinataMetadata = {
        name: fileName,
        keyvalues: {
          batchId: batchId,
          type: 'certificate',
          timestamp: new Date().toISOString(),
          ...metadata
        }
      };

      const response = await this.uploadFile(pdfBlob, fileName, pinataMetadata);
      return response.IpfsHash;
    } catch (error) {
      console.error('Error uploading certificate to IPFS:', error);
      throw new Error('Failed to upload certificate to IPFS');
    }
  }

  /**
   * Unpin file from IPFS
   */
  public async unpinFile(ipfsHash: string): Promise<void> {
    try {
      await axios.delete(`https://api.pinata.cloud/pinning/unpin/${ipfsHash}`, {
        headers: {
          'pinata_api_key': this.apiKey,
          'pinata_secret_api_key': this.apiSecret,
        },
      });
      console.log(`Unpinned file: ${ipfsHash}`);
    } catch (error) {
      console.error('Error unpinning file from IPFS:', error);
      throw new Error('Failed to unpin file from IPFS');
    }
  }

  /**
   * Update pinned file (unpin old, pin new)
   */
  public async updatePinnedFile(
    oldIpfsHash: string,
    file: File | Blob,
    fileName: string,
    metadata?: PinataMetadata
  ): Promise<PinataResponse> {
    try {
      // Unpin old file
      if (oldIpfsHash) {
        await this.unpinFile(oldIpfsHash);
      }

      // Upload new file
      return await this.uploadFile(file, fileName, metadata);
    } catch (error) {
      console.error('Error updating pinned file:', error);
      throw new Error('Failed to update pinned file');
    }
  }

  /**
   * Get file info from IPFS
   */
  public async getFileInfo(ipfsHash: string): Promise<any> {
    try {
      const response = await axios.get(
        `https://api.pinata.cloud/data/pinList?hashContains=${ipfsHash}`,
        {
          headers: {
            'pinata_api_key': this.apiKey,
            'pinata_secret_api_key': this.apiSecret,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error getting file info from IPFS:', error);
      throw new Error('Failed to get file info from IPFS');
    }
  }
}

// Export singleton instance
export const ipfsService = new IPFSService();

/**
 * Upload batch metadata to IPFS
 */
export async function uploadBatchMetadataToIPFS(batchData: any, batchId: string): Promise<string> {
  try {
    const metadata = {
      batchId: batchId,
      farmer: batchData.farmer,
      crop: batchData.crop,
      variety: batchData.variety,
      harvestQuantity: batchData.harvestQuantity,
      harvestDate: batchData.harvestDate,
      grading: batchData.grading,
      certification: batchData.certification,
      price: batchData.price,
      timestamp: new Date().toISOString()
    };

    const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
      type: 'application/json'
    });

    return await ipfsService.uploadFile(
      metadataBlob,
      `batch_metadata_${batchId}.json`,
      {
        name: `batch_metadata_${batchId}`,
        keyvalues: {
          batchId: batchId,
          type: 'metadata',
          timestamp: new Date().toISOString()
        }
      }
    ).then(response => response.IpfsHash);
  } catch (error) {
    console.error('Error uploading batch metadata to IPFS:', error);
    throw new Error('Failed to upload batch metadata to IPFS');
  }
}

/**
 * Get IPFS file URL with validation
 */
export function getIPFSFileUrl(ipfsHash: string): string {
  // Validate and clean the IPFS hash
  if (!ipfsHash || ipfsHash.length < 10) {
    throw new Error('Invalid IPFS hash format');
  }
  
  // Clean the hash (remove any URL parts)
  const cleanHash = ipfsHash.replace(/^.*\/ipfs\//, '').replace(/[^a-zA-Z0-9]/g, '');
  
  if (cleanHash.length < 10) {
    throw new Error('Invalid IPFS hash format - hash appears to be malformed');
  }
  
  return `https://gateway.pinata.cloud/ipfs/${cleanHash}`;
}
