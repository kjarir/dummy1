import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { ethers } from 'ethers';
import { useWeb3 } from '@/features/blockchain/contexts/Web3Context';
import { BatchInput, Batch } from '@/contracts/config';
import { useToast } from '@/components/ui/use-toast';
import { sanitizeError } from '@/lib/security';

/**
 * Convert date string (YYYY-MM-DD) to Unix timestamp (uint256)
 */
function dateStringToTimestamp(dateString: string): number {
  if (!dateString) {
    throw new Error('Date string cannot be empty');
  }
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`);
  }
  
  // Return Unix timestamp in seconds (contract uses seconds, not milliseconds)
  return Math.floor(date.getTime() / 1000);
}

/**
 * Convert freshness duration string to uint96 number
 */
function freshnessDurationToNumber(duration: string | number): number {
  if (typeof duration === 'number') {
    if (duration < 0 || duration > 2**96 - 1) {
      throw new Error(`Freshness duration out of range: ${duration}`);
    }
    return duration;
  }
  
  const num = parseInt(duration, 10);
  if (isNaN(num) || num < 0 || num > 2**96 - 1) {
    throw new Error(`Invalid freshness duration: ${duration}`);
  }
  return num;
}

/**
 * Convert grading string to enum number
 * Grading enum: NONE=0, A=1, B=2, C=3, PREMIUM=4, STANDARD=5
 */
function gradingToEnum(grading: string): number {
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
      // Default to STANDARD if unknown
      logger.warn(`Unknown grading value: ${grading}, defaulting to STANDARD (5)`);
      return 5;
  }
}

/**
 * Convert call status string to enum number
 * CallStatus enum: PENDING=0, ACTIVE=1, COMPLETED=2, CANCELLED=3
 */
function callStatusToEnum(callStatus: string): number {
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
      // Default to COMPLETED if unknown
      logger.warn(`Unknown call status: ${callStatus}, defaulting to COMPLETED (2)`);
      return 2;
  }
}

/**
 * Convert frontend BatchInput (with strings) to contract BatchInput (with numbers/enums)
 */
function convertBatchInputForContract(input: BatchInput) {
  return {
    crop: input.crop,
    variety: input.variety,
    harvestQuantity: input.harvestQuantity,
    sowingDate: dateStringToTimestamp(input.sowingDate), // Convert to Unix timestamp
    harvestDate: dateStringToTimestamp(input.harvestDate), // Convert to Unix timestamp
    freshnessDuration: freshnessDurationToNumber(input.freshnessDuration), // Convert to uint96
    grading: gradingToEnum(input.grading), // Convert to enum number
    certification: input.certification,
    labTest: input.labTest,
    price: BigInt(Math.floor(input.price)), // Ensure price is a BigInt for uint256
    ipfsHash: input.ipfsHash,
    languageDetected: input.languageDetected,
    summary: input.summary,
    callStatus: callStatusToEnum(input.callStatus), // Convert to enum number
    offTopicCount: BigInt(Math.floor(input.offTopicCount || 0)) // Convert to BigInt for uint256
  };
}

export const useContract = () => {
  const { contract, signer, isConnected } = useWeb3();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const registerBatch = useCallback(async (batchInput: BatchInput) => {
    if (!contract || !isConnected) {
      toast({
        variant: "destructive",
        title: "Wallet not connected",
        description: "Please connect your wallet first.",
      });
      return null;
    }

    setLoading(true);
    try {
      // Convert frontend types to contract types (dates to timestamps, enums to numbers)
      const contractBatchInput = convertBatchInputForContract(batchInput);
      
      logger.debug('Registering batch on blockchain', {
        crop: batchInput.crop,
        variety: batchInput.variety,
        sowingDate: contractBatchInput.sowingDate,
        harvestDate: contractBatchInput.harvestDate,
        grading: contractBatchInput.grading,
        callStatus: contractBatchInput.callStatus
      });
      
      const tx = await contract.registerBatch(contractBatchInput);
      toast({
        title: "Transaction submitted",
        description: "Waiting for confirmation...",
      });

      const receipt = await tx.wait();
      toast({
        title: "Batch registered successfully!",
        description: `Transaction hash: ${receipt.hash}`,
      });

      return receipt;
    } catch (error) {
      logger.error('Error registering batch', error);
      const errorMessage = error instanceof Error ? error.message : sanitizeError(error);
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: errorMessage || "Please try again later.",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [contract, isConnected, toast]);

  const getBatch = useCallback(async (batchId: number): Promise<Batch | null> => {
    if (!contract) return null;

    try {
      const batch = await contract.batches(batchId);
      
      // Convert contract types back to frontend types (timestamps to dates, enums to strings)
      const gradingEnum = Number(batch.grading);
      const gradingMap: Record<number, string> = {
        0: 'None',
        1: 'A',
        2: 'B',
        3: 'C',
        4: 'Premium',
        5: 'Standard'
      };
      
      const callStatusEnum = Number(batch.callStatus);
      const callStatusMap: Record<number, string> = {
        0: 'pending',
        1: 'active',
        2: 'completed',
        3: 'cancelled'
      };
      
      // Convert Unix timestamp to date string
      const timestampToDateString = (timestamp: bigint | number): string => {
        const ts = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
        const date = new Date(ts * 1000); // Convert seconds to milliseconds
        return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
      };
      
      return {
        id: Number(batch.id),
        farmer: batch.farmer,
        crop: batch.crop,
        variety: batch.variety,
        harvestQuantity: batch.harvestQuantity,
        sowingDate: timestampToDateString(batch.sowingDate),
        harvestDate: timestampToDateString(batch.harvestDate),
        freshnessDuration: Number(batch.freshnessDuration).toString(),
        grading: gradingMap[gradingEnum] || 'Standard',
        certification: batch.certification,
        labTest: batch.labTest,
        price: Number(batch.price),
        ipfsHash: batch.ipfsHash,
        languageDetected: batch.languageDetected,
        summary: batch.summary,
        callStatus: callStatusMap[callStatusEnum] || 'completed',
        offTopicCount: Number(batch.offTopicCount),
        currentOwner: batch.currentOwner,
      };
    } catch (error: unknown) {
      logger.error('Error fetching batch', error);
      return null;
    }
  }, [contract]);

  const getNextBatchId = useCallback(async (): Promise<number> => {
    if (!contract) return 0;

    try {
      const nextId = await contract.nextBatchId();
      return Number(nextId);
    } catch (error: unknown) {
      logger.error('Error fetching next batch ID:', error);
      return 0;
    }
  }, [contract]);

  const transferBatch = useCallback(async (batchId: number, to: string) => {
    if (!contract || !isConnected) {
      toast({
        variant: "destructive",
        title: "Wallet not connected",
        description: "Please connect your wallet first.",
      });
      return null;
    }

    setLoading(true);
    try {
      const tx = await contract.transferBatch(batchId, to);
      toast({
        title: "Transaction submitted",
        description: "Waiting for confirmation...",
      });

      const receipt = await tx.wait();
      toast({
        title: "Batch transferred successfully!",
        description: `Transaction hash: ${receipt.hash}`,
      });

      return receipt;
    } catch (error: unknown) {
      logger.error('Error transferring batch', error);
      const errorMessage = error instanceof Error ? error.message : sanitizeError(error);
      toast({
        variant: "destructive",
        title: "Transfer failed",
        description: errorMessage || "Please try again later.",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [contract, isConnected, toast]);

  const updatePrice = useCallback(async (batchId: number, newPrice: number) => {
    if (!contract || !isConnected) {
      toast({
        variant: "destructive",
        title: "Wallet not connected",
        description: "Please connect your wallet first.",
      });
      return null;
    }

    setLoading(true);
    try {
      const tx = await contract.updatePrice(batchId, BigInt(Math.floor(newPrice)));
      toast({
        title: "Transaction submitted",
        description: "Waiting for confirmation...",
      });

      const receipt = await tx.wait();
      toast({
        title: "Price updated successfully!",
        description: `Transaction hash: ${receipt.hash}`,
      });

      return receipt;
    } catch (error: unknown) {
      logger.error('Error updating price', error);
      const errorMessage = error instanceof Error ? error.message : sanitizeError(error);
      toast({
        variant: "destructive",
        title: "Price update failed",
        description: errorMessage || "Please try again later.",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [contract, isConnected, toast]);

  const tipFarmer = useCallback(async (farmerAddress: string, amount: number) => {
    if (!contract || !signer || !isConnected) {
      toast({
        variant: "destructive",
        title: "Wallet not connected",
        description: "Please connect your wallet first.",
      });
      return null;
    }

    setLoading(true);
    try {
      // Convert amount to Wei (assuming amount is in ETH)
      const amountInWei = ethers.parseEther(amount.toString());
      
      const tx = await contract.tipFarmer(farmerAddress, { value: amountInWei });
      toast({
        title: "Transaction submitted",
        description: "Waiting for confirmation...",
      });

      const receipt = await tx.wait();
      toast({
        title: "Tip sent successfully!",
        description: `Transaction hash: ${receipt.hash}`,
      });

      return receipt;
    } catch (error: unknown) {
      logger.error('Error tipping farmer', error);
      const errorMessage = error instanceof Error ? error.message : sanitizeError(error);
      toast({
        variant: "destructive",
        title: "Tip failed",
        description: errorMessage || "Please try again later.",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [contract, signer, isConnected, toast]);

  const hasRole = useCallback(async (role: string, address: string): Promise<boolean> => {
    if (!contract) return false;

    try {
      const roleBytes = ethers.keccak256(ethers.toUtf8Bytes(role));
      return await contract.hasRole(roleBytes, address);
    } catch (error: unknown) {
      logger.error('Error checking role', error);
      return false;
    }
  }, [contract]);

  const getReputation = useCallback(async (address: string): Promise<number> => {
    if (!contract) return 0;

    try {
      const reputation = await contract.reputation(address);
      return Number(reputation);
    } catch (error: unknown) {
      logger.error('Error fetching reputation', error);
      return 0;
    }
  }, [contract]);

  return {
    registerBatch,
    getBatch,
    getNextBatchId,
    transferBatch,
    updatePrice,
    tipFarmer,
    hasRole,
    getReputation,
    loading,
  };
};
