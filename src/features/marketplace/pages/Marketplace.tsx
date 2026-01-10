import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { BatchDetailsModal } from '@/features/batch-registration/components/BatchDetailsModal';
import { UltraSimplePurchaseModal } from '@/features/purchase/components/UltraSimplePurchaseModal';
import { BatchQuantityDisplay } from '@/features/batch-registration/components/BatchQuantityDisplay';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { sanitizeError, sanitizeString } from '@/lib/security';
import { useDebounce } from '@/hooks/useDebounce';
import { Tables } from '@/integrations/supabase/types';
import { 
  Search, 
  Filter, 
  MapPin, 
  Calendar, 
  Award, 
  Eye, 
  ShoppingCart,
  Leaf,
  Package,
  TrendingUp,
  CheckCircle,
  ExternalLink
} from 'lucide-react';

interface MarketplaceItem {
  id: string;
  batch_id: string;
  current_seller_id: string;
  current_seller_type: string;
  price: number;
  quantity: number;
  status: string;
  created_at: string;
  profiles?: Tables<'profiles'> | null;
  batches?: Tables<'batches'> | null;
}

type BatchItem = MarketplaceItem & {
  crop_type?: string | null;
  variety?: string | null;
  harvest_date?: string | null;
  group_id?: string | null;
  farmer_id?: string | null;
  current_owner?: string | null;
  price_per_kg?: number | null;
  harvest_quantity?: number | null;
  full_name?: string | null;
  farm_location?: string | null;
  wallet_address?: string | null;
};

