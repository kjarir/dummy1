import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Package, MapPin, DollarSign, AlertCircle, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { findCompatibleBatches, addBatchToDelivery, getDeliveryCapacityInfo } from '@/features/truck-pooling/services/deliveryService';
import { useAuth } from '@/contexts/AuthContext';

interface TruckPoolingModalProps {
  deliveryId: string;
  isOpen: boolean;
  onClose: () => void;
  onBatchAdded: () => void;
}

export const TruckPoolingModal: React.FC<TruckPoolingModalProps> = ({
  deliveryId,
  isOpen,
  onClose,
  onBatchAdded,
}) => {
  const { profile } = useAuth();
  const [compatibleBatches, setCompatibleBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingBatch, setAddingBatch] = useState<string | null>(null);
  const [capacityInfo, setCapacityInfo] = useState({ used: 0, available: 0, percentage: 0 });

  const driverCapacity = profile?.vehicle_capacity_kg || 0;

  useEffect(() => {
    if (isOpen && deliveryId && driverCapacity > 0) {
      loadCompatibleBatches();
      loadCapacityInfo();
    }
  }, [isOpen, deliveryId, driverCapacity]);

  const loadCompatibleBatches = async () => {
    setLoading(true);
    try {
      const batches = await findCompatibleBatches(deliveryId, driverCapacity);
      setCompatibleBatches(batches);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load compatible batches",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCapacityInfo = async () => {
    try {
      const info = await getDeliveryCapacityInfo(deliveryId, driverCapacity);
      setCapacityInfo(info);
    } catch (error) {
      console.error('Error loading capacity info:', error);
    }
  };

  const handleAddBatch = async (batchDeliveryId: string) => {
    if (!profile?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Driver profile not found",
      });
      return;
    }

    setAddingBatch(batchDeliveryId);
    try {
      await addBatchToDelivery(deliveryId, batchDeliveryId, profile.id);
      toast({
        title: "Success",
        description: "Batch added to delivery successfully!",
      });
      await loadCompatibleBatches();
      await loadCapacityInfo();
      onBatchAdded();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add batch",
      });
    } finally {
      setAddingBatch(null);
    }
  };

  const formatAddress = (location: any) => {
    if (typeof location === 'string') {
      try {
        const parsed = JSON.parse(location);
        return parsed.address || 'Address not available';
      } catch {
        return location;
      }
    }
    return location?.address || 'Address not available';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Truck Pooling - Add Compatible Batches
          </DialogTitle>
          <DialogDescription>
            Find and add batches going to the same destination to maximize your truck capacity
          </DialogDescription>
        </DialogHeader>

        {/* Capacity Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Truck Capacity</span>
                <span className="text-sm font-bold">{driverCapacity} kg</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Used</span>
                <span className="text-sm font-bold">{capacityInfo.used.toFixed(1)} kg</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Available</span>
                <span className={`text-sm font-bold ${capacityInfo.available > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {capacityInfo.available.toFixed(1)} kg
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                <div
                  className={`h-2.5 rounded-full ${
                    capacityInfo.percentage >= 90 ? 'bg-red-500' :
                    capacityInfo.percentage >= 70 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(capacityInfo.percentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-1">
                {capacityInfo.percentage.toFixed(1)}% capacity used
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Compatible Batches */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Compatible Batches (Same Destination)</h3>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : compatibleBatches.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No compatible batches found going to the same destination
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {compatibleBatches.map((batch) => {
                const canAdd = batch.quantity_kg <= capacityInfo.available;
                
                return (
                  <Card key={batch.delivery_id} className={!canAdd ? 'opacity-50' : ''}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">
                              {batch.crop_type} - {batch.variety}
                            </h4>
                            <Badge variant={batch.urgency_score >= 8 ? 'destructive' : 'secondary'}>
                              Urgency: {batch.urgency_score}/10
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Package className="h-4 w-4" />
                            <span>{batch.quantity_kg} kg</span>
                          </div>
                          
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{formatAddress(batch.source_location)}</span>
                          </div>
                          
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            <span>₹{batch.delivery_fee?.toFixed(2) || '0.00'}</span>
                          </div>
                        </div>
                        
                        <Button
                          size="sm"
                          onClick={() => handleAddBatch(batch.delivery_id)}
                          disabled={!canAdd || addingBatch === batch.delivery_id}
                          className="ml-4"
                        >
                          {addingBatch === batch.delivery_id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Add Batch
                            </>
                          )}
                        </Button>
                      </div>
                      
                      {!canAdd && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
                          <AlertCircle className="h-3 w-3" />
                          <span>Exceeds available capacity ({capacityInfo.available.toFixed(1)} kg)</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

