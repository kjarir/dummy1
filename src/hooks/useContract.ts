import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { BatchInput, Batch } from '@/contracts/config';
import { useToast } from '@/components/ui/use-toast';

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
      const tx = await contract.registerBatch(batchInput);
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
    } catch (error: any) {
      console.error('Error registering batch:', error);
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.message || "Please try again later.",
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
      console.error('Error fetching batch:', error);
      return null;
    }
  }, [contract]);

  const getNextBatchId = useCallback(async (): Promise<number> => {
    if (!contract) return 0;

    try {
      const nextId = await contract.nextBatchId();
      return Number(nextId);
    } catch (error) {
      console.error('Error fetching next batch ID:', error);
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
    } catch (error: any) {
      console.error('Error transferring batch:', error);
      toast({
        variant: "destructive",
        title: "Transfer failed",
        description: error.message || "Please try again later.",
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
      const tx = await contract.updatePrice(batchId, newPrice);
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
    } catch (error: any) {
      console.error('Error updating price:', error);
      toast({
        variant: "destructive",
        title: "Price update failed",
        description: error.message || "Please try again later.",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [contract, isConnected, toast]);

  const tipFarmer = useCallback(async (farmerAddress: string, amount: string) => {
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
      const tx = await contract.tipFarmer(farmerAddress, {
        value: ethers.parseEther(amount)
      });
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
    } catch (error: any) {
      console.error('Error tipping farmer:', error);
      toast({
        variant: "destructive",
        title: "Tip failed",
        description: error.message || "Please try again later.",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [contract, isConnected, toast]);

  const hasRole = useCallback(async (role: string, address?: string): Promise<boolean> => {
    if (!contract) return false;

    try {
      const roleHash = ethers.keccak256(ethers.toUtf8Bytes(role));
      const addressToCheck = address || (await signer?.getAddress());
      if (!addressToCheck) return false;

      return await contract.hasRole(roleHash, addressToCheck);
    } catch (error) {
      console.error('Error checking role:', error);
      return false;
    }
  }, [contract, signer]);

  const getReputation = useCallback(async (address?: string): Promise<number> => {
    if (!contract) return 0;

    try {
      const addressToCheck = address || (await signer?.getAddress());
      if (!addressToCheck) return 0;

      const reputation = await contract.reputation(addressToCheck);
      return Number(reputation);
    } catch (error) {
      console.error('Error fetching reputation:', error);
      return 0;
    }
  }, [contract, signer]);

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
