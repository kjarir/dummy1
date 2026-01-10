import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { purchaseTransactionCreator } from '@/features/blockchain/utils/purchaseTransactionCreator';
import { ipfsManager } from '@/features/ipfs/utils/ipfsManager';
import { logger } from '@/lib/logger';
import { sanitizeError, sanitizeString } from '@/lib/security';
import { blockchainTransactionManager } from '@/features/blockchain/utils/blockchainTransactionManager';
import { useWeb3 } from '@/features/blockchain/contexts/Web3Context';
import { 
  ShoppingCart, 
  Package, 
  MapPin, 
  DollarSign,
  CheckCircle
} from 'lucide-react';

interface UltraSimplePurchaseModalProps {
  batch: Record<string, unknown> & {
    id?: string | number;
    batch_id?: string;
    batches?: Record<string, unknown> & {
      id?: string;
      crop_type?: string;
      variety?: string;
      quantity?: number;
      harvest_quantity?: number;
      price_per_kg?: number;
      group_id?: string;
      current_owner?: string;
      profiles?: Record<string, unknown> & { full_name?: string };
    };
    profiles?: Record<string, unknown> & { full_name?: string; wallet_address?: string };
    price?: number;
    price_per_kg?: number;
    quantity?: number;
    harvest_quantity?: number;
    crop_type?: string;
    variety?: string;
    current_owner?: string;
    current_seller_id?: string;
    farmer_id?: string;
    group_id?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onPurchaseComplete: () => void;
}

export const UltraSimplePurchaseModal: React.FC<UltraSimplePurchaseModalProps> = ({ 
  batch, 
  isOpen, 
  onClose, 
  onPurchaseComplete 
}) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { signer, account } = useWeb3();

  if (!batch || !isOpen) return null;

