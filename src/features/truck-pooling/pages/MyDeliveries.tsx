import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserDeliveryRequests } from '@/features/truck-pooling/hooks/useDeliveryRequests';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  MapPin, 
  Clock, 
  DollarSign,
  Loader2,
  CheckCircle,
  Truck
} from 'lucide-react';
import { DeliveryDetailsModal } from '@/features/truck-pooling/components/DeliveryDetailsModal';
import { DeliveryRequest } from '@/features/truck-pooling/services/deliveryService';

export const MyDeliveries = () => {
  const { profile } = useAuth();
  const { deliveries, loading } = useUserDeliveryRequests();
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-500 text-white';
      case 'in_transit':
        return 'bg-blue-500 text-white';
      case 'accepted':
        return 'bg-yellow-500 text-white';
      case 'pending':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const openDeliveryDetails = (delivery: DeliveryRequest) => {
    setSelectedDelivery(delivery);
    setIsModalOpen(true);
  };

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please log in to view your deliveries.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Package className="h-8 w-8 text-primary" />
          My Deliveries
        </h1>
        <p className="text-muted-foreground mt-2">
          Track all your delivery requests
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : deliveries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No deliveries found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {deliveries.map((delivery) => (
            <Card key={delivery.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {delivery.batches?.crop_type || 'Unknown'} - {delivery.batches?.variety || 'N/A'}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {delivery.quantity_kg} kg
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(delivery.status)}>
                    {delivery.status.charAt(0).toUpperCase() + delivery.status.slice(1).replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <div className="flex-1">
                      <div className="text-sm">
                        <span className="font-medium">From:</span> {formatAddress(delivery.source_location)}
                      </div>
                      <div className="text-sm mt-1">
                        <span className="font-medium">To:</span> {formatAddress(delivery.destination_location)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {delivery.assigned_driver_id && (
                      <div className="flex items-center gap-1">
                        <Truck className="h-4 w-4" />
                        <span>Driver assigned</span>
                      </div>
                    )}
                    {delivery.delivery_deadline && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>Deadline: {new Date(delivery.delivery_deadline).toLocaleDateString()}</span>
                      </div>
                    )}
                    {delivery.delivery_fee && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        <span>₹{delivery.delivery_fee.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  {delivery.status === 'delivered' && delivery.delivered_on_time !== undefined && (
                    <Badge variant={delivery.delivered_on_time ? 'default' : 'destructive'}>
                      {delivery.delivered_on_time ? (
                        <><CheckCircle className="h-3 w-3 mr-1" /> Delivered on time</>
                      ) : (
                        <>Delivered late</>
                      )}
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDeliveryDetails(delivery)}
                    className="w-full"
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedDelivery && (
        <DeliveryDetailsModal
          delivery={selectedDelivery}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedDelivery(null);
          }}
          onUpdate={() => {}}
        />
      )}
    </div>
  );
};

