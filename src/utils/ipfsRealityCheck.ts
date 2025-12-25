/**
 * IPFS Reality Check - Understanding how IPFS actually works
 * 
 * IMPORTANT FACTS:
 * 1. IPFS is IMMUTABLE - files cannot be changed once uploaded
 * 2. Each file has a unique hash based on its content
 * 3. Changing content = new hash = completely new file
 * 4. Old files remain on IPFS forever (until they expire from nodes)
 * 5. We can only "update" by creating new files and updating our database references
 */

import { IPFSService } from './ipfs';
import { generatePDFCertificate, EnhancedBatchData } from './certificateGenerator';
import { getEnhancedBatchData } from './supplyChainTracker';

/**
 * Create a new certificate version (this is what actually happens)
 * We cannot update existing IPFS files - we can only create new ones
 */
export const createNewCertificateVersion = async (
  batchId: string,
  existingIpfsHash: string
): Promise<{ newHash: string; oldHash: string }> => {
  try {
    // Get the enhanced batch data with current transaction history
    const enhancedBatchData = await getEnhancedBatchData(batchId);
    if (!enhancedBatchData) {
      throw new Error('Batch not found');
    }

    // Generate new certificate with current transaction history
    const newCertificateBlob = await generatePDFCertificate(enhancedBatchData);

    // Upload the NEW certificate to IPFS (this creates a completely new file)
    const ipfsService = IPFSService.getInstance();
    const fileName = `AgriTrace_Certificate_${batchId}_v${Date.now()}.pdf`;
    
    const pinataResponse = await ipfsService.uploadFile(
      newCertificateBlob,
      fileName,
      {
        name: fileName,
        keyvalues: {
          batchId: batchId,
          type: 'certificate',
          version: 'new',
          previousHash: existingIpfsHash,
          createdAt: new Date().toISOString()
        }
      }
    );

    // Optionally unpin the old file to save storage costs
    try {
      await ipfsService.unpinFile(existingIpfsHash);
      console.log(`Unpinned old certificate: ${existingIpfsHash}`);
    } catch (unpinError) {
      console.warn('Failed to unpin old certificate:', unpinError);
    }

    return {
      newHash: pinataResponse.IpfsHash,
      oldHash: existingIpfsHash
    };
  } catch (error) {
    console.error('Error creating new certificate version:', error);
    throw new Error('Failed to create new certificate version');
  }
};

/**
 * Update batch record with new certificate hash
 */
export const updateBatchWithNewCertificateHash = async (
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

    console.log(`Updated batch ${batchId} with new certificate hash: ${newIpfsHash}`);
  } catch (error) {
    console.error('Error updating batch with new certificate hash:', error);
    throw new Error('Failed to update batch with new certificate hash');
  }
};

/**
 * Complete process: Create new certificate version and update batch record
 * This is what actually happens - we create new files, not update existing ones
 */
export const createUpdatedCertificate = async (
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

    // Create a new certificate version (we cannot update the existing one)
    const { newHash, oldHash } = await createNewCertificateVersion(batchId, existingIpfsHash);

    // Update the batch record with the new certificate hash
    await updateBatchWithNewCertificateHash(batchId, newHash);

    console.log(`Created new certificate version: ${oldHash} -> ${newHash}`);
    return newHash;
  } catch (error) {
    console.error('Error creating updated certificate:', error);
    throw new Error('Failed to create updated certificate');
  }
};