  const handlePurchase = async (quantity: number, address: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to make a purchase.",
      });
      return;
    }

    logger.debug('Starting purchase', { 
      profileId: profile?.id, 
      userType: profile?.user_type,
      batchId: batch?.id,
      batchIdKey: batch?.batch_id,
      batchKeys: Object.keys(batch || {})
    });

    if (!address.trim()) {
      toast({
        variant: "destructive",
        title: "Delivery Address Required",
        description: "Please enter a delivery address.",
      });
      return;
    }

    try {
      logger.debug('Price calculation inputs', {
        batchPrice: batch.price,
        batchQuantity: batch.quantity,
        requestedQuantity: quantity
      });
      
      // Try to get price and quantity from different possible sources
      // Based on the actual batch object structure, use price_per_kg and harvest_quantity
      const batchPrice = batch.price_per_kg || batch.price || batch.batches?.price_per_kg || batch.batches?.price || batch.batches?.total_price;
      const batchQuantity = batch.harvest_quantity || batch.quantity || batch.batches?.harvest_quantity || batch.batches?.quantity;
      
      logger.debug('Price and quantity resolved', {
        batchPrice,
        batchQuantity,
        priceSource: batch.price ? 'batch.price' : batch.batches?.price_per_kg ? 'batch.batches.price_per_kg' : 'fallback',
        quantitySource: batch.quantity ? 'batch.quantity' : batch.batches?.harvest_quantity ? 'batch.batches.harvest_quantity' : 'fallback'
      });
      
      // Use marketplace price and quantity directly
      const unitPrice = Math.round(batchPrice / batchQuantity);
      const totalPrice = quantity * unitPrice;
      const deliveryFee = totalPrice > 1000 ? 0 : 50;
      const finalTotal = totalPrice + deliveryFee;

      // Validate that we have valid price and quantity
      if (isNaN(batchPrice) || isNaN(batchQuantity) || batchPrice <= 0 || batchQuantity <= 0) {
        throw new Error(`Invalid price or quantity: price=${batchPrice}, quantity=${batchQuantity}`);
      }
      
      logger.debug('Price calculation results', {
        unitPrice,
        totalPrice,
        deliveryFee,
        finalTotal
      });

      // Check if enough quantity is available
      if (quantity > batch.quantity) {
        throw new Error(`Only ${batch.quantity} kg available, but you requested ${quantity} kg`);
      }

      // Use the new purchase function
      logger.debug('Processing marketplace purchase');
      
      // Get the correct batch ID for database updates (this should be the batch UUID)
      // Priority: batches.id (nested) > batch_id > id (but only if it's a UUID, not marketplace integer ID)
      let batchId = batch.batches?.id || batch.batch_id;
      
      // If batch.id exists and looks like a UUID (contains hyphens), use it
      // Otherwise, it might be the marketplace integer ID, so don't use it
      if (!batchId && batch.id) {
        if (typeof batch.id === 'string' && batch.id.includes('-')) {
          // Looks like a UUID
          batchId = batch.id;
        } else if (typeof batch.id === 'string' && batch.id.length === 36) {
          // UUID format without checking hyphens
          batchId = batch.id;
        }
      }
      
      logger.debug('🔍 DEBUG: Batch ID determination:', {
        'batch.batches?.id': batch.batches?.id,
        'batch.batch_id': batch.batch_id,
        'batch.id': batch.id,
        'batch.id type': typeof batch.id,
        'final batchId': batchId
      });
      
      if (!batchId) {
        throw new Error('No valid batch UUID found. Cannot proceed with purchase.');
      }
      
      // Get the marketplace ID for inventory
      // Since this batch object is from the batches table, we need to find the corresponding marketplace record
      let marketplaceId = null;
      
      try {
        const { data: marketplaceRecord } = await supabase
          .from('marketplace')
          .select('id')
          .eq('batch_id', batchId)
          .single();
        
        marketplaceId = marketplaceRecord?.id;
        logger.debug('🔍 DEBUG: Found marketplace record:', marketplaceRecord);
        logger.debug('🔍 DEBUG: Using marketplace ID for inventory:', marketplaceId);
      } catch (error) {
        logger.warn('🔍 DEBUG: Could not find marketplace record for batch:', batchId, error);
      }
      
      if (!batchId) {
        throw new Error('No valid batch ID found for update');
      }
      
      if (!marketplaceId) {
        logger.warn('🔍 DEBUG: No marketplace ID found, skipping inventory creation');
      }

      // Get current marketplace quantity before purchase
      let currentMarketplaceQuantity = batch.quantity || batch.batches?.quantity || batch.batches?.harvest_quantity || 0;
      const remainingQuantity = currentMarketplaceQuantity - quantity;
      
      logger.debug('🔍 DEBUG: Quantity calculation:', {
        currentQuantity: currentMarketplaceQuantity,
        purchaseQuantity: quantity,
        remainingQuantity: remainingQuantity,
        batch_quantity: batch.quantity,
        batches_quantity: batch.batches?.quantity,
        batches_harvest_quantity: batch.batches?.harvest_quantity
      });

      // Update the batch ownership directly - use the actual batch UUID
      // batchId should be the UUID from batches table, not marketplace ID
      logger.debug('🔍 DEBUG: Updating batch ownership:', {
        batchId,
        newOwner: profile?.id,
        newOwnerName: profile?.full_name,
        newOwnerType: profile?.user_type,
        status: remainingQuantity > 0 ? 'available' : 'sold',
        oldOwner: batch.current_owner || batch.batches?.current_owner
      });
      
      // Get the current owner BEFORE update (this is the seller)
      const sellerId = batch.batches?.current_owner || batch.current_owner || batch.farmer_id || batch.batches?.farmer_id;
      logger.debug('🔍 DEBUG: Seller ID (current owner before purchase):', sellerId);
      
      const { data: updatedBatch, error: updateError } = await supabase
        .from('batches')
        .update({ 
          current_owner: profile?.id,
          status: remainingQuantity > 0 ? 'available' : 'sold'
        })
        .eq('id', batchId)
        .select('id, current_owner, status, harvest_quantity')
        .single();

      if (updateError) {
        logger.error('❌ Batch ownership update failed:', updateError);
        throw new Error(`Purchase failed: ${updateError.message}`);
      }

      if (updatedBatch) {
        logger.debug('✅ Batch ownership updated successfully:', {
          batchId: updatedBatch.id,
          oldOwner: sellerId,
          newOwner: updatedBatch.current_owner,
          newOwnerProfileId: profile?.id,
          status: updatedBatch.status,
          match: updatedBatch.current_owner === profile?.id ? '✅ MATCH' : '❌ MISMATCH'
        });
        
        // Verify the update actually worked
        if (updatedBatch.current_owner !== profile?.id) {
          logger.error('❌ CRITICAL: Ownership update did not match! Expected:', profile?.id, 'Got:', updatedBatch.current_owner);
          throw new Error('Ownership update verification failed. Please try again.');
        }
      } else {
        logger.warn('⚠️ Batch update returned no data - ownership may not have updated');
        throw new Error('Batch update returned no data');
      }

      // Update marketplace quantity and status
      // If all quantity is purchased, mark as sold, otherwise reduce quantity
      interface MarketplaceUpdateData {
        current_seller_id?: string;
        current_seller_type?: string;
        status?: string;
        quantity?: number;
      }
      const marketplaceUpdateData: MarketplaceUpdateData = {
        current_seller_id: profile?.id,
        current_seller_type: profile?.user_type || (profile?.full_name?.toLowerCase().includes('distributor') ? 'distributor' : 'retailer')
      };

      if (remainingQuantity <= 0) {
        // All quantity sold - mark as sold
        marketplaceUpdateData.status = 'sold';
        marketplaceUpdateData.quantity = 0;
        logger.debug('🔍 DEBUG: All quantity purchased, marking marketplace as sold');
      } else {
        // Reduce quantity, keep as available
        marketplaceUpdateData.status = 'available';
        marketplaceUpdateData.quantity = remainingQuantity;
        logger.debug('🔍 DEBUG: Reducing marketplace quantity to:', remainingQuantity);
      }

      // Find marketplace record by batch_id (not batch.id which might be marketplace ID)
      const { error: marketplaceError } = await supabase
        .from('marketplace')
        .update(marketplaceUpdateData)
        .eq('batch_id', batchId);

      if (marketplaceError) {
        logger.warn('Failed to update marketplace:', marketplaceError);
        // Try alternative: update by marketplace ID if batch.id is marketplace ID
        if (batch.id && typeof batch.id === 'number') {
          const { error: altMarketplaceError } = await supabase
            .from('marketplace')
            .update(marketplaceUpdateData)
            .eq('id', batch.id);
          
          if (altMarketplaceError) {
            logger.warn('Failed to update marketplace by ID:', altMarketplaceError);
          } else {
            logger.debug('✅ Marketplace updated by ID');
          }
        }
        // Don't fail the purchase for this
      } else {
        logger.debug('✅ Marketplace updated successfully:', marketplaceUpdateData);
      }

      logger.debug('🔍 DEBUG: Purchase successful!');
      logger.debug('🔍 DEBUG: Profile data:', profile);
      logger.debug('🔍 DEBUG: User type:', profile?.user_type);

      // Determine transaction type based on buyer's role
      const isDistributor = profile?.user_type === 'distributor' || 
                           profile?.full_name?.toLowerCase().includes('distributor');
      const isRetailer = profile?.user_type === 'retailer' || 
                        profile?.full_name?.toLowerCase().includes('retailer');
      
      // Use RETAIL type when retailer buys from distributor, PURCHASE otherwise
      const transactionType = isRetailer ? 'RETAIL' : 'PURCHASE';
      
      logger.debug('🔍 DEBUG: Transaction type determined:', {
        user_type: profile?.user_type,
        full_name: profile?.full_name,
        isDistributor,
        isRetailer,
        transactionType
      });

      // Create transaction record in transactions table
      // Use the sellerId we captured BEFORE the ownership update
      interface TransactionResult {
        id?: string;
        transaction_id?: string;
      }
      let transactionResult: TransactionResult | null = null;
      try {
        const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        // sellerId was already captured above before ownership update
        
        logger.debug('🔍 DEBUG: Transaction creation details:', {
          batchId,
          sellerId, // This is the OLD owner (who we bought FROM)
          buyerId: profile?.id, // This is the NEW owner (who bought it)
          transactionType,
          updatedBatchCurrentOwner: updatedBatch?.current_owner // Should match buyerId
        });
        
        const transactionData = {
          transaction_id: transactionId,
          batch_id: batchId.toString(),
          type: transactionType,
          from_address: sellerId || 'unknown',
          to_address: profile?.id || 'unknown',
          quantity: quantity,
          price: finalTotal,
          transaction_timestamp: new Date().toISOString(),
          ipfs_hash: '', // Will be updated after certificate generation
          blockchain_hash: '', // Will be updated after blockchain transaction
          product_details: {
            crop_type: batch.crop_type || batch.batches?.crop_type,
            variety: batch.variety || batch.batches?.variety,
            quantity: quantity,
            price_per_kg: unitPrice
          },
          metadata: {
            delivery_address: address,
            buyer_name: profile?.full_name,
            buyer_type: profile?.user_type,
            seller_name: batch.profiles?.full_name || batch.batches?.profiles?.full_name,
            transactionType: transactionType
          }
        };

        const { data: transactionDataResult, error: transactionError } = await supabase
          .from('transactions')
          .insert(transactionData)
          .select()
          .single();

        if (transactionError) {
          logger.warn('⚠️ Failed to create transaction record:', transactionError);
          // Create a fallback transaction result object
          transactionResult = { id: transactionId };
        } else {
          transactionResult = transactionDataResult;
          logger.debug('✅ Transaction record created:', transactionResult);
        }
      } catch (transactionCreateError) {
        logger.warn('⚠️ Error creating transaction record:', transactionCreateError);
        // Create a fallback transaction result with generated ID
        transactionResult = { 
          id: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
        };
      }

      // Note: isDistributor and isRetailer are already defined above for transaction type
      logger.debug('🔍 DEBUG: User type check:', {
        user_type: profile?.user_type,
        full_name: profile?.full_name,
        isDistributor,
        isRetailer
      });
      
      if (isDistributor && marketplaceId) {
        const inventoryData = {
          distributor_id: profile.id,
          marketplace_id: marketplaceId, // Use the marketplace table's integer ID
          quantity_purchased: quantity,
          purchase_price: finalTotal,
          created_at: new Date().toISOString()
        };
        
        logger.debug('🔍 DEBUG: Distributor inventory data before insert:', inventoryData);
        logger.debug('🔍 DEBUG: Batch object keys:', Object.keys(batch));
        logger.debug('🔍 DEBUG: Batch.id type:', typeof batch.id, 'value:', batch.id);
        logger.debug('🔍 DEBUG: Full batch object structure:', JSON.stringify(batch, null, 2));

        logger.debug('🔍 DEBUG: Creating distributor inventory entry:', inventoryData);

        const { data: inventoryResult, error: inventoryError } = await supabase
          .from('distributor_inventory')
          .insert(inventoryData)
          .select()
          .single();

        if (inventoryError) {
          logger.error('❌ Distributor inventory creation error:', inventoryError);
          logger.error('❌ Inventory data that failed:', inventoryData);
        } else {
          logger.debug('✅ Distributor inventory entry created successfully:', inventoryResult);
        }
      } else if (isDistributor && !marketplaceId) {
        logger.debug('⚠️ Skipping distributor inventory creation - no marketplace ID found');
      } else if (isRetailer && marketplaceId) {
        const inventoryData = {
          retailer_id: profile.id,
          marketplace_id: marketplaceId, // Use the marketplace table's integer ID
          quantity_purchased: quantity,
          purchase_price: finalTotal,
          created_at: new Date().toISOString()
        };
        
        logger.debug('🔍 DEBUG: Inventory data before insert:', inventoryData);
        logger.debug('🔍 DEBUG: Batch object keys:', Object.keys(batch));
        logger.debug('🔍 DEBUG: Batch.id type:', typeof batch.id, 'value:', batch.id);
        logger.debug('🔍 DEBUG: Full batch object structure:', JSON.stringify(batch, null, 2));

        logger.debug('🔍 DEBUG: Creating retailer inventory entry:', inventoryData);

        const { data: inventoryResult, error: inventoryError } = await supabase
          .from('retailer_inventory')
          .insert(inventoryData)
          .select()
          .single();

        if (inventoryError) {
          logger.error('❌ Retailer inventory creation error:', inventoryError);
          logger.error('❌ Inventory data that failed:', inventoryData);
        } else {
          logger.debug('✅ Retailer inventory entry created successfully:', inventoryResult);
        }
      } else if (isRetailer && !marketplaceId) {
        logger.debug('⚠️ Skipping retailer inventory creation - no marketplace ID found');
      } else {
        logger.debug('🔍 DEBUG: No inventory creation - user type check failed');
        logger.debug('🔍 DEBUG: User type:', profile?.user_type);
        logger.debug('🔍 DEBUG: Full name:', profile?.full_name);
        logger.debug('🔍 DEBUG: Is distributor:', isDistributor);
        logger.debug('🔍 DEBUG: Is retailer:', isRetailer);
        logger.debug('🔍 DEBUG: Profile object:', profile);
      }

      // Record transaction on blockchain (optional)
      if (signer && blockchainTransactionManager && account) {
        try {
          blockchainTransactionManager.updateSigner(signer);
          // Get seller's wallet address from the batch data
          let sellerWalletAddress = batch.profiles?.wallet_address;
          
          // If wallet address is not available, try to fetch it from the seller's profile
          if (!sellerWalletAddress) {
            logger.debug('🔍 DEBUG: Seller wallet address not found in batch, fetching from profile...');
            
            // Try to get seller ID from different sources
            const sellerId = batch.current_owner || batch.current_seller_id || batch.farmer_id;
            logger.debug('🔍 DEBUG: Seller ID for wallet lookup:', sellerId);
            
            if (sellerId) {
              try {
                const { data: sellerProfile } = await supabase
                  .from('profiles')
                  .select('wallet_address, full_name, email')
                  .eq('id', sellerId)
                  .single();
                
                sellerWalletAddress = sellerProfile?.wallet_address;
                logger.debug('🔍 DEBUG: Fetched seller profile:', sellerProfile);
                logger.debug('🔍 DEBUG: Seller wallet address from profile:', sellerWalletAddress);
                
                // If still no wallet address, try to use a default or generate one
                if (!sellerWalletAddress) {
                  logger.warn('🔍 DEBUG: Seller has no wallet address in profile, using fallback...');
                  // Generate a placeholder wallet address for demo purposes
                  // In production, you would want to prompt the seller to connect their wallet
                  sellerWalletAddress = `0x${sellerId.replace(/-/g, '').substring(0, 40)}`;
                  logger.debug('🔍 DEBUG: Generated placeholder wallet address:', sellerWalletAddress);
                }
              } catch (error) {
                logger.warn('🔍 DEBUG: Could not fetch seller profile:', error);
                // Use a default wallet address for demo purposes
                sellerWalletAddress = '0x0000000000000000000000000000000000000000';
                logger.debug('🔍 DEBUG: Using default wallet address due to error:', sellerWalletAddress);
              }
            } else {
              logger.warn('🔍 DEBUG: No seller ID found for wallet lookup');
              // Use a default wallet address for demo purposes
              sellerWalletAddress = '0x0000000000000000000000000000000000000000';
              logger.debug('🔍 DEBUG: Using default wallet address:', sellerWalletAddress);
            }
          }
          
          logger.debug('🔍 DEBUG: Seller wallet address sources:', {
            batchProfilesWalletAddress: batch.profiles?.wallet_address,
            batchBatchesProfilesWalletAddress: batch.batches?.profiles?.wallet_address,
            batchCurrentSellerId: batch.current_seller_id,
            batchCurrentOwner: batch.current_owner,
            batchFarmerId: batch.farmer_id,
            finalSellerWalletAddress: sellerWalletAddress
          });
          
          logger.debug('🔍 DEBUG: Wallet address check:', {
            batchProfiles: batch.profiles,
            sellerWalletAddress,
            account,
            batchCurrentSellerId: batch.current_seller_id
          });
          
          // CRITICAL: Get blockchainBatchId from batch object or database
          // This must be the actual blockchain batch ID from registration, not the database UUID
          let blockchainBatchId: number | null = null;
          
          // Try to get from batch object first
          blockchainBatchId = batch.blockchain_id || batch.batches?.blockchain_id || batch.blockchain_batch_id || batch.batches?.blockchain_batch_id || null;
          
          // If not in batch object, fetch from database
          if (!blockchainBatchId && batchId) {
            try {
              const { data: batchData, error: batchFetchError } = await supabase
                .from('batches')
                .select('blockchain_id, blockchain_batch_id')
                .eq('id', batchId)
                .single();
              
              if (!batchFetchError && batchData) {
                blockchainBatchId = batchData.blockchain_id || batchData.blockchain_batch_id || null;
                logger.debug('✅ Fetched blockchainBatchId from database:', blockchainBatchId);
              } else {
                logger.warn('⚠️ Failed to fetch blockchainBatchId from database:', batchFetchError);
              }
            } catch (fetchError) {
              logger.warn('⚠️ Error fetching blockchainBatchId:', fetchError);
            }
          }
          
          // Validate that we have valid Ethereum addresses and blockchainBatchId
          if (!sellerWalletAddress || !account) {
            logger.warn('🔍 DEBUG: Missing wallet addresses for blockchain transaction');
            logger.warn('🔍 DEBUG: sellerWalletAddress:', sellerWalletAddress);
            logger.warn('🔍 DEBUG: account:', account);
            logger.warn('🔍 DEBUG: Skipping blockchain transaction, continuing with database transaction');
            // Don't return - continue with the purchase without blockchain transaction
          } else if (!blockchainBatchId || !Number.isInteger(Number(blockchainBatchId))) {
            logger.warn('⚠️ Missing or invalid blockchainBatchId for blockchain transaction');
            logger.warn('⚠️ blockchainBatchId:', blockchainBatchId);
            logger.warn('⚠️ Skipping blockchain transaction - batch may not be registered on blockchain yet');
            // Don't return - continue with the purchase without blockchain transaction
          } else {
            logger.debug('🔍 DEBUG: Blockchain transaction addresses:', {
              seller: sellerWalletAddress,
              buyer: account,
              batchId: batchId,
              blockchainBatchId: blockchainBatchId
            });
            
            const blockchainTransaction = await blockchainTransactionManager.recordPurchaseTransaction(
              batchId, // Database UUID (string)
              sellerWalletAddress, // From current seller (Ethereum address)
              account, // To buyer (current wallet address)
              quantity,
              finalTotal,
              Number(blockchainBatchId), // CRITICAL: Actual blockchain batch ID (number) from registration
              'PURCHASE'
            );
            logger.debug('🔍 DEBUG: Blockchain transaction recorded:', blockchainTransaction);
            
            // Generate and upload purchase certificate to the same group
            try {
              logger.debug('🔍 DEBUG: Generating purchase certificate...');
              
              // CRITICAL: Fetch group_id from database to ensure we use the correct group
              // This ensures purchase certificates are added to the same group as harvest certificate
              let groupId = batch.group_id || batch.batches?.group_id;
              
              // If group_id not in batch object, fetch from database
              if (!groupId && batchId) {
                logger.debug('🔍 DEBUG: Group ID not in batch object, fetching from database...');
                try {
                  const { data: batchData, error: batchFetchError } = await supabase
                    .from('batches')
                    .select('group_id')
                    .eq('id', batchId)
                    .single();
                  
                  if (!batchFetchError && batchData?.group_id) {
                    groupId = batchData.group_id;
                    logger.debug('✅ Fetched group_id from database:', groupId);
                  } else {
                    logger.error('❌ Failed to fetch group_id from database:', batchFetchError);
                  }
                } catch (fetchError) {
                  logger.error('❌ Error fetching group_id:', fetchError);
                }
              }
              
              logger.debug('🔍 DEBUG: Group ID lookup:', {
                batchGroupId: batch.group_id,
                batchBatchesGroupId: batch.batches?.group_id,
                finalGroupId: groupId,
                batchId: batchId
              });
              
              if (!groupId) {
                logger.error('❌ CRITICAL: No group ID found for batch! Cannot add purchase certificate to group.');
                logger.error('🔍 DEBUG: Batch object keys:', Object.keys(batch));
                logger.error('🔍 DEBUG: Batch object:', batch);
                logger.error('🔍 DEBUG: Batch ID:', batchId);
                toast({
                  variant: "destructive",
                  title: "Certificate Upload Failed",
                  description: "Could not find group ID for this batch. Purchase completed but certificate not uploaded.",
                });
                // Don't return - continue with purchase even if certificate fails
              } else {
              
              // Resolve seller and buyer names from profile IDs for display
              let sellerName = 'Unknown Seller';
              let buyerName = 'Unknown Buyer';
              
              try {
                if (sellerId) {
                  const { data: sellerProfile } = await supabase
                    .from('profiles')
                    .select('full_name, user_type')
                    .eq('id', sellerId)
                    .single();
                  
                  if (sellerProfile?.full_name) {
                    sellerName = `${sellerProfile.user_type ? sellerProfile.user_type.charAt(0).toUpperCase() + sellerProfile.user_type.slice(1) : ''} - ${sellerProfile.full_name}`.trim();
                    if (sellerName.startsWith(' - ')) sellerName = sellerName.substring(3);
                  }
                }
              } catch (e) {
                logger.warn('Could not resolve seller name:', e);
                sellerName = batch.profiles?.full_name || batch.batches?.profiles?.full_name || 'Unknown Seller';
              }
              
              try {
                if (profile?.id) {
                  const { data: buyerProfile } = await supabase
                    .from('profiles')
                    .select('full_name, user_type')
                    .eq('id', profile.id)
                    .single();
                  
                  if (buyerProfile?.full_name) {
                    buyerName = `${buyerProfile.user_type ? buyerProfile.user_type.charAt(0).toUpperCase() + buyerProfile.user_type.slice(1) : ''} - ${buyerProfile.full_name}`.trim();
                    if (buyerName.startsWith(' - ')) buyerName = buyerName.substring(3);
                  }
                }
              } catch (e) {
                logger.warn('Could not resolve buyer name:', e);
                buyerName = profile?.full_name || 'Unknown Buyer';
              }
              
              const purchaseData = {
                batchId: batchId.toString(), // Use the validated batch ID
                from: sellerId || 'Unknown Seller', // Store seller ID (UUID) for proper resolution
                to: profile?.id || 'Unknown Buyer', // Store buyer ID (UUID) for proper resolution
                quantity: quantity,
                pricePerKg: Math.round(finalTotal / quantity),
                timestamp: new Date().toISOString(),
                sellerName: sellerName, // Store resolved name for display
                buyerName: buyerName // Store resolved name for display
              };
              
              logger.debug('Purchase data', { purchaseData, groupId, sellerId, sellerName, buyerId: profile?.id, buyerName });
              
              const purchaseCertificateResult = await ipfsManager.uploadPurchaseCertificate(
                sanitizeString(groupId, 100),
                {
                  batchId: sanitizeString(purchaseData.batchId, 100),
                  from: sanitizeString(sellerId || '', 255),
                  to: sanitizeString(profile?.id || '', 255),
                  quantity: purchaseData.quantity,
                  pricePerKg: purchaseData.pricePerKg,
                  timestamp: purchaseData.timestamp,
                  sellerName: sanitizeString(sellerName, 255),
                  buyerName: sanitizeString(buyerName, 255)
                }
              );
              
                if (purchaseCertificateResult) {
                  logger.debug('Purchase certificate uploaded', { groupId, ipfsHash: purchaseCertificateResult.ipfsHash });
                  
                  // Note: storeFileReference is automatically called by uploadFileToGroup
                  // So the transaction is already stored in group_files table
                  toast({
                    title: "Purchase Certificate Added",
                    description: `Purchase certificate added to group ${groupId.substring(0, 8)}... for complete traceability.`,
                  });
                } else {
                  logger.error('❌ CRITICAL: Purchase certificate upload failed!');
                  logger.error('❌ Group ID:', groupId);
                  logger.error('❌ Batch ID:', batchId);
                  
                  // Even if certificate upload failed, store transaction record in group_files for traceability
                  if (groupId) {
                    try {
                      const groupFileData = {
                        group_id: groupId,
                        file_name: `purchase_transaction_${batchId}_${Date.now()}.json`,
                        ipfs_hash: '', // No certificate hash if upload failed
                        file_size: 0,
                        transaction_type: transactionType,
                        batch_id: batchId,
                        metadata: JSON.stringify({
                          keyvalues: {
                            batchId: batchId.toString(),
                            transactionType: transactionType,
                            from: sellerId,
                            to: profile?.id,
                            quantity: quantity.toString(),
                            price: finalTotal.toString(),
                            timestamp: new Date().toISOString(),
                            farmerName: sellerName,
                            buyerName: buyerName,
                            fromId: sellerId,
                            toId: profile?.id,
                            pricePerKg: Math.round(finalTotal / quantity).toString(),
                            certificateUploadFailed: true
                          }
                        }),
                        created_at: new Date().toISOString()
                      };
                      
                      const { error: groupFileError } = await supabase
                        .from('group_files')
                        .insert(groupFileData);
                      
                      if (groupFileError) {
                        logger.error('❌ Failed to store purchase transaction in group_files:', groupFileError);
                      } else {
                        logger.debug('✅ Purchase transaction stored in group_files (without certificate)');
                      }
                    } catch (groupFileErr) {
                      logger.error('❌ Error storing purchase transaction in group_files:', groupFileErr);
                    }
                  }
                  
                  toast({
                    variant: "destructive",
                    title: "Certificate Upload Failed",
                    description: "Purchase completed but certificate upload failed. Transaction recorded in database.",
                  });
                }
              }
              
              // Update transaction record with IPFS hash and blockchain hash if available
              if (transactionResult?.id || transactionResult?.transaction_id) {
                try {
                  interface TransactionUpdateData {
                    ipfs_hash?: string;
                    blockchain_hash?: string;
                  }
                  const updateData: TransactionUpdateData = {};
                  if (purchaseCertificateResult?.ipfsHash) {
                    updateData.ipfs_hash = purchaseCertificateResult.ipfsHash;
                  }
                  if (blockchainTransaction?.transactionHash) {
                    updateData.blockchain_hash = blockchainTransaction.transactionHash;
                  }
                  
                  if (Object.keys(updateData).length > 0) {
                    const updateField = transactionResult.id ? 'id' : 'transaction_id';
                    const updateValue = transactionResult.id || transactionResult.transaction_id;
                    
                    await supabase
                      .from('transactions')
                      .update(updateData)
                      .eq(updateField, updateValue);
                    
                    logger.debug('✅ Transaction record updated with IPFS and blockchain hashes');
                  }
                } catch (updateError) {
                  logger.warn('⚠️ Failed to update transaction record:', updateError);
                }
              }
              
              // Generate QR code for the purchase transaction
              // Use transactionResult.id if available, otherwise use a generated ID
              const transactionIdForQR = transactionResult?.id || 
                                        transactionResult?.transaction_id || 
                                        `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              
              if (transactionIdForQR) {
              try {
                const { generateTransactionReceiptQR } = await import('@/features/qr-code/utils/qrCodeGenerator');
                const qrCodeDataURL = await generateTransactionReceiptQR({
                    transactionId: transactionIdForQR,
                    batchId: batchId.toString(),
                  from: batch.profiles?.full_name || 'Unknown Seller',
                  to: profile?.full_name || 'Unknown Buyer',
                  quantity: quantity,
                  price: finalTotal,
                  timestamp: new Date().toISOString(),
                    ipfsHash: purchaseCertificateResult?.ipfsHash || undefined,
                    blockchainHash: blockchainTransaction?.transactionHash || undefined
                });
                
                logger.debug('✅ QR code generated for purchase transaction');
                
                // Store QR code in localStorage for later access
                  localStorage.setItem(`purchase_qr_${transactionIdForQR}`, qrCodeDataURL);
              } catch (qrError) {
                logger.error('❌ QR code generation failed:', qrError);
                // Continue even if QR code generation fails
                }
              } else {
                logger.warn('⚠️ Skipping QR code generation: no transaction ID available');
              }
            } catch (certError) {
              logger.error('❌ Purchase certificate generation failed:', certError);
              logger.warn('⚠️ Purchase will continue without certificate');
              // Continue even if certificate generation fails - don't throw
            }
          }
        } catch (blockchainError) {
          logger.error('🔍 DEBUG: Blockchain transaction failed:', blockchainError);
          // Continue even if blockchain fails
        }
      }

      // Create delivery request
      try {
        const { createDeliveryRequest } = await import('@/features/truck-pooling/services/deliveryService');
        
        // Get seller's location
        let sourceLocation = { lat: 0, lng: 0, address: 'Unknown', ownerId: sellerId || '' };
        if (sellerId) {
          try {
            const { data: sellerProfile } = await supabase
              .from('profiles')
              .select('farm_location, id')
              .eq('id', sellerId)
              .single();
            
            if (sellerProfile?.farm_location) {
              // Try to parse location if it's JSON, otherwise use as address
              try {
                const parsed = JSON.parse(sellerProfile.farm_location);
                sourceLocation = {
                  lat: parsed.lat || 0,
                  lng: parsed.lng || 0,
                  address: parsed.address || sellerProfile.farm_location,
                  ownerId: sellerId,
                };
              } catch {
                sourceLocation = {
                  lat: 0,
                  lng: 0,
                  address: sellerProfile.farm_location,
                  ownerId: sellerId,
                };
              }
            }
          } catch (error) {
            logger.warn('Could not fetch seller location:', error);
          }
        }

        // Get buyer's delivery address
        const destinationLocation = {
          lat: 0, // Will be geocoded later
          lng: 0,
          address: address,
          ownerId: profile?.id || '',
        };

        // Get batch details for harvest date and freshness
        const { data: batchDetails } = await supabase
          .from('batches')
          .select('harvest_date, freshness_duration')
          .eq('id', batchId)
          .single();

        if (batchDetails) {
          await createDeliveryRequest({
            transactionId: transactionResult?.id,
            batchId: batchId,
            sourceLocation,
            destinationLocation,
            quantityKg: quantity,
            harvestDate: batchDetails.harvest_date,
            freshnessDuration: batchDetails.freshness_duration || 7,
          });
          logger.debug('✅ Delivery request created');
        }
      } catch (deliveryError) {
        logger.warn('⚠️ Failed to create delivery request:', deliveryError);
        // Don't fail the purchase if delivery request creation fails
      }

      onPurchaseComplete();
      onClose();
      toast({
        title: "Purchase Successful!",
        description: `Your order for ${quantity}kg of ${batch.batches?.crop_type || 'crop'} has been placed. The item is now in your inventory.`,
      });
    } catch (error) {
      logger.error('Purchase error:', error);
      toast({
        variant: "destructive",
        title: "Purchase Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred during purchase.",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Purchase {batch.batches?.crop_type || 'Crop'}
          </DialogTitle>
          <DialogDescription>
            Complete your purchase of {batch.batches?.crop_type || 'Crop'} - {batch.batches?.variety || 'Variety'}
          </DialogDescription>
        </DialogHeader>

        <PurchaseForm 
          batch={batch} 
          onPurchase={handlePurchase} 
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};

// Separate component for the form to avoid hooks issues
const PurchaseForm: React.FC<{
  batch: Record<string, unknown> & {
    crop_type?: string;
    variety?: string;
    quantity?: number;
    price_per_kg?: number;
    batches?: Record<string, unknown> & { crop_type?: string; variety?: string };
  };
  onPurchase: (quantity: number, address: string) => void;
  onClose: () => void;
}> = ({ batch, onPurchase, onClose }) => {
  const [quantity, setQuantity] = React.useState(1);
  const [address, setAddress] = React.useState('');

  const unitPrice = batch.price_per_kg;
  const totalPrice = quantity * unitPrice;
  const deliveryFee = totalPrice > 1000 ? 0 : 50;
  const finalTotal = totalPrice + deliveryFee;

  return (
    <div className="space-y-6">
      {/* Product Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Product Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-500">Crop Type</Label>
              <p className="font-medium">{batch.crop_type}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Variety</Label>
              <p className="font-medium">{batch.variety}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Available Quantity</Label>
              <p className="font-medium">{batch.quantity} kg</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Price per kg</Label>
              <p className="font-medium text-green-600">₹{batch.price_per_kg}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quantity & Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Quantity & Pricing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="quantity">Quantity (kg)</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={batch.quantity}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Available: {batch.quantity} kg
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal ({quantity}kg × ₹{unitPrice}):</span>
              <span>₹{totalPrice}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee:</span>
              <span>{deliveryFee === 0 ? 'Free' : `₹${deliveryFee}`}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total:</span>
              <span className="text-green-600">₹{finalTotal}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Delivery Address
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="address">Full Address</Label>
            <Input
              id="address"
              placeholder="Enter your complete delivery address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button 
          onClick={() => onPurchase(quantity, address)}
          disabled={!address.trim()}
          className="flex-1"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Purchase Now
        </Button>
      </div>
    </div>
  );
};
