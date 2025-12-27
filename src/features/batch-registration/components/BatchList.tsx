import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  ExternalLink, 
  CheckCircle, 
  Calendar,
  DollarSign,
  User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BatchData {
  id: string;
  farmer_id: string;
  crop_type: string;
  variety: string;
  harvest_quantity: number;
  sowing_date: string;
  harvest_date: string;
  price_per_kg: number;
  total_price: number;
  grading: string;
  freshness_duration: number;
  certification: string;
  status: string;
  blockchain_id?: number;
  blockchain_batch_id?: number;
  ipfs_hash?: string;
  ipfs_certificate_hash?: string;
  metadata_ipfs_hash?: string;
  created_at: string;
}

export const BatchList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [batches, setBatches] = useState<BatchData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBatches();
  }, [user]);

  const fetchBatches = async () => {
    if (!user) return;

    try {
      // Get user profile first
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      // Fetch batches for this farmer
      const { data, error } = await (supabase as any)
        .from('batches')
        .select('*')
        .eq('farmer_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBatches(data || []);
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'default';
      case 'sold': return 'secondary';
      case 'transferred': return 'outline';
      default: return 'secondary';
    }
  };

  const getGradingColor = (grading: string) => {
    switch (grading.toLowerCase()) {
      case 'premium': return 'bg-yellow-100 text-yellow-800';
      case 'standard': return 'bg-green-100 text-green-800';
      case 'basic': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading batches...</p>
        </div>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="text-center p-8">
        <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No batches registered</h3>
        <p className="text-muted-foreground mb-4">
          You haven't registered any batches yet. Start by registering your first batch.
        </p>
        <Button onClick={() => navigate('/batch-registration')}>
          Register New Batch
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Your Registered Batches</h2>
          <p className="text-muted-foreground">
            View and manage your agricultural produce batches
          </p>
        </div>
        <Button onClick={() => navigate('/batch-registration')}>
          Register New Batch
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {batches.map((batch) => (
          <Card key={batch.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{batch.crop_type}</CardTitle>
                <Badge variant={getStatusColor(batch.status)}>
                  {batch.status}
                </Badge>
              </div>
              <CardDescription>
                {batch.variety} • {batch.harvest_quantity} kg
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{new Date(batch.harvest_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>₹{batch.total_price}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Badge className={getGradingColor(batch.grading)}>
                  {batch.grading}
                </Badge>
                <Badge variant="outline">
                  {batch.certification}
                </Badge>
              </div>

              {(batch.blockchain_id || batch.blockchain_batch_id) && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Blockchain ID: {batch.blockchain_id || batch.blockchain_batch_id}</span>
                </div>
              )}

              <div className="flex space-x-2">
                {(batch.blockchain_id || batch.blockchain_batch_id) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/verify?batchId=${batch.blockchain_id || batch.blockchain_batch_id}`)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Verify
                  </Button>
                )}
                {(batch.ipfs_hash || batch.ipfs_certificate_hash) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`https://gateway.pinata.cloud/ipfs/${batch.ipfs_hash || batch.ipfs_certificate_hash}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Certificate
                  </Button>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                Registered: {new Date(batch.created_at).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
