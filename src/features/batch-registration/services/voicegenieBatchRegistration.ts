/**
 * Batch Registration Service for VoiceGenie Submissions
 * Registers batches on blockchain and uploads certificates to Pinata
 */

import { ipfsManager } from '@/features/ipfs/utils/ipfsManager';
import { blockchainTransactionManager } from '@/features/blockchain/utils/blockchainTransactionManager';
import { supabase } from '@/integrations/supabase/client';
import { CONTRACT_ADDRESS } from '@/contracts/config';
import AgriTraceABI from '@/contracts/AgriTrace.json';
import { ethers } from 'ethers';
import type { BatchInput } from '@/contracts/config';
import { logger } from '@/lib/logger';
import { sanitizeError, sanitizeString, isValidPhone } from '@/lib/security';

export interface BatchRegistrationResult {
  batchId: string;
  blockchainHash: string;
  ipfsHash: string;
  groupId: string;
}

/**
 * Register batch from VoiceGenie call data
 * @param collectedData - Data collected from VoiceGenie call
 * @param farmerPhone - Farmer's phone number
 * @param farmerName - Farmer's name
 * @param farmerLocation - Farmer's location (optional)
 * @param signer - Ethers signer for blockchain transactions (optional, will use provider if not provided)
 */
export async function registerBatchFromVoiceGenie(
  collectedData: any,
  farmerPhone: string,
  farmerName: string,
  farmerLocation?: string,
  signer?: ethers.Signer | null
): Promise<BatchRegistrationResult> {
  logger.debug('Starting batch registration from VoiceGenie', { farmerPhone, farmerName });

  // Step 1: Get or create farmer profile
  const farmerProfile = await getOrCreateFarmerProfile(farmerPhone, farmerName, farmerLocation);
  logger.debug('Farmer profile retrieved', { farmerId: farmerProfile.id });

  // Step 2: Generate harvest certificate and upload to Pinata
  const tempBatchId = Date.now().toString();
  const harvestData = {
    batchId: tempBatchId,
    farmerName: farmerProfile.full_name,
    cropType: collectedData.cropType,
    variety: collectedData.variety,
    harvestQuantity: collectedData.harvestQuantity,
    harvestDate: collectedData.harvestDate,
    grading: collectedData.grading || 'Standard',
    certification: collectedData.certification || 'Standard',
    pricePerKg: collectedData.pricePerKg
  };

  logger.debug('Generating harvest certificate');
  const { pdfBlob, groupId, ipfsHash } = await ipfsManager.uploadHarvestCertificate(harvestData);
  logger.debug('Certificate uploaded to Pinata', { groupId, ipfsHash });

  // Step 3: Register on blockchain
  const calculatedPrice = Math.floor(
    collectedData.harvestQuantity * collectedData.pricePerKg * 100
  );

  // Validate price
  if (calculatedPrice > 1000000000) {
    throw new Error('Price too high. Please reduce quantity or price per kg.');
  }

  // Helper functions to convert types for contract
  const dateStringToTimestamp = (dateString: string): number => {
    if (!dateString) {
      throw new Error('Date string cannot be empty');
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date string: ${dateString}`);
    }
    return Math.floor(date.getTime() / 1000); // Unix timestamp in seconds
  };

  const freshnessDurationToNumber = (duration: string | number): number => {
    if (typeof duration === 'number') {
      if (duration < 0 || duration > 2**96 - 1) {
        throw new Error(`Freshness duration out of range: ${duration}`);
      }
      return duration;
    }
    const num = parseInt(String(duration), 10);
    if (isNaN(num) || num < 0 || num > 2**96 - 1) {
      throw new Error(`Invalid freshness duration: ${duration}`);
    }
    return num;
  };

  const gradingToEnum = (grading: string): number => {
    const normalized = grading.trim().toUpperCase();
    switch (normalized) {
      case 'NONE':
      case '':
        return 0;
      case 'A':
      case 'GRADE A':
        return 1;
      case 'B':
      case 'GRADE B':
        return 2;
      case 'C':
      case 'GRADE C':
        return 3;
      case 'PREMIUM':
        return 4;
      case 'STANDARD':
        return 5;
      default:
        logger.warn(`Unknown grading value: ${grading}, defaulting to STANDARD (5)`);
        return 5;
    }
  };

  const callStatusToEnum = (callStatus: string): number => {
    const normalized = callStatus.trim().toUpperCase();
    switch (normalized) {
      case 'PENDING':
        return 0;
      case 'ACTIVE':
        return 1;
      case 'COMPLETED':
      case 'ENDED':
        return 2;
      case 'CANCELLED':
        return 3;
      default:
        logger.warn(`Unknown call status: ${callStatus}, defaulting to COMPLETED (2)`);
        return 2;
    }
  };

  // Frontend BatchInput (with strings for dates/enums)
  const frontendBatchInput: BatchInput = {
    crop: collectedData.cropType,
    variety: collectedData.variety,
    harvestQuantity: collectedData.harvestQuantity.toString(),
    sowingDate: collectedData.sowingDate,
    harvestDate: collectedData.harvestDate,
    freshnessDuration: (collectedData.freshnessDuration || 7).toString(),
    grading: collectedData.grading || 'Standard',
    certification: collectedData.certification || 'Standard',
    labTest: collectedData.labTest || '',
    price: calculatedPrice,
    ipfsHash: groupId,
    languageDetected: 'en',
    summary: `Agricultural produce batch: ${collectedData.cropType} - ${collectedData.variety}`,
    callStatus: 'completed',
    offTopicCount: 0
  };

  // Convert to contract types (dates to timestamps, enums to numbers)
  const contractBatchInput = {
    crop: frontendBatchInput.crop,
    variety: frontendBatchInput.variety,
    harvestQuantity: frontendBatchInput.harvestQuantity,
    sowingDate: dateStringToTimestamp(frontendBatchInput.sowingDate),
    harvestDate: dateStringToTimestamp(frontendBatchInput.harvestDate),
    freshnessDuration: freshnessDurationToNumber(frontendBatchInput.freshnessDuration),
    grading: gradingToEnum(frontendBatchInput.grading),
    certification: frontendBatchInput.certification,
    labTest: frontendBatchInput.labTest,
    price: BigInt(Math.floor(frontendBatchInput.price)),
    ipfsHash: frontendBatchInput.ipfsHash,
    languageDetected: frontendBatchInput.languageDetected,
    summary: frontendBatchInput.summary,
    callStatus: callStatusToEnum(frontendBatchInput.callStatus),
    offTopicCount: BigInt(Math.floor(frontendBatchInput.offTopicCount || 0))
  };

  // Step 3: Register on blockchain
  logger.debug('Registering on blockchain', {
    crop: frontendBatchInput.crop,
    variety: frontendBatchInput.variety,
    sowingDate: contractBatchInput.sowingDate,
    harvestDate: contractBatchInput.harvestDate,
    grading: contractBatchInput.grading,
    callStatus: contractBatchInput.callStatus
  });
  
  // Get provider and contract
  if (!signer) {
    throw new Error('Signer required for blockchain registration. Please connect wallet.');
  }

  const contract = new ethers.Contract(CONTRACT_ADDRESS, AgriTraceABI.abi, signer);
  
  try {
    // Step 3: Register on blockchain with converted types
    const tx = await contract.registerBatch(contractBatchInput);
    logger.debug('Transaction submitted', { hash: tx.hash });
    
    const receipt = await tx.wait();
    logger.debug('Blockchain transaction confirmed');

    // Extract batch ID from receipt
    const batchId = extractBatchIdFromReceipt(receipt);
    logger.debug('Extracted batch ID', { batchId });
    
    // Record harvest transaction on blockchain
    try {
      blockchainTransactionManager.updateSigner(signer);
      await blockchainTransactionManager.recordHarvestTransaction(
        batchId.toString(),
        await signer.getAddress(),
        collectedData.cropType,
        collectedData.variety,
        collectedData.harvestQuantity,
        collectedData.pricePerKg,
        ipfsHash
      );
      logger.debug('Harvest transaction recorded');
    } catch (blockchainError) {
      logger.warn('Failed to record harvest transaction', blockchainError);
      // Continue even if this fails
    }

    // Step 4: Save to database (after blockchain success)
    const batchData = {
      farmer_id: farmerProfile.id,
      crop_type: collectedData.cropType,
      variety: collectedData.variety,
      harvest_quantity: parseFloat(collectedData.harvestQuantity),
      sowing_date: collectedData.sowingDate,
      harvest_date: collectedData.harvestDate,
      price_per_kg: parseFloat(collectedData.pricePerKg),
      total_price: collectedData.harvestQuantity * collectedData.pricePerKg,
      grading: collectedData.grading || 'Standard',
      freshness_duration: parseInt(collectedData.freshnessDuration || '7'),
      certification: collectedData.certification || 'Standard',
      status: 'available',
      current_owner: farmerProfile.id,
      group_id: groupId,
      ipfs_hash: ipfsHash,
      ipfs_certificate_hash: ipfsHash,
      blockchain_id: batchId.toString()
    };

    logger.debug('Saving batch to database');
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .insert(batchData)
      .select()
      .single();

    if (batchError) {
      logger.error('Database error saving batch', batchError);
      throw new Error('Failed to save batch to database');
    }

    if (!batch) {
      throw new Error('Batch not returned from database');
    }

    logger.debug('Batch saved to database', { batchId: batch.id });

    // Step 5: Add to marketplace
    const marketplaceData = {
      batch_id: batch.id,
      current_seller_id: farmerProfile.id,
      current_seller_type: 'farmer',
      price: collectedData.harvestQuantity * collectedData.pricePerKg,
      quantity: collectedData.harvestQuantity,
      status: 'available'
    };

    const { error: marketplaceError } = await supabase
      .from('marketplace')
      .insert(marketplaceData);

    if (marketplaceError) {
      logger.warn('Marketplace insertion failed', { error: marketplaceError.message });
      // Don't fail the whole process
    } else {
      logger.debug('Batch added to marketplace', { batchId: batch.id });
    }

    return {
      batchId: batch.id,
      blockchainHash: receipt.hash || receipt.transactionHash || '',
      ipfsHash: ipfsHash,
      groupId: groupId
    };
  } catch (error) {
    logger.error('Error in batch registration', error);
    throw new Error(sanitizeError(error));
  }
}

/**
 * Get or create farmer profile from phone number
 * Creates auth user first, then profile
 */
interface FarmerProfile {
  id: string;
  user_id: string | null;
  phone: string;
  full_name: string;
  farm_location?: string | null;
  user_type: string;
  role: string;
  email: string;
}

async function getOrCreateFarmerProfile(
  phone: string,
  name: string,
  location?: string
): Promise<FarmerProfile> {
  // Normalize phone number
  const normalizedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;
  const email = `${normalizedPhone.replace(/\+/g, '')}@voicegenie.farmer`;

  // Check if profile exists by phone
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('phone', normalizedPhone)
    .limit(1)
    .maybeSingle();

  if (existingProfile) {
    logger.debug('Found existing profile', { profileId: existingProfile.id });
    return existingProfile as FarmerProfile;
  }

  // Create profile without auth user (user_id will be NULL for VoiceGenie farmers)
  const normalizedUserType = 'farmer';
  const normalizedRole = 'farmer';
  
  logger.debug('Creating VoiceGenie farmer profile');
  
  const { data: newProfile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      user_id: null, // NULL for VoiceGenie farmers
      phone: normalizedPhone,
      full_name: sanitizeString(name, 255),
      farm_location: location ? sanitizeString(location, 500) : null,
      user_type: normalizedUserType,
      role: normalizedRole,
      email: email
    })
    .select()
    .single();

  if (profileError) {
    // If profile already exists (unique constraint on phone), fetch it
    if (profileError.code === '23505') {
      const { data: existing } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', normalizedPhone)
        .limit(1)
        .maybeSingle();
      if (existing) {
        logger.debug('Found existing profile after conflict', { profileId: existing.id });
        return existing as FarmerProfile;
      }
    }
    logger.error('Error creating profile', profileError);
    throw new Error('Failed to create farmer profile');
  }

  if (!newProfile) {
    throw new Error('Profile not returned after creation');
  }

  logger.debug('Created new VoiceGenie profile', { profileId: newProfile.id });
  return newProfile as FarmerProfile;
}

interface TransactionReceipt {
  hash?: string;
  transactionHash?: string;
  logs?: Array<{
    topics?: string[];
  }>;
}

/**
 * Extract batch ID from blockchain receipt
 */
function extractBatchIdFromReceipt(receipt: TransactionReceipt): string {
  try {
    // Try to find BatchRegistered event
    const batchRegisteredEventSignature = ethers.id('BatchRegistered(uint256,address,string,string,uint256)');
    
    const batchRegisteredEvent = receipt.logs?.find(
      (log) => log.topics?.[0] === batchRegisteredEventSignature
    );

    if (batchRegisteredEvent?.topics?.[1]) {
      const batchId = parseInt(batchRegisteredEvent.topics[1], 16);
      if (!isNaN(batchId) && batchId > 0) {
        return batchId.toString();
      }
    }

    // Fallback: use timestamp
    return Math.floor(Date.now() / 1000).toString();
  } catch (error) {
    logger.warn('Could not extract batch ID from receipt, using timestamp', error);
    return Math.floor(Date.now() / 1000).toString();
  }
}


