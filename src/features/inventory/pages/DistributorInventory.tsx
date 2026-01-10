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
  ShoppingCart,
  Eye,
  Loader2
} from 'lucide-react';

export const DistributorInventory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, [user]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      
      // Get the distributor's profile ID
      logger.debug('🔍 DEBUG: Looking up profile for user ID:', user?.id);
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (profileError) {
        logger.error('❌ Profile lookup error:', profileError);
        setInventory([]);
        return;
      }

      if (!profile) {
        logger.debug('❌ No profile found for distributor');
        setInventory([]);
        return;
      }

      logger.debug('🔍 DEBUG: Found profile:', profile);

      logger.debug('🔍 DEBUG: Fetching inventory for distributor profile ID:', profile.id);
      
      const { data, error } = await supabase
        .from('distributor_inventory')
        .select('*')
        .eq('distributor_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching inventory:', error);
        setInventory([]);
        return;
      }

      logger.debug('🔍 DEBUG: Raw distributor inventory data:', data);

      // Get marketplace data for each inventory item
      const inventoryWithDetails = await Promise.all(
        (data || []).map(async (item) => {
          const { data: marketplaceData } = await supabase
            .from('marketplace')
            .select('*')
            .eq('id', item.marketplace_id)
            .single();

          // Get batch data with all necessary fields (same as Marketplace)
          const { data: batchData } = await supabase
            .from('batches')
            .select('id, crop_type, variety, harvest_date, group_id, farmer_id, current_owner, price_per_kg, harvest_quantity, grading, freshness_duration, certification, status, sowing_date, created_at, blockchain_id, blockchain_batch_id, ipfs_hash, ipfs_certificate_hash, total_price')
            .eq('id', marketplaceData?.batch_id)
            .single();

          // Get seller profile data (the original farmer who sold to distributor)
          const { data: sellerProfile } = await supabase
            .from('profiles')
            .select('id, full_name, farm_location, user_type')
            .eq('id', batchData?.farmer_id)
            .single();

          // ALWAYS get current owner profile from batch's current_owner field (source of truth)
          let currentOwnerProfile = null;
          if (batchData?.current_owner) {
            try {
              const { data: ownerProfile } = await supabase
                .from('profiles')
                .select('id, full_name, farm_location, user_type')
                .eq('id', batchData.current_owner)
                .single();
              currentOwnerProfile = ownerProfile;
              logger.debug('🔍 DEBUG: Current owner profile fetched:', {
                current_owner_id: batchData.current_owner,
                ownerProfile: currentOwnerProfile
              });
            } catch (ownerError) {
              logger.warn('Could not fetch current owner profile:', ownerError);
            }
          }

          logger.debug('🔍 DEBUG: Item data:', {
            item,
            marketplaceData,
            batchData,
            sellerProfile,
            currentOwnerProfile,
            batch_current_owner: batchData?.current_owner
          });

          return {
            ...item,
            marketplace: marketplaceData,
            batch: batchData,
            seller: sellerProfile,
            currentOwner: currentOwnerProfile // This is the ACTUAL current owner from batch.current_owner
          };
        })
      );

      logger.debug('🔍 DEBUG: Inventory with details:', inventoryWithDetails);
      setInventory(inventoryWithDetails);
    } catch (error) {
      logger.error('Error fetching inventory:', error);
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
      
      // Structure data exactly the same way Marketplace does
      // This ensures consistent UI rendering across all pages
      const batchData = {
        id: item.marketplace?.id,
        batch_id: item.marketplace?.batch_id,
        current_seller_id: item.marketplace?.current_seller_id,
        current_seller_type: item.marketplace?.current_seller_type,
        price: item.marketplace?.price,
        quantity: item.marketplace?.quantity,
        status: item.marketplace?.status,
        created_at: item.marketplace?.created_at,
        profiles: currentOwnerProfile || item.currentOwner || item.seller, // ALWAYS use current owner from batch
        batches: {
          ...item.batch,
          // Ensure all fields are present
          crop_type: item.batch?.crop_type,
          variety: item.batch?.variety,
          harvest_date: item.batch?.harvest_date,
          group_id: item.batch?.group_id,
          farmer_id: item.batch?.farmer_id,
          current_owner: item.batch?.current_owner,
          price_per_kg: item.batch?.price_per_kg || item.marketplace?.price / (item.marketplace?.quantity || 1),
          harvest_quantity: item.batch?.harvest_quantity,
          grading: item.batch?.grading,
          freshness_duration: item.batch?.freshness_duration,
          certification: item.batch?.certification,
          status: item.batch?.status,
          sowing_date: item.batch?.sowing_date,
          created_at: item.batch?.created_at,
          blockchain_id: item.batch?.blockchain_id,
          blockchain_batch_id: item.batch?.blockchain_batch_id,
          ipfs_hash: item.batch?.ipfs_hash,
          ipfs_certificate_hash: item.batch?.ipfs_certificate_hash,
          total_price: item.batch?.total_price || (item.batch?.price_per_kg * item.batch?.harvest_quantity),
          profiles: currentOwnerProfile || item.currentOwner || item.seller, // ALWAYS use current owner from batch
          farmerProfile: item.seller, // Original farmer for reference
        }
      };
      
      logger.debug('🔍 DEBUG: Batch data for modal (marketplace structure):', batchData);
      logger.debug('🔍 DEBUG: Current owner ID:', item.batch?.current_owner);
      logger.debug('🔍 DEBUG: Current owner profile:', currentOwnerProfile);
      logger.debug('🔍 DEBUG: Original farmer:', item.batch?.farmer_id);
      
      setSelectedBatch(batchData);
      setIsDetailsModalOpen(true);
    } catch (error) {
      logger.error('Error preparing batch details:', error);
      // Fallback to marketplace structure
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

  const handleAddToMarketplace = async (inventoryItem: any) => {
    try {
      // Get the distributor's profile ID first
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (profileError || !profile) {
        throw new Error('Profile not found');
      }

      logger.debug('🔍 DEBUG: Adding to marketplace with profile ID:', profile.id);
      logger.debug('🔍 DEBUG: Inventory item:', inventoryItem);
      logger.debug('🔍 DEBUG: Marketplace ID:', inventoryItem.marketplace_id);
      logger.debug('🔍 DEBUG: Quantity purchased:', inventoryItem.quantity_purchased);

      // Update the marketplace item to show it's now sold by distributor
      // Also set status to 'available' and ensure quantity matches purchased quantity
      const { error: marketplaceError } = await supabase
        .from('marketplace')
        .update({
          current_seller_id: profile.id, // Use profile.id instead of user?.id
          current_seller_type: 'distributor',
          status: 'available', // Ensure status is 'available'
          quantity: inventoryItem.quantity_purchased || inventoryItem.marketplace?.quantity || 0, // Set quantity to purchased quantity
          updated_at: new Date().toISOString()
        })
        .eq('id', inventoryItem.marketplace_id);

      if (marketplaceError) {
        logger.error('❌ Marketplace update error:', marketplaceError);
        throw new Error(`Failed to add to marketplace: ${marketplaceError.message}`);
      }

      // Also update the batch's current_owner to distributor
      if (inventoryItem.batch?.id) {
        const { error: batchError } = await supabase
          .from('batches')
          .update({
            current_owner: profile.id,
            status: 'available'
          })
          .eq('id', inventoryItem.batch.id);

        if (batchError) {
          logger.warn('⚠️ Failed to update batch ownership:', batchError);
          // Don't throw error, marketplace update succeeded
        } else {
          logger.debug('✅ Batch ownership updated to distributor');
        }
      }

      logger.debug('✅ Successfully added to marketplace');

      toast({
        title: "Added to Marketplace!",
        description: `${inventoryItem.marketplace?.crop_type || 'Item'} is now available for retailers to purchase.`,
      });

      // Refresh inventory
      fetchInventory();
    } catch (error) {
      logger.error('Error adding to marketplace:', error);
      toast({
        variant: "destructive",
        title: "Failed to Add to Marketplace",
        description: error instanceof Error ? error.message : "Please try again.",
      });
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
          <h1 className="text-3xl font-bold mb-2">Distributor Inventory</h1>
          <p className="text-muted-foreground">
            Manage your purchased agricultural produce and make them available to retailers
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
              <div className="text-2xl font-bold text-seco">
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
                      <CardTitle className="text-lg">{item.marketplace.crop_type}</CardTitle>
                      <CardDescription>{item.marketplace.variety}</CardDescription>
                    </div>
                    <Badge variant="outline">Purchased</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Seller Info */}
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>From: {item.seller?.full_name || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{item.seller?.farm_location || 'Location not specified'}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>Purchased: {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Invalid Date'}</span>
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
                      <span className="font-medium">₹{item.purchase_price && item.quantity_purchased ? Math.round(item.purchase_price / item.quantity_purchased) : 'N/A'}</span>
                    </div>
                  </div>

                  {/* Quality Score */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Quality Score:</span>
                    <Badge variant="secondary">{item.marketplace.quality_score || 0}/100</Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleViewDetails(item)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleAddToMarketplace(item)}
                    >
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      Add to Market
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

export default DistributorInventory;