import { ethers } from 'ethers';
import { CONTRACT_ADDRESS } from '@/contracts/config';
import AgriTraceABI from '@/contracts/AgriTrace.json';
import { Batch } from '@/contracts/config';

/**
 * Get contract instance for direct use (outside React components)
 */
export const getContractInstance = (provider: ethers.Provider, signer?: ethers.Signer) => {
  const contractSigner = signer || provider;
  return new ethers.Contract(CONTRACT_ADDRESS, AgriTraceABI.abi, contractSigner);
};

/**
 * Get batch data from blockchain (for use outside React components)
 */
export const getBatchFromBlockchain = async (
  batchId: number,
  provider: ethers.Provider
): Promise<Batch | null> => {
  try {
    const contract = getContractInstance(provider);
    
    // Check if batch exists by checking if the ID is not zero
    const batch = await contract.batches(batchId);
    
    // If batch ID is 0, it means the batch doesn't exist
    if (Number(batch.id) === 0) {
      console.log(`Batch ${batchId} does not exist on blockchain`);
      return null;
    }
    
    // Check if required fields are not empty
    if (!batch.crop || batch.crop === '') {
      console.log(`Batch ${batchId} exists but has no crop data`);
      return null;
    }
    
    return {
      id: Number(batch.id),
      farmer: batch.farmer,
      crop: batch.crop,
      variety: batch.variety,
      harvestQuantity: batch.harvestQuantity,
      sowingDate: batch.sowingDate,
      harvestDate: batch.harvestDate,
      freshnessDuration: batch.freshnessDuration,
      grading: batch.grading,
      certification: batch.certification,
      labTest: batch.labTest,
      price: Number(batch.price),
      ipfsHash: batch.ipfsHash,
      languageDetected: batch.languageDetected,
      summary: batch.summary,
      callStatus: batch.callStatus,
      offTopicCount: Number(batch.offTopicCount),
      currentOwner: batch.currentOwner,
    };
  } catch (error) {
    console.error('Error fetching batch from blockchain:', error);
    // If it's a decode error, the batch likely doesn't exist
    if (error instanceof Error && error.message.includes('could not decode result data')) {
      console.log(`Batch ${batchId} does not exist on blockchain (decode error)`);
      return null;
    }
    return null;
  }
};

/**
 * Get next batch ID from contract
 */
export const getNextBatchIdFromContract = async (provider: ethers.Provider): Promise<number> => {
  try {
    const contract = getContractInstance(provider);
    const nextId = await contract.nextBatchId();
    return Number(nextId);
  } catch (error) {
    console.error('Error fetching next batch ID:', error);
    return 0;
  }
};

/**
 * Check if address has a specific role
 */
export const hasRoleOnContract = async (
  role: string,
  address: string,
  provider: ethers.Provider
): Promise<boolean> => {
  try {
    const contract = getContractInstance(provider);
    const roleHash = ethers.keccak256(ethers.toUtf8Bytes(role));
    return await contract.hasRole(roleHash, address);
  } catch (error) {
    console.error('Error checking role:', error);
    return false;
  }
};

/**
 * Get reputation for an address
 */
export const getReputationFromContract = async (
  address: string,
  provider: ethers.Provider
): Promise<number> => {
  try {
    const contract = getContractInstance(provider);
    const reputation = await contract.reputation(address);
    return Number(reputation);
  } catch (error) {
    console.error('Error fetching reputation:', error);
    return 0;
  }
};
