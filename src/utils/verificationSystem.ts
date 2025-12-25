import { supabase } from '@/integrations/supabase/client';
import { singleStepGroupManager } from './singleStepGroupManager';

export interface CertificateInfo {
  id: string;
  name: string;
  cid: string;
  size: number;
  creationDate: string;
  fileId: string;
  type: 'harvest' | 'purchase';
  metadata?: any;
}

export interface VerificationResult {
  success: boolean;
  batchId?: string;
  groupId?: string;
  groupName?: string;
  certificates: CertificateInfo[];
  batchInfo?: {
    farmerName: string;
    cropType: string;
    variety: string;
    harvestQuantity: number;
    harvestDate: string;
    grading: string;
    certification: string;
    pricePerKg: number;
    status: string;
  };
  error?: string;
}

export class VerificationSystem {
  
  /**
   * Verify using Batch ID - fetches group ID from database and then gets certificates
   */
  public async verifyByBatchId(batchId: string): Promise<VerificationResult> {
    try {
      console.log('🔍 Verifying by Batch ID:', batchId);
      
      // Step 1: Get batch information from database
      const { data: batchData, error: batchError } = await supabase
        .from('batches')
        .select('*')
        .eq('id', batchId)
        .single();

      if (batchError || !batchData) {
        return {
          success: false,
          certificates: [],
          error: 'Batch not found in database'
        };
      }

      console.log('✅ Batch found:', batchData);

      // Step 2: Check if batch has group_id
      if (!batchData.group_id) {
        return {
          success: false,
          batchId: batchId,
          certificates: [],
          batchInfo: {
            farmerName: batchData.farmer_name || 'Unknown',
            cropType: batchData.crop_type || 'Unknown',
            variety: batchData.variety || 'Unknown',
            harvestQuantity: batchData.harvest_quantity || 0,
            harvestDate: batchData.harvest_date || '',
            grading: batchData.grading || 'Unknown',
            certification: batchData.certification || 'Unknown',
            pricePerKg: batchData.price_per_kg || 0,
            status: batchData.status || 'Unknown'
          },
          error: 'Batch does not have a group ID - no certificates available'
        };
      }

      // Step 3: Get group information and certificates
      const groupResult = await this.verifyByGroupId(batchData.group_id);
      
      if (groupResult.success) {
        return {
          ...groupResult,
          batchId: batchId,
          batchInfo: {
            farmerName: batchData.farmer_name || 'Unknown',
            cropType: batchData.crop_type || 'Unknown',
            variety: batchData.variety || 'Unknown',
            harvestQuantity: batchData.harvest_quantity || 0,
            harvestDate: batchData.harvest_date || '',
            grading: batchData.grading || 'Unknown',
            certification: batchData.certification || 'Unknown',
            pricePerKg: batchData.price_per_kg || 0,
            status: batchData.status || 'Unknown'
          }
        };
      }

      return groupResult;

    } catch (error) {
      console.error('Error verifying by batch ID:', error);
      return {
        success: false,
        certificates: [],
        error: `Verification failed: ${error.message}`
      };
    }
  }

  /**
   * Verify using Group ID - directly fetches certificates from Pinata
   */
  public async verifyByGroupId(groupId: string): Promise<VerificationResult> {
    try {
      console.log('🔍 Verifying by Group ID:', groupId);
      
      // Step 1: Get group information from Pinata
      const groupInfo = await singleStepGroupManager.getGroupInfo(groupId);
      
      if (!groupInfo) {
        return {
          success: false,
          certificates: [],
          error: 'Group not found in Pinata'
        };
      }

      console.log('✅ Group found:', groupInfo);

      // Step 2: Get certificates from the group
      const certificates = await this.getGroupCertificates(groupId);
      
      return {
        success: true,
        groupId: groupId,
        groupName: groupInfo.name,
        certificates: certificates
      };

    } catch (error) {
      console.error('Error verifying by group ID:', error);
      return {
        success: false,
        certificates: [],
        error: `Group verification failed: ${error.message}`
      };
    }
  }

  /**
   * Get certificates for a group from our database
   * We'll track file references when they're uploaded to groups
   */
  public async getGroupCertificates(groupId: string): Promise<CertificateInfo[]> {
    try {
      console.log('🔍 Fetching certificates for group from database:', groupId);
      
      // Query our database for files associated with this group
      const { data: files, error } = await supabase
        .from('group_files')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('No group_files table found or error querying:', error);
        return [];
      }

      if (!files || files.length === 0) {
        console.log('No files found for group in database');
        return [];
      }

      // Convert database records to CertificateInfo format
      const certificates: CertificateInfo[] = files.map((file: any) => ({
        id: file.id,
        name: file.file_name,
        cid: file.ipfs_hash,
        size: file.file_size || 0,
        creationDate: file.created_at,
        fileId: file.pinata_file_id || file.id,
        type: file.transaction_type === 'HARVEST' ? 'harvest' : 'purchase',
        metadata: file.metadata ? JSON.parse(file.metadata) : null
      }));

      console.log(`✅ Found ${certificates.length} certificates for group ${groupId}`);
      return certificates;

    } catch (error) {
      console.error('Error fetching group certificates:', error);
      return [];
    }
  }

  /**
   * Download a certificate by its CID
   */
  public getCertificateUrl(cid: string): string {
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
  }

  /**
   * Download a certificate file
   */
  public async downloadCertificate(cid: string, fileName: string): Promise<void> {
    try {
      const url = this.getCertificateUrl(cid);
      const response = await fetch(url);
      const blob = await response.blob();
      
      // Create download link
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
      
    } catch (error) {
      console.error('Error downloading certificate:', error);
      throw new Error(`Failed to download certificate: ${error.message}`);
    }
  }
}

// Export singleton instance
export const verificationSystem = new VerificationSystem();
