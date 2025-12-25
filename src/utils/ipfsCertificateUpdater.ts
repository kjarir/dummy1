import { IPFSService } from './ipfs';
import { generatePDFCertificate, EnhancedBatchData } from './certificateGenerator';
import { getEnhancedBatchData } from './supplyChainTracker';

/**
 * Update an existing IPFS certificate with new supply chain data
 * Since IPFS is immutable, we'll create a new version but maintain the same filename
 */
export const updateExistingIPFSCertificate = async (
  batchId: string,
  existingIpfsHash: string
): Promise<string> => {
  try {
    // Get the enhanced batch data with current transaction history
    const enhancedBatchData = await getEnhancedBatchData(batchId);
    if (!enhancedBatchData) {
      throw new Error('Batch not found');
    }

    // Generate updated certificate with current transaction history
    const updatedCertificateBlob = await generatePDFCertificate(enhancedBatchData);

    // Create a new version with the same filename to maintain consistency
    const ipfsService = IPFSService.getInstance();
    const fileName = `AgriTrace_Certificate_${batchId}.pdf`;
    
    // First, unpin the old file to clean up
    try {
      await ipfsService.unpinFile(existingIpfsHash);
      console.log(`Unpinned old certificate: ${existingIpfsHash}`);
    } catch (unpinError) {
      console.warn('Failed to unpin old certificate:', unpinError);
      // Continue anyway, as the old file will eventually expire
    }
    
    // Upload the updated certificate with the same filename
    const pinataResponse = await ipfsService.uploadFile(
      updatedCertificateBlob,
      fileName,
      {
        name: fileName,
        keyvalues: {
          batchId: batchId,
          type: 'certificate',
          version: 'updated',
          lastUpdated: new Date().toISOString(),
          originalHash: existingIpfsHash
        }
      }
    );

    console.log(`Updated certificate: ${existingIpfsHash} -> ${pinataResponse.IpfsHash}`);
    return pinataResponse.IpfsHash;
  } catch (error) {
    console.error('Error updating IPFS certificate:', error);
    throw new Error('Failed to update IPFS certificate');
  }
};

/**
 * Update the batch record with the new IPFS hash
 */
export const updateBatchWithNewIPFSHash = async (
  batchId: string,
  newIpfsHash: string
): Promise<void> => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { error } = await (supabase as any)
      .from('batches')
      .update({ 
        ipfs_certificate_hash: newIpfsHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', batchId);

    if (error) {
      throw error;
    }

    console.log(`Updated batch ${batchId} with new IPFS hash: ${newIpfsHash}`);
  } catch (error) {
    console.error('Error updating batch with new IPFS hash:', error);
    throw new Error('Failed to update batch with new IPFS hash');
  }
};

/**
 * Complete process: Update existing certificate and update batch record
 */
export const updateCertificateWithSupplyChain = async (
  batchId: string
): Promise<string> => {
  try {
    // Get current batch data to find existing IPFS hash
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data: batch, error: fetchError } = await (supabase as any)
      .from('batches')
      .select('ipfs_hash, ipfs_certificate_hash')
      .eq('id', batchId)
      .single();

    if (fetchError || !batch) {
      throw new Error('Batch not found');
    }

    const existingIpfsHash = batch.ipfs_certificate_hash || batch.ipfs_hash;
    if (!existingIpfsHash) {
      throw new Error('No existing IPFS certificate found for this batch');
    }

    // Update the certificate with supply chain data
    const newIpfsHash = await updateExistingIPFSCertificate(batchId, existingIpfsHash);

    // Update the batch record with the new IPFS hash
    await updateBatchWithNewIPFSHash(batchId, newIpfsHash);

    return newIpfsHash;
  } catch (error) {
    console.error('Error updating certificate with supply chain:', error);
    throw new Error('Failed to update certificate with supply chain data');
  }
};
