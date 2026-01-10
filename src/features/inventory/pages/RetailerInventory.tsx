import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { BatchDetailsModal } from '@/features/batch-registration/components/BatchDetailsModal';
import { 
  Package, 
  MapPin, 
  Calendar, 
  DollarSign,
  CheckCircle,
  Loader2,
  Eye
} from 'lucide-react';

export const RetailerInventory = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchInventory();
    }
  }, [profile]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      
      logger.debug('🔍 DEBUG: Fetching retailer inventory for profile ID:', profile?.id);
      
      // First, get the retailer inventory records
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('retailer_inventory')
        .select('*')
        .eq('retailer_id', profile?.id)
        .order('created_at', { ascending: false });

      if (inventoryError) {
        logger.error('❌ Error fetching retailer inventory:', inventoryError);
        setInventory([]);
        return;
      }

      logger.debug('🔍 DEBUG: Raw retailer inventory data:', inventoryData);

      if (!inventoryData || inventoryData.length === 0) {
        logger.debug('🔍 DEBUG: No inventory records found');
        setInventory([]);
        return;
      }

      // Get marketplace IDs from inventory records
      const marketplaceIds = inventoryData.map(item => item.marketplace_id);
      logger.debug('🔍 DEBUG: Marketplace IDs:', marketplaceIds);

      // Fetch marketplace data
      const { data: marketplaceData, error: marketplaceError } = await supabase
        .from('marketplace')
        .select('*')
        .in('id', marketplaceIds);

      if (marketplaceError) {
        logger.error('❌ Error fetching marketplace data:', marketplaceError);
        setInventory([]);
        return;
      }

      logger.debug('🔍 DEBUG: Marketplace data:', marketplaceData);

      // Get batch IDs from marketplace data
      const batchIds = marketplaceData?.map(item => item.batch_id) || [];
      logger.debug('🔍 DEBUG: Batch IDs:', batchIds);

      // Fetch batch data
      const { data: batchData, error: batchError } = await supabase
        .from('batches')
        .select('*')
        .in('id', batchIds);

      if (batchError) {
        logger.error('❌ Error fetching batch data:', batchError);
        setInventory([]);
        return;
      }

      logger.debug('🔍 DEBUG: Batch data:', batchData);

      // Get transactions to find who the retailer bought FROM (not current seller)
      // We need to find the PURCHASE/RETAIL transaction where retailer is the buyer
      const { data: purchaseTransactions, error: transactionError } = await supabase
        .from('transactions')
        .select('*')
        .eq('to_address', profile?.id) // Retailer is the buyer
        .in('type', ['PURCHASE', 'RETAIL'])
        .in('batch_id', batchIds);

      logger.debug('🔍 DEBUG: Purchase transactions for retailer:', purchaseTransactions);

      // Get seller IDs from transactions (who they bought FROM)
      const sellerIds = purchaseTransactions?.map(tx => tx.from_address).filter(Boolean) || [];
      
      // Also get current owner from batch (should be retailer after purchase)
      const currentOwnerIds = batchData?.map(b => b.current_owner).filter(Boolean) || [];
      const allProfileIds = [...new Set([...sellerIds, ...currentOwnerIds])];
      
      logger.debug('🔍 DEBUG: Seller IDs from transactions:', sellerIds);
      logger.debug('🔍 DEBUG: Current owner IDs from batches:', currentOwnerIds);
      logger.debug('🔍 DEBUG: All profile IDs to fetch:', allProfileIds);

      // Fetch seller profiles
      const { data: sellerProfiles, error: sellerError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', allProfileIds.length > 0 ? allProfileIds : ['00000000-0000-0000-0000-000000000000']); // Dummy ID if empty

      if (sellerError) {
        logger.error('❌ Error fetching seller profiles:', sellerError);
        // Don't fail, just continue without seller profiles
      }

      logger.debug('🔍 DEBUG: Seller profiles:', sellerProfiles);

      // Combine the data
      const combinedData = inventoryData.map(inventoryItem => {
        const marketplaceItem = marketplaceData?.find(m => m.id === inventoryItem.marketplace_id);
        const batchItem = batchData?.find(b => b.id === marketplaceItem?.batch_id);
        
        // Find the transaction where retailer bought this batch
        const purchaseTransaction = purchaseTransactions?.find(
          tx => tx.batch_id === batchItem?.id && tx.to_address === profile?.id
        );
        
        // Get seller profile from transaction (who they bought FROM)
        const sellerProfile = purchaseTransaction 
          ? sellerProfiles?.find(s => s.id === purchaseTransaction.from_address)
          : sellerProfiles?.find(s => s.id === marketplaceItem?.current_seller_id); // Fallback
        
        // Get current owner profile (should be retailer)
        const currentOwnerProfile = batchItem?.current_owner 
          ? sellerProfiles?.find(s => s.id === batchItem.current_owner)
          : null;

        return {
          ...inventoryItem,
          marketplace: marketplaceItem,
          batch: {
            ...batchItem,
            current_owner_profile: currentOwnerProfile // Add current owner profile
          },
          seller: sellerProfile // This is who they bought FROM
        };
      });

      logger.debug('🔍 DEBUG: Combined inventory data:', combinedData);
      setInventory(combinedData || []);
    } catch (error) {
      logger.error('❌ Error fetching inventory:', error);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (item: any) => {
    try {
      // ALWAYS fetch current owner from batch's current_owner field (source of truth)
      let currentOwnerProfile = null;
      if (item.batch?.current_owner) {
        try {
          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('id, full_name, farm_location, user_type')
            .eq('id', item.batch.current_owner)
            .single();
          
          currentOwnerProfile = ownerProfile;
          logger.debug('🔍 DEBUG: Fetched current owner profile:', currentOwnerProfile);
        } catch (ownerError) {
          logger.warn('Could not fetch current owner profile:', ownerError);
        }
      }
      
      // Structure data the same way Marketplace does - with nested batches structure
      // This ensures consistent UI rendering across all pages
      const batchData = {
        ...item.marketplace, // Marketplace fields (price, quantity, status, etc.)
        batches: {
          ...item.batch,
          profiles: currentOwnerProfile || item.batch?.current_owner_profile || item.seller, // ALWAYS use current owner from batch
          current_owner_profile: currentOwnerProfile || item.batch?.current_owner_profile, // Current owner (retailer)
        },
        profiles: currentOwnerProfile || item.batch?.current_owner_profile || item.seller, // ALWAYS use current owner
      };
      
      logger.debug('🔍 DEBUG: Batch data for modal:', batchData);
      logger.debug('🔍 DEBUG: Current owner ID:', item.batch?.current_owner);
      logger.debug('🔍 DEBUG: Current owner profile:', currentOwnerProfile);
      
      setSelectedBatch(batchData);
      setIsDetailsModalOpen(true);
    } catch (error) {
      logger.error('Error preparing batch details:', error);
      // Fallback
    const batchData = {
        ...item.marketplace,
        batches: {
      ...item.batch,
      profiles: item.seller,
        },
        profiles: item.seller,
    };
    setSelectedBatch(batchData);
    setIsDetailsModalOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Retailer Inventory</h1>
          <p className="text-muted-foreground">
            View your purchased agricultural produce with complete traceability
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{inventory.length}</div>
              <div className="text-sm text-muted-foreground">Total Items</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                {inventory.reduce((sum, item) => sum + item.quantity_purchased, 0)} kg
              </div>
              <div className="text-sm text-muted-foreground">Total Quantity</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                ₹{inventory.reduce((sum, item) => sum + item.purchase_price, 0).toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total Investment</div>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {inventory.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No inventory items</h3>
              <p className="text-muted-foreground">
                Purchase items from the marketplace to see them here.
              </p>
            </div>
          ) : (
            inventory.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{item.batch?.crop_type || 'Unknown Crop'}</CardTitle>
                      <CardDescription>{item.batch?.variety || 'Unknown Variety'}</CardDescription>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Final Purchase</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Supply Chain Info */}
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>From: {item.seller?.full_name || 'Unknown Seller'}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{item.seller?.farm_location || 'Location not specified'}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>Purchased: {new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Quantity & Price */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Quantity:</span>
                      <span className="font-medium">{item.quantity_purchased} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Purchase Price:</span>
                      <span className="font-medium text-green-600">₹{item.purchase_price}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Price per kg:</span>
                      <span className="font-medium">₹{item.batch?.price_per_kg || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Quality Score */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Quality Score:</span>
                    <Badge variant="secondary">{item.batch?.quality_score || 0}/100</Badge>
                  </div>

                  {/* Supply Chain Traceability */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Supply Chain Traceability</h4>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Original Farmer ID:</span>
                        <span className="font-mono">{item.batch?.farmer_id?.substring(0, 8)}...</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Harvest Date:</span>
                        <span>{item.batch?.harvest_date ? new Date(item.batch.harvest_date).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleViewDetails(item)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      disabled
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Final Purchase
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Batch Details Modal */}
      <BatchDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        batch={selectedBatch}
      />
    </div>
  );
};

export default RetailerInventory;