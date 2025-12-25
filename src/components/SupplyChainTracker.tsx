import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  User, 
  MapPin, 
  Calendar, 
  Truck, 
  Store, 
  Home,
  CheckCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { findBatchById, parseBuyerInfo } from '@/utils/databaseUtils';

interface SupplyChainStep {
  step: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'completed' | 'current' | 'pending';
  timestamp?: string;
  owner?: string;
  location?: string;
}

interface SupplyChainTrackerProps {
  batchId: string;
}

export const SupplyChainTracker: React.FC<SupplyChainTrackerProps> = ({ batchId }) => {
  const [batch, setBatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [supplyChainSteps, setSupplyChainSteps] = useState<SupplyChainStep[]>([]);

  useEffect(() => {
    fetchBatchData();
  }, [batchId]);

  const fetchBatchData = async () => {
    try {
      const data = await findBatchById(batchId);
      if (data) {
        setBatch(data);
        generateSupplyChainSteps(data);
      }
    } catch (error) {
      console.error('Error fetching batch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSupplyChainSteps = (batchData: any) => {
    const steps: SupplyChainStep[] = [
      {
        step: 'farming',
        title: 'Farming',
        description: 'Crop cultivation and harvesting',
        icon: <Package className="h-5 w-5" />,
        status: 'completed',
        timestamp: batchData.sowing_date,
        owner: batchData.profiles?.full_name || 'Farmer',
        location: batchData.profiles?.farm_location || 'Farm'
      },
      {
        step: 'processing',
        title: 'Processing',
        description: 'Quality grading and certification',
        icon: <CheckCircle className="h-5 w-5" />,
        status: 'completed',
        timestamp: batchData.created_at,
        owner: 'Quality Control',
        location: 'Processing Facility'
      }
    ];

    // Add distribution step if batch is sold
    if (batchData.status === 'sold') {
      // Parse buyer info from grading field
      const buyerInfo = parseBuyerInfo(batchData.grading);
      
      steps.push({
        step: 'distribution',
        title: 'Distribution',
        description: 'Transport to market',
        icon: <Truck className="h-5 w-5" />,
        status: 'completed',
        timestamp: buyerInfo?.purchaseDate,
        owner: 'Distributor',
        location: 'Distribution Center'
      });

      steps.push({
        step: 'retail',
        title: 'Retail',
        description: 'Available for purchase',
        icon: <Store className="h-5 w-5" />,
        status: 'completed',
        timestamp: buyerInfo?.purchaseDate,
        owner: buyerInfo?.buyer || 'Retailer',
        location: buyerInfo?.address || 'Retail Store'
      });

      // Add final delivery step
      steps.push({
        step: 'delivery',
        title: 'Delivery',
        description: 'Delivered to consumer',
        icon: <Home className="h-5 w-5" />,
        status: 'current',
        timestamp: buyerInfo?.purchaseDate,
        owner: buyerInfo?.buyer || 'Consumer',
        location: buyerInfo?.address || 'Consumer Address'
      });
    } else {
      // Batch is still available
      steps.push({
        step: 'retail',
        title: 'Retail',
        description: 'Available for purchase',
        icon: <Store className="h-5 w-5" />,
        status: 'current',
        owner: 'Available',
        location: 'Marketplace'
      });
    }

    setSupplyChainSteps(steps);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'current':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'current':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading supply chain...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!batch) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-muted-foreground">Batch not found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Supply Chain Tracking
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Track the journey of {batch.crop_type} - {batch.variety}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {supplyChainSteps.map((step, index) => (
            <div key={step.step} className="flex items-start gap-4">
              {/* Step Icon */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center ${getStatusColor(step.status)}`}>
                {getStatusIcon(step.status)}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{step.title}</h3>
                  <Badge variant="outline" className={getStatusColor(step.status)}>
                    {step.status}
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground mb-2">
                  {step.description}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                  {step.owner && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{step.owner}</span>
                    </div>
                  )}
                  {step.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{step.location}</span>
                    </div>
                  )}
                  {step.timestamp && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(step.timestamp).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Arrow (except for last step) */}
              {index < supplyChainSteps.length - 1 && (
                <div className="flex-shrink-0 mt-5">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Batch ID:</span>
              <p className="text-muted-foreground">{batch.id}</p>
            </div>
            <div>
              <span className="font-medium">Current Status:</span>
              <p className="text-muted-foreground capitalize">{batch.status}</p>
            </div>
            <div>
              <span className="font-medium">Quantity:</span>
              <p className="text-muted-foreground">{batch.harvest_quantity} kg</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
