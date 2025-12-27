/**
 * Batch Registration Service for VoiceGenie Submissions
 * Registers batches on blockchain and uploads certificates to Pinata
 */

import { singleStepGroupManager } from '@/features/ipfs/utils/singleStepGroupManager';
import { blockchainTransactionManager } from '@/features/blockchain/utils/blockchainTransactionManager';
import { supabase } from '@/integrations/supabase/client';
import { CONTRACT_ADDRESS } from '@/contracts/config';
import AgriTraceABI from '@/contracts/AgriTrace.json';
import { ethers } from 'ethers';
import type { BatchInput } from '@/contracts/config';

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
  console.log('🔍 DEBUG: Starting batch registration from VoiceGenie:', {
    collectedData,
    farmerPhone,
    farmerName
  });

  // Step 1: Get or create farmer profile
  const farmerProfile = await getOrCreateFarmerProfile(farmerPhone, farmerName, farmerLocation);
  console.log('✅ Farmer profile:', farmerProfile);

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

  console.log('📄 Generating harvest certificate...');
  const { pdfBlob, groupId, ipfsHash } = await singleStepGroupManager.uploadHarvestCertificate(harvestData);
  console.log('✅ Certificate uploaded to Pinata:', { groupId, ipfsHash });

  // Step 3: Register on blockchain
  const calculatedPrice = Math.floor(
    collectedData.harvestQuantity * collectedData.pricePerKg * 100
  );

  // Validate price
  if (calculatedPrice > 1000000000) {
    throw new Error('Price too high. Please reduce quantity or price per kg.');
  }

  const batchInput = {
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

  // Step 3: Register on blockchain
  console.log('⛓️ Registering on blockchain...');
  
  // Get provider and contract
  let provider: ethers.Provider;
  let contractSigner: ethers.Signer;
  
  if (signer) {
    contractSigner = signer;
    provider = signer.provider!;
  } else {
    // Fallback: use default provider (read-only, won't work for transactions)
    provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161');
    throw new Error('Signer required for blockchain registration. Please connect wallet.');
  }

  const contract = new ethers.Contract(CONTRACT_ADDRESS, AgriTraceABI.abi, contractSigner);
  
  try {
    // Step 3: Register on blockchain
    const tx = await contract.registerBatch(batchInput);
    console.log('✅ Transaction submitted:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('✅ Blockchain receipt:', receipt);

    // Extract batch ID from receipt
    const batchId = extractBatchIdFromReceipt(receipt);
    console.log('✅ Extracted batch ID:', batchId);
    
    // Record harvest transaction on blockchain
    if (signer) {
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
        console.log('✅ Harvest transaction recorded');
      } catch (blockchainError) {
        console.warn('⚠️ Failed to record harvest transaction:', blockchainError);
        // Continue even if this fails
      }
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

    console.log('💾 Saving to database...');
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .insert(batchData)
      .select()
      .single();

    if (batchError) {
      console.error('❌ Database error:', batchError);
      throw new Error(`Database error: ${batchError.message}`);
    }

    console.log('✅ Batch saved to database:', batch.id);

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
      console.warn('⚠️ Marketplace insertion failed:', marketplaceError);
      // Don't fail the whole process
    } else {
      console.log('✅ Added to marketplace');
    }

    return {
      batchId: batch.id,
      blockchainHash: receipt.hash || receipt.transactionHash || '',
      ipfsHash: ipfsHash,
      groupId: groupId
    };
  } catch (error) {
    console.error('❌ Error in batch registration:', error);
    throw error;
  }
}

/**
 * Get or create farmer profile from phone number
 * Creates auth user first, then profile
 */
async function getOrCreateFarmerProfile(
  phone: string,
  name: string,
  location?: string
): Promise<any> {
  // Normalize phone number
  const normalizedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;
  const email = `${normalizedPhone.replace(/\+/g, '')}@voicegenie.farmer`;

  // Check if profile exists by phone
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('phone', normalizedPhone)
    .single();

  if (existingProfile) {
    console.log('✅ Found existing profile:', existingProfile.id);
    return existingProfile;
  }

  // Create profile without auth user (user_id will be NULL for VoiceGenie farmers)
  // This is allowed after running fix_voicegenie_profiles.sql
  const normalizedUserType = 'farmer';
  const normalizedRole = 'farmer';
  
  console.log('🔄 Creating VoiceGenie farmer profile (without auth user)...');
  
  const { data: newProfile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      user_id: null, // NULL for VoiceGenie farmers
      phone: normalizedPhone,
      full_name: name,
      farm_location: location,
      user_type: normalizedUserType,
      role: normalizedRole,
      email: email
    })
    .select()
    .single();

  if (profileError) {
    console.error('❌ Error creating profile:', profileError);
    // If profile already exists (unique constraint on phone), fetch it
    if (profileError.code === '23505') { // Unique violation
      const { data: existing } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', normalizedPhone)
        .single();
      if (existing) {
        console.log('✅ Found existing profile after conflict:', existing.id);
        return existing;
      }
    }
    throw new Error(`Failed to create farmer profile: ${profileError.message}`);
  }

  console.log('✅ Created new VoiceGenie profile:', newProfile.id);
  return newProfile;
}

/**
 * Extract batch ID from blockchain receipt
 */
function extractBatchIdFromReceipt(receipt: any): string {
  try {
    // Try to find BatchRegistered event
    const batchRegisteredEventSignature = ethers.id('BatchRegistered(uint256,address,string,string,uint256)');
    
    const batchRegisteredEvent = receipt.logs?.find(
      (log: any) => log.topics?.[0] === batchRegisteredEventSignature
    );

    if (batchRegisteredEvent) {
      const batchId = parseInt(batchRegisteredEvent.topics[1], 16);
      return batchId.toString();
    }

    // Fallback: use timestamp
    return Math.floor(Date.now() / 1000).toString();
  } catch (error) {
    console.warn('Could not extract batch ID from receipt, using timestamp:', error);
    return Math.floor(Date.now() / 1000).toString();
  }
}

