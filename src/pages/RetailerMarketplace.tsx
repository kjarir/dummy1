import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Package, ShoppingCart, MapPin, Calendar, Award, Eye, Plus, User, History, FileText, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { UltraSimplePurchaseModal } from '@/components/UltraSimplePurchaseModal';
import { transactionManager } from '@/utils/transactionManager';

interface DistributorBatch {
  id: string;
  crop_type: string;
  variety: string;
  harvest_quantity: number;
  price_per_kg: number;
  harvest_date: string;
  certification_level: string;
  status: string;
  current_owner: string;
  farmer_id: string;
  profiles?: {
    full_name: string;
    farm_location: string;
  };
}

export const RetailerMarketplace = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState<DistributorBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<DistributorBatch | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Get user type from user metadata
  const userTypeFromMetadata = user?.user_metadata?.user_type;
  
  // Temporary fixes for users without user_type set
  let userType = userTypeFromMetadata;
  
  if (!userTypeFromMetadata) {
    // Check email to determine user type
    if (user?.email === 'realjarirkhann@gmail.com') {
      userType = 'distributor';
    } else if (user?.email === 'kjarir23@gmail.com') {
      userType = 'farmer';
    } else {
      // Default to farmer for any other users without user_type
      userType = 'farmer';
    }
  }

  useEffect(() => {
    fetchDistributorBatches();
  }, []);

  const fetchDistributorBatches = async () => {
    try {
      setLoading(true);
      console.log(`🔍 DEBUG: Fetching batches available in distributor-retailer marketplace...`);
      
      // Get batches that are available in distributor-retailer marketplace
      const { data, error } = await supabase
        .from('marketplace')
        .select(`
          *,
          batches!inner(*)
        `)
        .eq('current_seller_type', 'distributor')
        .eq('status', 'available')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Database error:', error);
        setBatches([]);
        return;
      }

      console.log(`Found ${data?.length || 0} batches in distributor-retailer marketplace:`, data);

      // Extract batch data and filter for distributor-owned batches
      let distributorBatches = data?.map(item => item.batches).filter(batch => {
        // Only show batches owned by distributors (not farmers)
        const isDistributorOwned = batch.current_owner && batch.current_owner !== batch.farmer_id;
        console.log(`🔍 DEBUG: Batch ${batch.id} - current_owner: ${batch.current_owner}, farmer_id: ${batch.farmer_id}, isDistributorOwned: ${isDistributorOwned}`);
        return isDistributorOwned;
      }) || [];
      
      console.log(`🔍 DEBUG: Found ${distributorBatches.length} distributor-owned batches after filtering`);
      
      // If user is a distributor, also filter out their own products from the marketplace
      if (userType === 'distributor') {
        distributorBatches = distributorBatches.filter(batch => batch.current_owner !== user?.id);
      }

      console.log(`Found ${distributorBatches.length} distributor-owned batches for retailer marketplace`);

      // Get profiles for the current owners (distributors)
      if (distributorBatches.length > 0) {
        const ownerIds = [...new Set(distributorBatches.map(batch => batch.current_owner).filter(Boolean))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, farm_location')
          .in('id', ownerIds);

        // Merge profile data with batches
        const batchesWithProfiles = distributorBatches.map(batch => ({
          ...batch,
          profiles: profiles?.find(p => p.id === batch.current_owner) || null
        }));

        setBatches(batchesWithProfiles);
      } else {
        setBatches([]);
      }
    } catch (error) {
      console.error('Error fetching distributor batches:', error);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  const getCertificationColor = (level: string) => {
    switch (level) {
      case 'Premium':
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white';
      case 'Organic':
        return 'bg-gradient-to-r from-green-500 to-green-600 text-white';
      case 'Standard':
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const handlePurchase = (batch: DistributorBatch) => {
    setSelectedBatch(batch);
    setShowPurchaseModal(true);
  };

  const handlePurchaseSuccess = () => {
    setShowPurchaseModal(false);
    setSelectedBatch(null);
    // Refresh the marketplace
    fetchDistributorBatches();
  };

  const handleViewDetails = async (batch: DistributorBatch) => {
    setSelectedBatch(batch);
    setShowDetailsModal(true);
    setLoadingHistory(true);
    
    try {
      console.log('🔍 DEBUG: Full batch object:', batch);
      console.log('🔍 DEBUG: Batch keys:', Object.keys(batch));
      console.log('🔍 DEBUG: Batch batch_id:', batch.batch_id);
      console.log('🔍 DEBUG: Batch id:', batch.id);
      console.log('🔍 DEBUG: Batch batches:', batch.batches);
      
      // Try different possible batch ID fields
      const batchId = batch.batch_id || batch.id || batch.batches?.id;
      console.log('🔍 DEBUG: Using batch ID:', batchId);
      
      if (!batchId) {
        console.error('❌ No valid batch ID found');
        setTransactionHistory([]);
        return;
      }
      
      const transactions = await transactionManager.getBatchTransactions(batchId);
      console.log('🔍 DEBUG: Transaction history:', transactions);
      setTransactionHistory(transactions);
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      setTransactionHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">
            {userType === 'distributor' ? 'Distributor Marketplace' : 'Retailer Marketplace'}
          </h1>
          <p className="text-muted-foreground">
            {userType === 'distributor' ? 
              'View what other distributors are selling and manage your own listings' :
              'Buy from distributors and sell to consumers'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to={userType === 'distributor' ? '/distributor-inventory' : '/retailer-inventory'}>
              <Package className="h-4 w-4 mr-2" />
              {userType === 'distributor' ? 'My Inventory' : 'My Inventory'}
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batches.length}</div>
            <p className="text-xs text-muted-foreground">From distributors</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {batches.reduce((sum, batch) => sum + batch.harvest_quantity, 0)} kg
            </div>
            <p className="text-xs text-muted-foreground">Available for purchase</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Price Range</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{batches.length > 0 ? Math.min(...batches.map(b => b.price_per_kg)) : 0} - ₹{batches.length > 0 ? Math.max(...batches.map(b => b.price_per_kg)) : 0}
            </div>
            <p className="text-xs text-muted-foreground">Per kg</p>
          </CardContent>
        </Card>
      </div>

      {/* Products */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading distributor products...</p>
        </div>
      ) : batches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map((batch) => (
            <Card key={batch.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{batch.crop_type}</CardTitle>
                    <CardDescription>{batch.variety}</CardDescription>
                  </div>
                  <Badge className={getCertificationColor(batch.certification_level)}>
                    {batch.certification_level}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{batch.harvest_quantity} kg available</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>From: {batch.profiles?.full_name || 'Distributor'}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>Harvested: {new Date(batch.harvest_date).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">Quality: {batch.certification_level}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">₹{batch.price_per_kg}/kg</div>
                    <div className="text-sm text-muted-foreground">
                      Total: ₹{(batch.price_per_kg * batch.harvest_quantity).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleViewDetails(batch)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1 gradient-primary"
                    onClick={() => handlePurchase(batch)}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Buy Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Available</h3>
          <p className="text-gray-500">No distributor products are available for purchase at the moment.</p>
          <Button asChild className="mt-6">
            <Link to="/dashboard">
              <Package className="h-4 w-4 mr-2" />
              Check Your Inventory
            </Link>
          </Button>
        </div>
      )}

      {/* View Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={() => setShowDetailsModal(false)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold">
                  {selectedBatch?.crop_type} - {selectedBatch?.variety}
                </DialogTitle>
                <DialogDescription>
                  Complete batch information and traceability details
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getCertificationColor(selectedBatch?.certification_level || 'Standard')}>
                  {selectedBatch?.certification_level || 'Standard'}
                </Badge>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {selectedBatch?.status || 'available'}
                </Badge>
              </div>
            </div>
          </DialogHeader>
          
          {selectedBatch && (
            <div className="space-y-6">
              {/* Product Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Product Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">Crop Type:</span>
                      <p className="font-semibold">{selectedBatch.crop_type}</p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Variety:</span>
                      <p className="font-semibold">{selectedBatch.variety}</p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Harvest Quantity:</span>
                      <p className="font-semibold">{selectedBatch.harvest_quantity} kg</p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Grading:</span>
                      <p className="font-semibold">{selectedBatch.certification_level}</p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Freshness Duration:</span>
                      <p className="font-semibold">7 days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">Sowing Date:</span>
                      <p className="font-semibold">{new Date(selectedBatch.harvest_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Harvest Date:</span>
                      <p className="font-semibold">{new Date(selectedBatch.harvest_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Registered:</span>
                      <p className="font-semibold">{new Date(selectedBatch.harvest_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pricing */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Pricing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">Price per kg:</span>
                      <p className="font-semibold text-lg">₹{selectedBatch.price_per_kg}</p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Total Value:</span>
                      <p className="font-semibold text-lg">₹{(selectedBatch.price_per_kg * selectedBatch.harvest_quantity).toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Distributor Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Distributor Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">Distributor Name:</span>
                      <p className="font-semibold">{selectedBatch.profiles?.full_name || 'Distributor'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Location:</span>
                      <p className="font-semibold">{selectedBatch.profiles?.farm_location || 'Unknown Location'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transaction History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Transaction History
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingHistory ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="ml-2 text-sm text-muted-foreground">Loading transaction history...</span>
                    </div>
                  ) : transactionHistory.length > 0 ? (
                    <div className="space-y-3">
                      {transactionHistory.map((transaction, index) => (
                        <div key={index} className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm">
                                {transaction.type === 'HARVEST' ? 'Harvest' : 
                                 transaction.type === 'PURCHASE' ? 'Purchase' : 
                                 transaction.type === 'TRANSFER' ? 'Transfer' : transaction.type}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {new Date(transaction.timestamp).toLocaleDateString()}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div>
                              <span className="font-medium">From:</span> {transaction.fromName || transaction.from}
                            </div>
                            <div>
                              <span className="font-medium">To:</span> {transaction.toName || transaction.to}
                            </div>
                            <div>
                              <span className="font-medium">Quantity:</span> {transaction.quantity} kg
                            </div>
                            <div>
                              <span className="font-medium">Price:</span> ₹{transaction.price || 'N/A'}
                            </div>
                          </div>
                          {transaction.ipfsHash && (
                            <div className="mt-2 flex items-center justify-between">
                              <div className="text-xs text-muted-foreground">
                                <span className="font-medium">Certificate:</span> {transaction.ipfsHash.substring(0, 20)}...
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-xs"
                                onClick={() => {
                                  const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${transaction.ipfsHash}`;
                                  window.open(ipfsUrl, '_blank');
                                }}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No transaction history found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Purchase Modal */}
      {selectedBatch && (
        <UltraSimplePurchaseModal
          batch={selectedBatch}
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
          onPurchaseComplete={handlePurchaseSuccess}
        />
      )}
    </div>
  );
};
