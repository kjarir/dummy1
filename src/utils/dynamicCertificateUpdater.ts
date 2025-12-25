import { IPFSService } from './ipfs';
import { generatePDFCertificate, EnhancedBatchData } from './certificateGenerator';
import { getEnhancedBatchData } from './supplyChainTracker';

/**
 * Store certificate data as JSON on IPFS that can be updated
 */
export const storeCertificateData = async (
  batchId: string,
  certificateData: EnhancedBatchData
): Promise<string> => {
  try {
    const ipfsService = IPFSService.getInstance();
    const fileName = `AgriTrace_Certificate_Data_${batchId}.json`;
    
    const pinataResponse = await ipfsService.uploadJSON(
      certificateData,
      fileName,
      {
        name: fileName,
        keyvalues: {
          batchId: batchId,
          type: 'certificate_data',
          version: '1.0'
        }
      }
    );

    return pinataResponse.IpfsHash;
  } catch (error) {
    console.error('Error storing certificate data:', error);
    throw new Error('Failed to store certificate data');
  }
};

/**
 * Update existing certificate data with new supply chain information
 */
export const updateCertificateData = async (
  batchId: string,
  existingDataHash: string
): Promise<string> => {
  try {
    // Get the enhanced batch data with current transaction history
    const enhancedBatchData = await getEnhancedBatchData(batchId);
    if (!enhancedBatchData) {
      throw new Error('Batch not found');
    }

    // Unpin the old data
    const ipfsService = IPFSService.getInstance();
    try {
      await ipfsService.unpinFile(existingDataHash);
      console.log(`Unpinned old certificate data: ${existingDataHash}`);
    } catch (unpinError) {
      console.warn('Failed to unpin old certificate data:', unpinError);
    }

    // Store the updated certificate data
    const newDataHash = await storeCertificateData(batchId, enhancedBatchData);
    
    console.log(`Updated certificate data: ${existingDataHash} -> ${newDataHash}`);
    return newDataHash;
  } catch (error) {
    console.error('Error updating certificate data:', error);
    throw new Error('Failed to update certificate data');
  }
};

/**
 * Generate PDF certificate from stored data
 */
export const generateCertificateFromData = async (
  dataHash: string
): Promise<Blob> => {
  try {
    // Fetch the certificate data from IPFS
    const ipfsService = IPFSService.getInstance();
    const certificateData = await ipfsService.fetchFromIPFS(dataHash);
    
    // Generate PDF from the data
    const pdfBlob = await generatePDFCertificate(certificateData);
    
    return pdfBlob;
  } catch (error) {
    console.error('Error generating certificate from data:', error);
    throw new Error('Failed to generate certificate from data');
  }
};

/**
 * Complete process: Update certificate data and return new hash
 */
export const updateCertificateWithSupplyChainData = async (
  batchId: string
): Promise<string> => {
  try {
    // Get current batch data to find existing certificate data hash
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data: batch, error: fetchError } = await (supabase as any)
      .from('batches')
      .select('ipfs_hash, ipfs_certificate_hash, certificate_data_hash')
      .eq('id', batchId)
      .single();

    if (fetchError || !batch) {
      throw new Error('Batch not found');
    }

    // Use certificate_data_hash if available, otherwise use certificate hash
    const existingDataHash = batch.certificate_data_hash || batch.ipfs_certificate_hash || batch.ipfs_hash;
    if (!existingDataHash) {
      throw new Error('No existing certificate data found for this batch');
    }

    // Update the certificate data with supply chain information
    const newDataHash = await updateCertificateData(batchId, existingDataHash);

    // Update the batch record with the new data hash
    const { error: updateError } = await (supabase as any)
      .from('batches')
      .update({ 
        certificate_data_hash: newDataHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', batchId);

    if (updateError) {
      throw updateError;
    }

    return newDataHash;
  } catch (error) {
    console.error('Error updating certificate with supply chain data:', error);
    throw new Error('Failed to update certificate with supply chain data');
  }
};
