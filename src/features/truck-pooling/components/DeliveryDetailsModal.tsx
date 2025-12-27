import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  Package, 
  Truck,
  CheckCircle,
  AlertCircle,
  Camera,
  Navigation,
  Loader2
} from 'lucide-react';
import { DeliveryRequest, completeDelivery, getDeliveryBatches } from '@/features/truck-pooling/services/deliveryService';
import { toast } from '@/hooks/use-toast';
import { DeliveryMap } from './DeliveryMap';

interface DeliveryDetailsModalProps {
  delivery: DeliveryRequest;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const DeliveryDetailsModal: React.FC<DeliveryDetailsModalProps> = ({
  delivery,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const [podPhotos, setPodPhotos] = useState<string[]>([]);
  const [podSignature, setPodSignature] = useState<string>('');
  const [deliveryBatches, setDeliveryBatches] = useState<any[]>([]);

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

  const getLocationCoords = (location: any) => {
    if (typeof location === 'string') {
      try {
        const parsed = JSON.parse(location);
        return { lat: parsed.lat, lng: parsed.lng };
      } catch {
        return null;
      }
    }
    return location ? { lat: location.lat, lng: location.lng } : null;
  };

  const handleCompleteDelivery = async () => {
    if (delivery.status !== 'in_transit') {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Delivery must be in transit to complete",
      });
      return;
    }

    setIsCompleting(true);
    try {
      // Get current location for POD
      let currentLocation = null;
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            currentLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
          },
          () => {
            // Use destination location as fallback
            currentLocation = getLocationCoords(delivery.destination_location);
          }
        );
      } else {
        currentLocation = getLocationCoords(delivery.destination_location);
      }

      await completeDelivery(delivery.id, {
        signature: podSignature || 'Digital Signature',
        photos: podPhotos,
        location: currentLocation || getLocationCoords(delivery.destination_location),
      });

      toast({
        title: "Success",
        description: "Delivery completed successfully!",
      });
      onUpdate();
      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to complete delivery",
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const handlePhotoCapture = () => {
    // In a real implementation, this would use camera API
    // For now, we'll simulate it
    const photoUrl = `data:image/jpeg;base64,simulated_photo_${Date.now()}`;
    setPodPhotos([...podPhotos, photoUrl]);
    toast({
      title: "Photo captured",
      description: "Photo added to proof of delivery",
    });
  };

  const sourceCoords = getLocationCoords(delivery.source_location);
  const destCoords = getLocationCoords(delivery.destination_location);
  const sourceAddress = formatAddress(delivery.source_location);
  const destAddress = formatAddress(delivery.destination_location);

  // Load delivery batches on mount
  useEffect(() => {
    const loadBatches = async () => {
      const batches = await getDeliveryBatches(delivery.id);
      setDeliveryBatches(batches);
    };
    if (isOpen) {
      loadBatches();
    }
  }, [delivery.id, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Delivery Details
          </DialogTitle>
          <DialogDescription>
            Track and manage your delivery
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Badge variant={
              delivery.status === 'delivered' ? 'default' :
              delivery.status === 'in_transit' ? 'secondary' :
              delivery.status === 'accepted' ? 'outline' :
              'destructive'
            }>
              {delivery.status.charAt(0).toUpperCase() + delivery.status.slice(1).replace('_', ' ')}
            </Badge>
            {delivery.urgency_score >= 8 && (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Urgent
              </Badge>
            )}
          </div>

          {/* Map */}
          {sourceCoords && destCoords && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="h-5 w-5" />
                  Route Map
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DeliveryMap
                  source={{ ...sourceCoords, address: sourceAddress }}
                  destination={{ ...destCoords, address: destAddress }}
                  driverLocation={delivery.status === 'in_transit' ? sourceCoords : null}
                />
              </CardContent>
            </Card>
          )}

          {/* Delivery Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Source Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{formatAddress(delivery.source_location)}</p>
                {sourceCoords && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {sourceCoords.lat.toFixed(4)}, {sourceCoords.lng.toFixed(4)}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Destination Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{formatAddress(delivery.destination_location)}</p>
                {destCoords && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {destCoords.lat.toFixed(4)}, {destCoords.lng.toFixed(4)}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Batch Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {deliveryBatches.length > 1 ? 'Pooled Batches' : 'Batch Information'}
                </CardTitle>
                {deliveryBatches.length > 1 && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    <Package className="h-3 w-3 mr-1" />
                    {deliveryBatches.length} Batches Pooled
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {deliveryBatches.length > 1 ? (
                <div className="space-y-3">
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-3">
                    <p className="text-sm font-semibold text-blue-900">
                      🚚 Truck Pooling Active: {deliveryBatches.length} batches combined in one delivery
                    </p>
                  </div>
                  {deliveryBatches.map((batch: any, idx: number) => (
                    <Card key={batch.batch_id || idx} className={batch.is_main ? 'bg-blue-50 border-blue-200 border-2' : 'border-blue-100'}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-base">
                                {batch.crop_type || 'Unknown'} - {batch.variety || 'N/A'}
                              </span>
                              {batch.is_main && (
                                <Badge variant="outline" className="text-xs bg-blue-200 text-blue-800 border-blue-300">
                                  Main Batch
                                </Badge>
                              )}
                              {!batch.is_main && (
                                <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
                                  Pooled
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Quantity: <span className="font-semibold">{batch.quantity_kg} kg</span>
                            </p>
                          </div>
                          {batch.owner_contribution_percentage && (
                            <div className="text-right">
                              <Badge variant="secondary" className="text-xs mb-1 block">
                                {batch.owner_contribution_percentage.toFixed(1)}% of fee
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                ₹{((delivery.delivery_fee || 0) * (batch.owner_contribution_percentage / 100)).toFixed(2)}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <div className="pt-3 border-t-2 border-blue-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-muted-foreground">Total Pooled Quantity:</span>
                      <span className="text-lg font-bold text-blue-700">{delivery.quantity_kg} kg</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm font-semibold text-muted-foreground">Total Delivery Fee:</span>
                      <span className="text-lg font-bold text-green-700">₹{delivery.delivery_fee?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Crop Type:</span>
                    <span className="text-sm font-medium">{delivery.batches?.crop_type || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Variety:</span>
                    <span className="text-sm font-medium">{delivery.batches?.variety || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Quantity:</span>
                    <span className="text-sm font-medium">{delivery.quantity_kg} kg</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Delivery Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Deadline</span>
                </div>
                <p className="text-lg font-bold">
                  {delivery.delivery_deadline 
                    ? new Date(delivery.delivery_deadline).toLocaleDateString()
                    : 'No deadline'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Delivery Fee</span>
                </div>
                <p className="text-lg font-bold">₹{delivery.delivery_fee?.toFixed(2) || '0.00'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Urgency Score</span>
                </div>
                <p className="text-lg font-bold">{delivery.urgency_score}/10</p>
              </CardContent>
            </Card>
          </div>

          {/* Proof of Delivery Section */}
          {delivery.status === 'in_transit' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Proof of Delivery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Delivery Photos</label>
                  <div className="flex gap-2 flex-wrap">
                    {podPhotos.map((photo, index) => (
                      <div key={index} className="relative w-24 h-24 border rounded">
                        <img src={photo} alt={`POD ${index + 1}`} className="w-full h-full object-cover rounded" />
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePhotoCapture}
                      className="w-24 h-24 flex flex-col items-center justify-center"
                    >
                      <Camera className="h-6 w-6 mb-1" />
                      <span className="text-xs">Add Photo</span>
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={handleCompleteDelivery}
                  disabled={isCompleting}
                  className="w-full"
                >
                  {isCompleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark as Delivered
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Completed Delivery Info */}
          {delivery.status === 'delivered' && delivery.pod_photos && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Delivery Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Delivered at:</span>{' '}
                    {delivery.pod_timestamp 
                      ? new Date(delivery.pod_timestamp).toLocaleString()
                      : 'N/A'}
                  </p>
                  {delivery.delivered_on_time !== undefined && (
                    <Badge variant={delivery.delivered_on_time ? 'default' : 'destructive'}>
                      {delivery.delivered_on_time ? 'On Time' : 'Delivered Late'}
                    </Badge>
                  )}
                  {delivery.pod_photos && delivery.pod_photos.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Proof of Delivery Photos:</p>
                      <div className="flex gap-2 flex-wrap">
                        {delivery.pod_photos.map((photo: string, index: number) => (
                          <div key={index} className="relative w-24 h-24 border rounded">
                            <img src={photo} alt={`POD ${index + 1}`} className="w-full h-full object-cover rounded" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

