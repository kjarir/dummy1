import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Package, 
  MapPin, 
  Calendar, 
  Award, 
  ShoppingCart,
  Eye,
  Filter,
  Truck
} from 'lucide-react';
import { BatchDetailsModal } from '@/components/BatchDetailsModal';
import { UltraSimplePurchaseModal } from '@/components/UltraSimplePurchaseModal';

export const DistributorMarketplace = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState<any[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    filterBatches();
  }, [batches, searchTerm]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      // Get batches that are owned by distributors (not farmers)
      const { data, error } = await supabase
        .from('batches')
        .select(`
          *,
          profiles!batches_current_owner_fkey(*)
        `)
        .eq('status', 'available')
        .neq('farmer_id', 'current_owner') // Exclude farmer-owned batches
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBatches(data || []);
    } catch (error) {
      console.error('Error fetching distributor batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBatches = () => {
    if (!searchTerm) {
      setFilteredBatches(batches);
      return;
    }

    const filtered = batches.filter(batch =>
      batch.crop_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.variety?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.profiles?.farm_location?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredBatches(filtered);
  };

  const handleBuyNow = (batch: any) => {
    setSelectedBatch(batch);
    setShowPurchaseModal(true);
  };

  const handlePurchaseComplete = () => {
    setShowPurchaseModal(false);
    setSelectedBatch(null);
    fetchBatches(); // Refresh the list
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading distributor marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Truck className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Distributor Marketplace</h1>
            <p className="text-gray-600">Buy quality produce from trusted distributors</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by crop, variety, distributor, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Available Batches</p>
                <p className="text-2xl font-bold">{filteredBatches.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Truck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Distributors</p>
                <p className="text-2xl font-bold">
                  {new Set(filteredBatches.map(b => b.current_owner)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Award className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Quality Score</p>
                <p className="text-2xl font-bold">
                  {filteredBatches.length > 0 
                    ? Math.round(filteredBatches.reduce((sum, b) => sum + (b.quality_score || 0), 0) / filteredBatches.length)
                    : 0
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBatches.map((batch) => (
          <Card key={batch.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{batch.crop_type}</CardTitle>
                  <CardDescription>{batch.variety}</CardDescription>
                </div>
                <Badge variant="secondary">{batch.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Distributor & Location */}
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Truck className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{batch.profiles?.full_name || 'Unknown Distributor'}</span>
                </div>
                <div className="flex items-center text-sm">
                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{batch.profiles?.farm_location || 'Location not specified'}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>Harvested: {new Date(batch.harvest_date).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Quality & Price */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Quality: {batch.quality_score || 'N/A'}</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary">₹{batch.price_per_kg}/kg</div>
                  <div className="text-sm text-muted-foreground">{batch.harvest_quantity} kg available</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => setSelectedBatch(batch)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
                <Button 
                  size="sm" 
                  className="flex-1 gradient-primary"
                  onClick={() => handleBuyNow(batch)}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Buy Now
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredBatches.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No batches found</h3>
          <p className="text-gray-500">
            {searchTerm ? 'Try adjusting your search terms' : 'No distributor batches available at the moment'}
          </p>
        </div>
      )}

      {/* Modals */}
      {selectedBatch && (
        <BatchDetailsModal
          batch={selectedBatch}
          isOpen={!!selectedBatch}
          onClose={() => setSelectedBatch(null)}
          onBuyNow={handleBuyNow}
        />
      )}

      {showPurchaseModal && selectedBatch && (
        <UltraSimplePurchaseModal
          batch={selectedBatch}
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
          onPurchaseComplete={handlePurchaseComplete}
        />
      )}
    </div>
  );
};
