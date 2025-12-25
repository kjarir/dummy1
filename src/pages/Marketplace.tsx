import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { BatchDetailsModal } from '@/components/BatchDetailsModal';
import { UltraSimplePurchaseModal } from '@/components/UltraSimplePurchaseModal';
import { BatchQuantityDisplay } from '@/components/BatchQuantityDisplay';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuth } from '@/contexts/AuthContext';
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

export const Marketplace = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [farmerCount, setFarmerCount] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  
  // Get user type from profile data (preferred) or user metadata (fallback)
  const userTypeFromProfile = profile?.full_name; // Using full_name as user type indicator
  const userTypeFromMetadata = user?.user_metadata?.user_type;
  
  // Determine user type with priority: profile > metadata > email fallback
  let userType = userTypeFromProfile || userTypeFromMetadata;
  
  if (!userType) {
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
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      
      // Use marketplace table (the main one you want to use)
      const { data: marketplaceData, error: marketplaceError } = await supabase
        .from('marketplace')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (marketplaceError) {
        console.error('Marketplace error:', marketplaceError);
        setBatches([]);
        return;
      }

      console.log('🔍 DEBUG: Raw marketplace data from database:', marketplaceData);
      console.log('🔍 DEBUG: Number of marketplace items found:', marketplaceData?.length || 0);
      
      // If no marketplace data, let's check if there are any batches at all
      if (!marketplaceData || marketplaceData.length === 0) {
        console.log('🔍 DEBUG: No marketplace data found, checking batches table directly...');
        const { data: allBatches, error: allBatchesError } = await supabase
          .from('batches')
          .select('id, crop_type, variety, harvest_date, farmer_id, current_owner, status')
          .limit(10);
        
        console.log('🔍 DEBUG: All batches in database:', allBatches);
        console.log('🔍 DEBUG: All batches error:', allBatchesError);
        
        // Also check marketplace table structure
        const { data: marketplaceCheck, error: marketplaceCheckError } = await supabase
          .from('marketplace')
          .select('*')
          .limit(5);
        
        console.log('🔍 DEBUG: Marketplace table check:', marketplaceCheck);
        console.log('🔍 DEBUG: Marketplace table error:', marketplaceCheckError);
      }
      
      // Debug each item's status
      if (marketplaceData && marketplaceData.length > 0) {
        console.log('🔍 DEBUG: Marketplace items status breakdown:');
        marketplaceData.forEach((item, index) => {
          console.log(`Item ${index}:`, {
            id: item.id,
            batch_id: item.batch_id,
            current_seller_type: item.current_seller_type,
            status: item.status,
            price: item.price
          });
        });
      }

      // Get batches data
      const batchIds = marketplaceData?.map(item => item.batch_id) || [];
      console.log('🔍 DEBUG: Batch IDs extracted:', batchIds);
      const { data: batchesData, error: batchesError } = await supabase
        .from('batches')
        .select('id, crop_type, variety, harvest_date, group_id, farmer_id, current_owner, price_per_kg, harvest_quantity')
        .in('id', batchIds);

      console.log('🔍 DEBUG: Batches data:', batchesData);
      console.log('🔍 DEBUG: Batches error:', batchesError);

      // Get profiles data for sellers
      const sellerIds = marketplaceData?.map(item => item.current_seller_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, farm_location, wallet_address')
        .in('id', sellerIds);

      // Combine the data
      const data = marketplaceData?.map(marketplaceItem => {
        const batch = batchesData?.find(b => b.id === marketplaceItem.batch_id);
        const profile = profilesData?.find(p => p.id === marketplaceItem.current_seller_id);
        
        return {
          id: marketplaceItem.id,
          batch_id: marketplaceItem.batch_id,
          current_seller_id: marketplaceItem.current_seller_id,
          current_seller_type: marketplaceItem.current_seller_type,
          price: marketplaceItem.price,
          quantity: marketplaceItem.quantity,
          status: marketplaceItem.status,
          created_at: marketplaceItem.created_at,
          profiles: profile,
          batches: batch
        };
      }) || [];

      
      console.log(`Found ${data?.length || 0} available items in marketplace:`, data);
      
      // Fetch farmer count - try multiple approaches
      console.log('🔍 DEBUG: Fetching farmer count...');
      
      // Method 1: Count unique farmers from batches (most reliable)
      const uniqueFarmers = new Set(data?.map(item => item.batches?.farmer_id).filter(Boolean));
      console.log('🔍 DEBUG: Unique farmers from batches:', uniqueFarmers.size);
      console.log('🔍 DEBUG: Unique farmer IDs:', Array.from(uniqueFarmers));
      
      // Method 2: Count all profiles (to see total users)
      const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email');
      
      if (!profilesError && allProfiles) {
        console.log('🔍 DEBUG: All profiles in database:', allProfiles);
        console.log('🔍 DEBUG: Total profiles count:', allProfiles.length);
        
        // Method 3: Try to identify farmers by email or other patterns
        const farmersByEmail = allProfiles.filter(profile => 
          profile.email?.includes('farmer') || 
          profile.full_name?.toLowerCase().includes('farmer') ||
          profile.email === 'kjarir23@gmail.com' // Known farmer email
        );
        console.log('🔍 DEBUG: Farmers identified by email/name:', farmersByEmail);
        
        // Use the most reliable count
        const finalCount = Math.max(uniqueFarmers.size, farmersByEmail.length);
        setFarmerCount(finalCount);
        console.log('🔍 DEBUG: Final farmer count:', finalCount);
      } else {
        // Fallback to unique farmers from batches
        setFarmerCount(uniqueFarmers.size);
        console.log('🔍 DEBUG: Using fallback farmer count:', uniqueFarmers.size);
      }
      
      // Filter based on user type
      let filteredData = data || [];
      
      console.log('🔍 DEBUG: User type:', userType);
      console.log('🔍 DEBUG: User ID:', user?.id);
      console.log('🔍 DEBUG: Profile data:', profile);
      console.log('🔍 DEBUG: Profile full_name:', profile?.full_name);
      console.log('🔍 DEBUG: Profile user_type:', profile?.user_type);
      console.log('🔍 DEBUG: All marketplace data before filtering:', data);
      console.log('🔍 DEBUG: Data length before filtering:', data?.length);
      
      if (userType === 'farmer') {
        // Farmers see their own products - need to match with profile ID
        // First get the farmer's profile ID
        const { data: farmerProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user?.id)
          .single();
          
        if (farmerProfile) {
          filteredData = data?.filter(item => 
            item.current_seller_id === farmerProfile.id && 
            item.status === 'available'
          ) || [];
          console.log(`Found ${filteredData.length} farmer batches for farmer:`, filteredData);
        } else {
          console.log('No farmer profile found');
          filteredData = [];
        }
      } else if (userType === 'distributor') {
        // Distributors see products from farmers and retailers (not their own) that are available
        console.log('🔍 DEBUG: Filtering for distributor - checking items:');
        data?.forEach((item, index) => {
          console.log(`Item ${index}:`, {
            current_seller_type: item.current_seller_type,
            status: item.status,
            matches_farmer: item.current_seller_type === 'farmer',
            matches_retailer: item.current_seller_type === 'retailer',
            matches_available: item.status === 'available',
            will_show: (item.current_seller_type === 'farmer' || item.current_seller_type === 'retailer') && item.status === 'available'
          });
        });
        
        filteredData = data?.filter(item => 
          (item.current_seller_type === 'farmer' || item.current_seller_type === 'retailer') && 
          item.status === 'available'
        ) || [];
        console.log(`Found ${filteredData.length} batches available for distributor:`, filteredData);
        
        // If no items found, show all available items for debugging
        if (filteredData.length === 0) {
          console.log('🔍 DEBUG: No farmer/retailer items found, showing all available items for debugging');
          filteredData = data?.filter(item => item.status === 'available') || [];
          console.log(`Found ${filteredData.length} total available items:`, filteredData);
        }
      } else if (userType === 'retailer') {
        // Retailers see products from distributors and farmers that are available
        filteredData = data?.filter(item => 
          (item.current_seller_type === 'distributor' || item.current_seller_type === 'farmer') && 
          item.status === 'available'
        ) || [];
        console.log(`Found ${filteredData.length} batches available for retailer:`, filteredData);
      }
      
      // Final fallback: if no items found with specific filtering, show all available items
      if (filteredData.length === 0 && data && data.length > 0) {
        console.log('🔍 DEBUG: No items found with specific filtering, showing all available items as fallback');
        filteredData = data.filter(item => item.status === 'available');
        console.log(`🔍 DEBUG: Fallback - showing ${filteredData.length} available items:`, filteredData);
      }
      
      console.log('🔍 DEBUG: Final filtered data being set:', filteredData);
      setBatches(filteredData);
    } catch (error) {
      console.error('Error fetching marketplace items:', error);
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
        return 'bg-success text-success-foreground';
      case 'Fresh':
        return 'bg-gradient-to-r from-accent to-accent-light text-accent-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'Available' 
      ? 'bg-success text-success-foreground' 
      : 'bg-warning text-warning-foreground';
  };

  const handleViewDetails = (batch: any) => {
    setSelectedBatch(batch);
    setIsDetailsModalOpen(true);
  };

  const handleBuyNow = (batch: any) => {
    setSelectedBatch(batch);
    setIsPurchaseModalOpen(true);
  };

  const handlePurchaseComplete = () => {
    // Refresh the batches list to update availability
    fetchBatches();
    setIsPurchaseModalOpen(false);
    setSelectedBatch(null);
  };

  const handleVerifyCertificate = (batch: any) => {
    if (batch.blockchain_id || batch.blockchain_batch_id) {
      navigate(`/verify?batchId=${batch.blockchain_id || batch.blockchain_batch_id}`);
    } else {
      toast({
        variant: "destructive",
        title: "No Blockchain ID",
        description: "This batch doesn't have a blockchain ID for verification.",
      });
    }
  };

  const handleViewCertificate = (batch: any) => {
    const ipfsHash = batch.ipfs_hash || batch.ipfs_certificate_hash;
    if (ipfsHash) {
      window.open(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`, '_blank');
    } else {
      toast({
        variant: "destructive",
        title: "No Certificate",
        description: "No certificate available for this batch.",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="container space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl md:text-4xl font-bold">
          {userType === 'farmer' ? 'Your Products' : 
           userType === 'distributor' ? 'Farmer Marketplace' : 
           'Agricultural Marketplace'}
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {userType === 'farmer' ? 
            'Manage and sell your agricultural produce to distributors and retailers.' :
           userType === 'distributor' ? 
            'Browse verified agricultural produce from farmers across Odisha. Every batch comes with complete provenance and quality guarantees.' :
            'Browse verified agricultural produce from farmers across Odisha. Every batch comes with complete provenance and quality guarantees.'}
        </p>
      </div>

      {/* Search & Filters */}
      <Card className="govt-card">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search crops, varieties, or farmers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="grains">Grains & Cereals</SelectItem>
                <SelectItem value="pulses">Pulses & Legumes</SelectItem>
                <SelectItem value="spices">Spices & Herbs</SelectItem>
                <SelectItem value="vegetables">Vegetables</SelectItem>
                <SelectItem value="fruits">Fruits</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Districts</SelectItem>
                <SelectItem value="cuttack">Cuttack</SelectItem>
                <SelectItem value="bhubaneswar">Bhubaneswar</SelectItem>
                <SelectItem value="puri">Puri</SelectItem>
                <SelectItem value="ganjam">Ganjam</SelectItem>
                <SelectItem value="balasore">Balasore</SelectItem>
                <SelectItem value="khorda">Khorda</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="govt-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{batches.length}</div>
            <div className="text-sm text-muted-foreground">Available Batches</div>
          </CardContent>
        </Card>
        <Card className="govt-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{farmerCount}</div>
            <div className="text-sm text-muted-foreground">Active Farmers</div>
          </CardContent>
        </Card>
        <Card className="govt-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">₹2.4L</div>
            <div className="text-sm text-muted-foreground">Total Volume</div>
          </CardContent>
        </Card>
      </div>

        {/* Batch Listings */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No batches available</h3>
              <p className="text-muted-foreground">Check back later for new produce listings.</p>
            </div>
          ) : (
            batches.map((batch) => (
              <Card key={batch.id} className="govt-card hover-lift">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg gradient-primary">
                        <Leaf className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{batch.batches?.crop_type || 'Unknown Crop'}</CardTitle>
                        <CardDescription>{batch.batches?.variety || 'Unknown Variety'}</CardDescription>
                      </div>
                    </div>
                    <Badge className={getCertificationColor(batch.certification || 'Standard')}>
                      {batch.certification || 'Standard'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Seller & Location */}
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{batch.profiles?.full_name || 'Unknown Seller'}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {batch.current_seller_type}
                      </Badge>
                    </div>
                    <div className="flex items-center text-sm">
                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{batch.profiles?.farm_location || 'Location not specified'}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>Harvested: {new Date(batch.batches?.harvest_date || batch.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Total Amount */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Total Amount</span>
                    </div>
                    <div className="text-lg font-bold text-primary">₹{batch.price.toLocaleString()}</div>
                  </div>

                  {/* Price & Quantity */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-primary">₹{Math.round(batch.price / batch.quantity)}</div>
                      <div className="text-sm text-muted-foreground">per kg</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold mb-2">
                        {batch.quantity} kg available
                      </div>
                      <Badge className={getStatusColor(batch.status)}>
                        {batch.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
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
                      disabled={batch.status !== 'available'}
                      onClick={() => handleBuyNow(batch)}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {batch.status === 'available' ? 'Buy Now' : 'Reserved'}
                    </Button>
                  </div>

                  {/* Verification Actions */}
                  <div className="flex space-x-2 mt-2">
                    {(batch.blockchain_id || batch.blockchain_batch_id) && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleVerifyCertificate(batch)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Verify
                      </Button>
                    )}
                    {(batch.ipfs_hash || batch.ipfs_certificate_hash) && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleViewCertificate(batch)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Certificate
                      </Button>
                    )}
                  </div>

                  {/* Batch ID */}
                  <div className="text-xs text-muted-foreground font-mono">
                    ID: {(batch.blockchain_id || batch.blockchain_batch_id) ? 
                      `${batch.blockchain_id || batch.blockchain_batch_id}` : 
                      String(batch.id).substring(0, 8) + '...'
                    }
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Load More */}
        <div className="text-center">
          <Button variant="outline" size="lg">
            Load More Batches
            <TrendingUp className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Batch Details Modal */}
      <BatchDetailsModal
        batch={selectedBatch}
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedBatch(null);
        }}
        onBuyNow={handleBuyNow}
      />

      {/* Purchase Modal */}
      <ErrorBoundary>
        <UltraSimplePurchaseModal
          batch={selectedBatch}
          isOpen={isPurchaseModalOpen}
          onClose={() => {
            setIsPurchaseModalOpen(false);
            setSelectedBatch(null);
          }}
          onPurchaseComplete={handlePurchaseComplete}
        />
      </ErrorBoundary>
    </div>
  );
};