export const Marketplace = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<BatchItem | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [farmerCount, setFarmerCount] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  
  // Get user type from profile data (preferred) or user metadata (fallback)
  const userTypeFromProfile = profile?.user_type;
  const userTypeFromMetadata = user?.user_metadata?.user_type;
  
  // Determine user type with priority: profile > metadata > email fallback
  let userType = userTypeFromProfile || userTypeFromMetadata;
  
  if (!userType) {
    // Check email to determine user type (legacy fallback - should be removed in production)
    const userEmail = user?.email || '';
    if (userEmail === 'realjarirkhann@gmail.com') {
      userType = 'distributor';
    } else if (userEmail === 'kjarir23@gmail.com') {
      userType = 'farmer';
    } else {
      // Default to farmer for any other users without user_type
      userType = 'farmer';
    }
  }

  // Debounce search term for performance
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      
      // Use marketplace table (the main one you want to use)
      // Filter by status='available' and quantity > 0 at database level
      const { data: marketplaceData, error: marketplaceError } = await supabase
        .from('marketplace')
        .select('*')
        .eq('status', 'available')
        .gt('quantity', 0) // Only get items with quantity > 0
        .order('created_at', { ascending: false })
        .limit(20);

      if (marketplaceError) {
        logger.error('Marketplace query error', marketplaceError);
        setBatches([]);
        return;
      }

      logger.debug('Marketplace data fetched', { count: marketplaceData?.length || 0 });
      
      // Get batches data
      const batchIds = marketplaceData?.map(item => item.batch_id).filter((id): id is string => Boolean(id)) || [];
      
      if (batchIds.length === 0) {
        logger.debug('No batch IDs found in marketplace');
        setBatches([]);
        setFarmerCount(0);
        setLoading(false);
        return;
      }

      const { data: batchesData, error: batchesError } = await supabase
        .from('batches')
        .select('id, crop_type, variety, harvest_date, group_id, farmer_id, current_owner, price_per_kg, harvest_quantity')
        .in('id', batchIds);

      if (batchesError) {
        logger.error('Batches query error', batchesError);
      }

      // Get profiles data for sellers
      const sellerIds = marketplaceData?.map(item => item.current_seller_id).filter((id): id is string => Boolean(id)) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, farm_location, wallet_address')
        .in('id', sellerIds);

      // Combine the data with proper types
      const data: BatchItem[] = (marketplaceData || []).map(marketplaceItem => {
        const batch = batchesData?.find(b => b.id === marketplaceItem.batch_id);
        const profile = profilesData?.find(p => p.id === marketplaceItem.current_seller_id);
        
        return {
          id: marketplaceItem.id || '',
          batch_id: marketplaceItem.batch_id || '',
          current_seller_id: marketplaceItem.current_seller_id || '',
          current_seller_type: marketplaceItem.current_seller_type || 'farmer',
          price: marketplaceItem.price || 0,
          quantity: marketplaceItem.quantity || 0,
          status: marketplaceItem.status || 'available',
          created_at: marketplaceItem.created_at || new Date().toISOString(),
          profiles: profile || null,
          batches: batch || null,
          crop_type: batch?.crop_type || null,
          variety: batch?.variety || null,
          harvest_date: batch?.harvest_date || null,
          group_id: batch?.group_id || null,
          farmer_id: batch?.farmer_id || null,
          current_owner: batch?.current_owner || null,
          price_per_kg: batch?.price_per_kg || null,
          harvest_quantity: batch?.harvest_quantity || null,
          full_name: profile?.full_name || null,
          farm_location: profile?.farm_location || null,
          wallet_address: profile?.wallet_address || null,
        };
      });

      logger.debug('Marketplace items processed', { count: data.length });
      
      // Calculate farmer count (unique farmers)
      const uniqueFarmers = new Set(data.map(item => item.farmer_id).filter((id): id is string => Boolean(id)));
      setFarmerCount(uniqueFarmers.size);
      
      // Filter based on user type
      let filteredData = data || [];
      
      logger.debug('User type filter', { userType, dataCount: data.length });
      
      if (userType === 'farmer') {
        // Farmers see their own products - need to match with profile ID
        // First get the farmer's profile ID
        const { data: farmerProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user?.id)
          .maybeSingle();

        if (farmerProfile?.id) {
          filteredData = data.filter(item => item.farmer_id === farmerProfile.id);
        } else {
          filteredData = [];
        }
      } else if (userType === 'distributor') {
        // Distributors see all farmer products (not their own purchases)
        filteredData = data.filter(item => 
          item.current_seller_type === 'farmer' || item.current_seller_type === 'distributor'
        );
      }
      
      logger.debug('Filtered marketplace data', { userType, count: filteredData.length });
      
      setBatches(filteredData);
    } catch (error) {
      logger.error('Error fetching batches', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load marketplace. Please try again.",
      });
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, [user, profile, userType, toast]);

  // Filter batches based on search and filters
  const filteredBatches = batches.filter(batch => {
    // Search filter (debounced)
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      const matchesSearch = 
        batch.crop_type?.toLowerCase().includes(searchLower) ||
        batch.variety?.toLowerCase().includes(searchLower) ||
        batch.full_name?.toLowerCase().includes(searchLower) ||
        batch.farm_location?.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }
    
    // Category filter
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'crop' && !batch.crop_type) return false;
      // Add more category filters as needed
    }
    
    // Location filter
    if (selectedLocation !== 'all') {
      if (!batch.farm_location?.toLowerCase().includes(selectedLocation.toLowerCase())) {
        return false;
      }
    }
    
    return true;
  });

  const handleViewDetails = (batch: BatchItem) => {
    setSelectedBatch(batch);
    setIsDetailsModalOpen(true);
  };

  const handlePurchase = (batch: BatchItem) => {
    setSelectedBatch(batch);
    setIsPurchaseModalOpen(true);
  };

  const handlePurchaseComplete = () => {
    setIsPurchaseModalOpen(false);
    fetchBatches(); // Refresh marketplace
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Package className="h-12 w-12 animate-pulse mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading marketplace...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Marketplace</h1>
          <p className="text-muted-foreground">
            Discover and purchase agricultural produce directly from farmers and distributors
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Products</p>
                  <p className="text-2xl font-bold">{filteredBatches.length}</p>
                </div>
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Farmers</p>
                  <p className="text-2xl font-bold">{farmerCount}</p>
                </div>
                <Leaf className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Average Price</p>
                  <p className="text-2xl font-bold">
                    ₹{filteredBatches.length > 0 
                      ? Math.round(filteredBatches.reduce((sum, b) => sum + (b.price_per_kg || 0), 0) / filteredBatches.length)
                      : 0}/kg
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by crop, variety, farmer, or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(sanitizeString(e.target.value, 100))}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="crop">Crops</SelectItem>
                  <SelectItem value="vegetables">Vegetables</SelectItem>
                  <SelectItem value="fruits">Fruits</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="odisha">Odisha</SelectItem>
                  <SelectItem value="west bengal">West Bengal</SelectItem>
                  <SelectItem value="bihar">Bihar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {filteredBatches.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Products Found</h3>
              <p className="text-muted-foreground">
                {searchTerm || selectedCategory !== 'all' || selectedLocation !== 'all'
                  ? "Try adjusting your filters"
                  : "No products available in the marketplace at the moment"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBatches.map((batch) => (
              <Card key={batch.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">
                        {batch.crop_type || 'Unknown Crop'}
                      </CardTitle>
                      <CardDescription>{batch.variety || 'Unknown Variety'}</CardDescription>
                    </div>
                    <Badge variant="outline">{batch.current_seller_type || 'farmer'}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <User className="h-4 w-4 mr-2" />
                      <span>{batch.full_name || 'Unknown Farmer'}</span>
                    </div>
                    {batch.farm_location && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span>{sanitizeString(batch.farm_location, 100)}</span>
                      </div>
                    )}
                    {batch.harvest_date && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>{new Date(batch.harvest_date).toLocaleDateString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div>
                        <p className="text-sm text-muted-foreground">Price</p>
                        <p className="text-xl font-bold">₹{batch.price_per_kg || 0}/kg</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Available</p>
                        <p className="text-xl font-bold">{batch.quantity || 0} kg</p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(batch)}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      {userType !== 'farmer' && (
                        <Button
                          size="sm"
                          onClick={() => handlePurchase(batch)}
                          className="flex-1"
                          disabled={!batch.quantity || batch.quantity <= 0}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Buy
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modals */}
        {selectedBatch && (
          <>
            <BatchDetailsModal
              batch={selectedBatch}
              isOpen={isDetailsModalOpen}
              onClose={() => setIsDetailsModalOpen(false)}
            />
            <UltraSimplePurchaseModal
              batch={selectedBatch}
              isOpen={isPurchaseModalOpen}
              onClose={() => setIsPurchaseModalOpen(false)}
              onPurchaseComplete={handlePurchaseComplete}
            />
          </>
        )}
      </div>
    </ErrorBoundary>
  );
};
