import { supabase } from '@/integrations/supabase/client';

/**
 * Certificate Verification Utilities
 */

export interface CertificateData {
  id: string;
  batchId: string;
  farmer: string;
  crop: string;
  variety: string;
  harvestQuantity: string;
  harvestDate: string;
  grading: string;
  certification: string;
  ipfsHash: string;
  groupId?: string;
  createdAt: string;
}

export interface VerificationResult {
  isValid: boolean;
  certificate?: CertificateData;
  batchData?: {
    id: string;
    crop: string;
    variety: string;
    harvestQuantity: string;
    farmer: string;
    currentOwner: string;
    price: string;
    ipfsHash: string;
  };
  blockchainData?: any;
  ipfsData?: any;
  errors: string[];
  warnings: string[];
  error?: string;
  timestamp: string;
}

/**
 * Verify certificate by IPFS hash
 */
export async function verifyCertificateByHash(ipfsHash: string): Promise<VerificationResult> {
  try {
    console.log('Verifying certificate with IPFS hash:', ipfsHash);
    
    // Validate IPFS hash format
    if (!ipfsHash || ipfsHash.length < 10) {
      return {
        isValid: false,
        errors: ['Invalid IPFS hash format. Hash must be at least 10 characters long.'],
        warnings: [],
        timestamp: new Date().toISOString()
      };
    }

    // Clean the IPFS hash (remove any URL parts)
    const cleanHash = ipfsHash.replace(/^.*\/ipfs\//, '').replace(/[^a-zA-Z0-9]/g, '');
    
    if (cleanHash.length < 10) {
      return {
        isValid: false,
        errors: ['Invalid IPFS hash format. Hash appears to be malformed.'],
        warnings: [],
        timestamp: new Date().toISOString()
      };
    }
    
    // Try multiple IPFS gateways for better reliability
    const gateways = [
      `https://gateway.pinata.cloud/ipfs/${cleanHash}`,
      `https://ipfs.io/ipfs/${cleanHash}`,
      `https://cloudflare-ipfs.com/ipfs/${cleanHash}`
    ];
    
    let lastError = '';
    
    for (const gatewayUrl of gateways) {
      try {
        console.log(`Trying gateway: ${gatewayUrl}`);
        const response = await fetch(gatewayUrl, { 
          method: 'HEAD', // Use HEAD to check if file exists without downloading
          timeout: 10000 
        });
        
        if (response.ok) {
          console.log(`✅ IPFS hash verified successfully via ${gatewayUrl}`);
          return {
            isValid: true,
            ipfsData: { gateway: gatewayUrl, hash: cleanHash },
            errors: [],
            warnings: [],
            timestamp: new Date().toISOString()
          };
        } else {
          lastError = `Gateway ${gatewayUrl} returned ${response.status}`;
          console.warn(`Gateway failed: ${lastError}`);
        }
      } catch (gatewayError) {
        lastError = `Gateway ${gatewayUrl} error: ${gatewayError.message}`;
        console.warn(`Gateway error: ${lastError}`);
      }
    }
    
    return {
      isValid: false,
      errors: [`Failed to fetch certificate from IPFS. All gateways failed. Last error: ${lastError}`],
      warnings: [],
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error verifying certificate:', error);
    return {
      isValid: false,
      errors: [`Verification failed: ${error.message}`],
      warnings: [],
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verify certificate by batch ID
 */
export async function verifyCertificateByBatchId(batchId: string): Promise<VerificationResult> {
  try {
    console.log('Verifying certificate for batch ID:', batchId);
    
    // Fetch batch data from database
    const { data: batch, error } = await supabase
      .from('batches')
      .select('*')
      .eq('id', batchId)
      .single();
    
    if (error) {
      return {
        isValid: false,
        error: `Database error: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
    
    if (!batch) {
      return {
        isValid: false,
        error: 'Batch not found',
        timestamp: new Date().toISOString()
      };
    }
    
    // Verify IPFS hash if available
    if (batch.ipfsHash || batch.group_id) {
      const hashToVerify = batch.group_id || batch.ipfsHash;
      console.log('Verifying hash:', hashToVerify);
      const ipfsResult = await verifyCertificateByHash(hashToVerify);
      
      if (!ipfsResult.isValid) {
        return ipfsResult;
      }
    }
    
    const certificateData: CertificateData = {
      id: batch.id,
      batchId: batch.id,
      farmer: batch.farmer,
      crop: batch.crop_type,
      variety: batch.variety,
      harvestQuantity: batch.harvest_quantity,
      harvestDate: batch.harvest_date,
      grading: batch.grading,
      certification: batch.certification,
      ipfsHash: batch.ipfsHash || batch.group_id || '',
      groupId: batch.group_id,
      createdAt: batch.created_at
    };
    
    return {
      isValid: true,
      certificate: certificateData,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error verifying certificate by batch ID:', error);
    return {
      isValid: false,
      error: `Verification failed: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verify certificate by group ID
 */
export async function verifyCertificateByGroupId(groupId: string): Promise<VerificationResult> {
  try {
    console.log('Verifying certificate for group ID:', groupId);
    
    // First try to find batch with this group_id
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('*')
      .eq('group_id', groupId)
      .single();
    
    if (!batchError && batch) {
      console.log('Found batch with group_id:', batch);
      // Use the batch verification logic
      return await verifyCertificateByBatchId(batch.id);
    }
    
    // If no batch found, try to verify the group ID directly as IPFS hash
    console.log('No batch found with group_id, trying direct IPFS verification...');
    return await verifyCertificateByHash(groupId);
  } catch (error) {
    console.error('Error verifying certificate by group ID:', error);
    return {
      isValid: false,
      error: `Verification failed: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get certificate URL for viewing
 */
export function getCertificateUrl(ipfsHash: string): string {
  return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
}

/**
 * Download certificate as PDF
 */
export async function downloadCertificate(ipfsHash: string, fileName?: string): Promise<void> {
  try {
    const url = getCertificateUrl(ipfsHash);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch certificate: ${response.status}`);
    }
    
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName || `certificate_${ipfsHash.substring(0, 10)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Error downloading certificate:', error);
    throw error;
  }
}

/**
 * Verify certificate from IPFS hash
 */
export async function verifyCertificateFromIPFS(ipfsHash: string): Promise<VerificationResult> {
  return await verifyCertificateByHash(ipfsHash);
}

/**
 * Verify certificate with database fallback
 */
export async function verifyCertificateWithDatabaseFallback(batchIdOrHash: string | number): Promise<VerificationResult> {
  try {
    console.log('Verifying certificate with database fallback for:', batchIdOrHash);
    
    const input = batchIdOrHash.toString();
    
    // If it's a number, treat it as batch ID
    if (typeof batchIdOrHash === 'number' || !isNaN(Number(batchIdOrHash))) {
      const batchId = input;
      console.log('Treating as batch ID:', batchId);
      
      // Get batch data from database
      let { data: batch, error } = await supabase
        .from('batches')
        .select('*')
        .eq('id', batchId)
        .single();
      
      if (error || !batch) {
        // Try to find batch by group_id if not found by ID
        console.log('Batch not found by ID, trying group_id lookup...');
        const { data: batchByGroup, error: groupError } = await supabase
          .from('batches')
          .select('*')
          .eq('group_id', input)
          .single();
        
        if (groupError || !batchByGroup) {
          return {
            isValid: false,
            errors: [`Batch not found with ID or group ID: ${input}`],
            warnings: [],
            timestamp: new Date().toISOString()
          };
        }
        
        // Use the batch found by group_id
        batch = batchByGroup;
      }
      
      // If batch has IPFS hash or group_id, verify it
      const hashToVerify = batch.group_id || batch.ipfsHash;
      if (hashToVerify) {
        const ipfsResult = await verifyCertificateByHash(hashToVerify);
        if (!ipfsResult.isValid) {
          console.warn('IPFS verification failed, but batch exists in database');
        }
      }
      
      const certificateData: CertificateData = {
        id: batch.id,
        batchId: batch.id,
        farmer: batch.farmer,
        crop: batch.crop_type,
        variety: batch.variety,
        harvestQuantity: batch.harvest_quantity,
        harvestDate: batch.harvest_date,
        grading: batch.grading,
        certification: batch.certification,
        ipfsHash: batch.ipfsHash || batch.group_id || '',
        groupId: batch.group_id,
        createdAt: batch.created_at
      };
      
      return {
        isValid: true,
        certificate: certificateData,
        batchData: {
          id: batch.id,
          crop: batch.crop_type,
          variety: batch.variety,
          harvestQuantity: batch.harvest_quantity,
          farmer: batch.farmer,
          currentOwner: batch.current_owner || batch.farmer,
          price: batch.price_per_kg || '0',
          ipfsHash: batch.ipfsHash || batch.group_id || ''
        },
        errors: [],
        warnings: [],
        timestamp: new Date().toISOString()
      };
    }
    
    // If it's a string, treat it as IPFS hash
    const ipfsHash = batchIdOrHash.toString();
    console.log('Treating as IPFS hash:', ipfsHash);
    
    // First try to verify from IPFS
    const ipfsResult = await verifyCertificateByHash(ipfsHash);
    
    if (ipfsResult.isValid) {
      return ipfsResult;
    }
    
    // If IPFS verification fails, try to find in database
    const { data: batch, error } = await supabase
      .from('batches')
      .select('*')
      .or(`ipfsHash.eq.${ipfsHash},group_id.eq.${ipfsHash}`)
      .single();
    
    if (error || !batch) {
      return {
        isValid: false,
        errors: ['Certificate not found in IPFS or database'],
        warnings: [],
        timestamp: new Date().toISOString()
      };
    }
    
    const certificateData: CertificateData = {
      id: batch.id,
      batchId: batch.id,
      farmer: batch.farmer,
      crop: batch.crop_type,
      variety: batch.variety,
      harvestQuantity: batch.harvest_quantity,
      harvestDate: batch.harvest_date,
      grading: batch.grading,
      certification: batch.certification,
      ipfsHash: batch.ipfsHash || batch.group_id || '',
      groupId: batch.group_id,
      createdAt: batch.created_at
    };
    
    return {
      isValid: true,
      certificate: certificateData,
      batchData: {
        id: batch.id,
        crop: batch.crop_type,
        variety: batch.variety,
        harvestQuantity: batch.harvest_quantity,
        farmer: batch.farmer,
        currentOwner: batch.current_owner || batch.farmer,
        price: batch.price_per_kg || '0',
        ipfsHash: batch.ipfsHash || batch.group_id || ''
      },
      errors: [],
      warnings: [],
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error verifying certificate with database fallback:', error);
    return {
      isValid: false,
      errors: [`Verification failed: ${error.message}`],
      warnings: [],
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Generate verification report
 */
export function generateVerificationReport(result: VerificationResult): string {
  const report = {
    verification: {
      isValid: result.isValid,
      timestamp: result.timestamp,
      error: result.error || null
    },
    certificate: result.certificate ? {
      id: result.certificate.id,
      batchId: result.certificate.batchId,
      farmer: result.certificate.farmer,
      crop: result.certificate.crop,
      variety: result.certificate.variety,
      harvestQuantity: result.certificate.harvestQuantity,
      harvestDate: result.certificate.harvestDate,
      grading: result.certificate.grading,
      certification: result.certificate.certification,
      ipfsHash: result.certificate.ipfsHash,
      groupId: result.certificate.groupId,
      createdAt: result.certificate.createdAt
    } : null
  };
  
  return JSON.stringify(report, null, 2);
}