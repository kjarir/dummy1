import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePendingDeliveryRequests, useDriverActiveDeliveries, useDriverDeliveryHistory } from '@/features/truck-pooling/hooks/useDeliveryRequests';
import { useDriverNotifications } from '@/features/truck-pooling/hooks/useDriverNotifications';
import { acceptDeliveryRequest, startDelivery } from '@/features/truck-pooling/services/deliveryService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Truck, 
  Package, 
  MapPin, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Navigation,
  Bell
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { DeliveryDetailsModal } from '@/features/truck-pooling/components/DeliveryDetailsModal';
import { TruckPoolingModal } from '@/features/truck-pooling/components/TruckPoolingModal';
import { DeliveryRequest, getDeliveryCapacityInfo, getDeliveryBatches } from '@/features/truck-pooling/services/deliveryService';

export const DriverDashboard = () => {
  const { profile } = useAuth();
  const { deliveries: pendingDeliveries, loading: pendingLoading, refresh: refreshPending } = usePendingDeliveryRequests();
  const { deliveries: activeDeliveries, loading: activeLoading, refresh: refreshActive } = useDriverActiveDeliveries();

  // Load capacity info and batches for active deliveries
  useEffect(() => {
    if (activeDeliveries.length > 0 && profile?.vehicle_capacity_kg) {
      const loadData = async () => {
        for (const delivery of activeDeliveries) {
          const info = await getDeliveryCapacityInfo(delivery.id, profile.vehicle_capacity_kg);
          setCapacityInfo(prev => ({ ...prev, [delivery.id]: info }));
          
          // Load batches to check if it's a pooled delivery
          const batches = await getDeliveryBatches(delivery.id);
          console.log(`📦 Loaded ${batches.length} batches for delivery ${delivery.id}:`, batches);
          setDeliveryBatches(prev => ({ ...prev, [delivery.id]: batches }));
        }
      };
      loadData();
    }
  }, [activeDeliveries, profile?.vehicle_capacity_kg]);
  const { deliveries: historyDeliveries, loading: historyLoading } = useDriverDeliveryHistory();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useDriverNotifications();
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [poolingModalOpen, setPoolingModalOpen] = useState(false);
  const [selectedDeliveryForPooling, setSelectedDeliveryForPooling] = useState<string | null>(null);
  const [capacityInfo, setCapacityInfo] = useState<Record<string, { used: number; available: number; percentage: number }>>({});
  const [deliveryBatches, setDeliveryBatches] = useState<Record<string, any[]>>({});

  const handleAcceptDelivery = async (deliveryId: string) => {
    if (!profile?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Driver profile not found",
      });
      return;
    }

    try {
      await acceptDeliveryRequest(deliveryId, profile.id);
      toast({
        title: "Success",
        description: "Delivery request accepted!",
      });
      refreshPending();
      refreshActive();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to accept delivery request",
      });
    }
  };

  const handleStartDelivery = async (deliveryId: string) => {
    try {
      await startDelivery(deliveryId);
      toast({
        title: "Success",
        description: "Delivery started!",
      });
      refreshActive();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to start delivery",
      });
    }
  };

  const openDeliveryDetails = (delivery: DeliveryRequest) => {
    setSelectedDelivery(delivery);
    setIsModalOpen(true);
  };

  const openTruckPooling = async (deliveryId: string) => {
    setSelectedDeliveryForPooling(deliveryId);
    setPoolingModalOpen(true);
    
    // Load capacity info
    if (profile?.vehicle_capacity_kg) {
      const info = await getDeliveryCapacityInfo(deliveryId, profile.vehicle_capacity_kg);
      setCapacityInfo(prev => ({ ...prev, [deliveryId]: info }));
    }
  };

  const handleBatchAdded = async () => {
    if (selectedDeliveryForPooling && profile?.vehicle_capacity_kg) {
      const info = await getDeliveryCapacityInfo(selectedDeliveryForPooling, profile.vehicle_capacity_kg);
      setCapacityInfo(prev => ({ ...prev, [selectedDeliveryForPooling]: info }));
    }
    refreshActive();
  };

  const getUrgencyColor = (score: number) => {
    if (score >= 9) return 'bg-red-500 text-white';
    if (score >= 7) return 'bg-orange-500 text-white';
    if (score >= 5) return 'bg-yellow-500 text-white';
    return 'bg-green-500 text-white';
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

  const formatDistance = (source: any, destination: any) => {
    // Calculate approximate distance (simplified)
    if (source?.lat && destination?.lat) {
      const R = 6371; // Earth radius in km
      const dLat = (destination.lat - source.lat) * Math.PI / 180;
      const dLon = (destination.lng - source.lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(source.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;
      return `${distance.toFixed(1)} km`;
    }
    return 'Distance not available';
  };

  if (!profile || profile.user_type !== 'driver') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You need to be a driver to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Truck className="h-8 w-8 text-primary" />
              Driver Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your deliveries and track your earnings
            </p>
          </div>
          
          {/* Notification Bell */}
          <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    variant="destructive"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    Mark all as read
                  </Button>
                )}
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No notifications
                  </p>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors ${
                        !notification.is_read ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                      onClick={() => {
                        if (!notification.is_read) {
                          markAsRead(notification.id);
                        }
                        if (notification.delivery_request_id) {
                          // Find and open delivery details
                          const delivery = pendingDeliveries.find(
                            d => d.id === notification.delivery_request_id
                          );
                          if (delivery) {
                            openDeliveryDetails(delivery);
                            setNotificationsOpen(false);
                          }
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <div className="h-2 w-2 rounded-full bg-blue-500 ml-2 mt-1" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingDeliveries.length}</div>
            <p className="text-xs text-muted-foreground">Available for acceptance</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Deliveries</CardTitle>
            <Navigation className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDeliveries.length}</div>
            <p className="text-xs text-muted-foreground">Currently in progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{historyDeliveries.length}</div>
            <p className="text-xs text-muted-foreground">Completed deliveries</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Requests ({pendingDeliveries.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active Deliveries ({activeDeliveries.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            History ({historyDeliveries.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : pendingDeliveries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No pending delivery requests</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingDeliveries.map((delivery) => (
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
                      <Badge className={getUrgencyColor(delivery.urgency_score)}>
                        Urgency: {delivery.urgency_score}/10
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
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {delivery.delivery_deadline 
                            ? new Date(delivery.delivery_deadline).toLocaleDateString()
                            : 'No deadline'}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          ₹{delivery.delivery_fee?.toFixed(2) || '0.00'}
                        </div>
                        <div className="text-xs">
                          {formatDistance(delivery.source_location, delivery.destination_location)}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeliveryDetails(delivery)}
                        >
                          View Details
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAcceptDelivery(delivery.id)}
                          className="flex-1"
                        >
                          Accept Delivery
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {activeLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : activeDeliveries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Navigation className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No active deliveries</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeDeliveries.map((delivery) => (
                <Card key={delivery.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">
                            {delivery.batches?.crop_type || 'Unknown'} - {delivery.batches?.variety || 'N/A'}
                          </CardTitle>
                          {deliveryBatches[delivery.id] && deliveryBatches[delivery.id].length > 1 && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              <Package className="h-3 w-3 mr-1" />
                              {deliveryBatches[delivery.id].length} Batches Pooled
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="mt-1">
                          {delivery.quantity_kg} kg
                          {deliveryBatches[delivery.id] && deliveryBatches[delivery.id].length > 1 && (
                            <span className="ml-2 text-blue-600">
                              ({deliveryBatches[delivery.id].map((b: any) => `${b.crop_type} (${b.quantity_kg}kg)`).join(', ')})
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <Badge variant={delivery.status === 'in_transit' ? 'default' : 'secondary'}>
                        {delivery.status === 'accepted' ? 'Accepted' : 'In Transit'}
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
                      {/* Truck Pooling Info */}
                      <div className="pt-2 pb-2 border-t space-y-2">
                        {profile?.vehicle_capacity_kg && capacityInfo[delivery.id] && (
                          <>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Truck className="h-3 w-3" />
                                Truck Capacity
                              </span>
                              <span className="font-medium">
                                {capacityInfo[delivery.id].used.toFixed(1)} / {profile.vehicle_capacity_kg} kg
                                ({capacityInfo[delivery.id].percentage.toFixed(0)}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div
                                className={`h-2.5 rounded-full transition-all ${
                                  capacityInfo[delivery.id].percentage >= 90 ? 'bg-red-500' :
                                  capacityInfo[delivery.id].percentage >= 70 ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(capacityInfo[delivery.id].percentage, 100)}%` }}
                              />
                            </div>
                            {capacityInfo[delivery.id].available > 0 && (
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-green-600 font-medium">
                                  ✓ {capacityInfo[delivery.id].available.toFixed(1)} kg available for truck pooling
                                </p>
                                {delivery.status === 'accepted' && (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                    Pool Available
                                  </Badge>
                                )}
                              </div>
                            )}
                            {capacityInfo[delivery.id].available <= 0 && delivery.status === 'accepted' && (
                              <p className="text-xs text-muted-foreground">
                                Truck at full capacity
                              </p>
                            )}
                          </>
                        )}
                        
                        {/* Show pooled batches - Always show if batches are loaded */}
                        {deliveryBatches[delivery.id] && deliveryBatches[delivery.id].length > 0 && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {deliveryBatches[delivery.id].length > 1 
                                ? `🚚 ${deliveryBatches[delivery.id].length} Batches Pooled` 
                                : '📦 Batch Details'}
                            </p>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                              {deliveryBatches[delivery.id].map((batch: any, idx: number) => (
                                <div key={`${batch.batch_id}-${idx}`} className={`flex items-center justify-between text-xs p-2 rounded border ${
                                  batch.is_main ? 'bg-blue-100 border-blue-300' : 'bg-green-50 border-green-200'
                                }`}>
                                  <span className="flex items-center gap-2 flex-1">
                                    <span className="font-semibold">
                                      {idx + 1}. {batch.crop_type || 'Unknown'} - {batch.variety || 'N/A'}
                                    </span>
                                    <span className="text-muted-foreground">({batch.quantity_kg}kg)</span>
                                    {batch.is_main && (
                                      <Badge variant="outline" className="text-xs bg-blue-200 text-blue-800 border-blue-300">
                                        Main
                                      </Badge>
                                    )}
                                    {!batch.is_main && (
                                      <Badge variant="outline" className="text-xs bg-green-200 text-green-800">
                                        Pooled
                                      </Badge>
                                    )}
                                  </span>
                                  {batch.owner_contribution_percentage && (
                                    <span className="text-muted-foreground font-medium ml-2">
                                      {batch.owner_contribution_percentage.toFixed(1)}%
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                            {deliveryBatches[delivery.id].length > 1 && (
                              <p className="text-xs text-blue-600 mt-2 font-medium">
                                ✓ All {deliveryBatches[delivery.id].length} batches will be delivered together
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeliveryDetails(delivery)}
                        >
                          View Details
                        </Button>
                        {delivery.status === 'accepted' && capacityInfo[delivery.id]?.available > 0 && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openTruckPooling(delivery.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Package className="h-4 w-4 mr-1" />
                            Add Batch (Pool)
                          </Button>
                        )}
                        {delivery.status === 'accepted' && (
                          <Button
                            size="sm"
                            onClick={() => handleStartDelivery(delivery.id)}
                            className="flex-1"
                          >
                            Start Delivery
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : historyDeliveries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No delivery history</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {historyDeliveries.map((delivery) => (
                <Card key={delivery.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {delivery.batches?.crop_type || 'Unknown'} - {delivery.batches?.variety || 'N/A'}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Delivered on {delivery.delivered_at 
                            ? new Date(delivery.delivered_at).toLocaleDateString()
                            : 'N/A'}
                        </CardDescription>
                      </div>
                      <Badge variant={delivery.delivered_on_time ? 'default' : 'destructive'}>
                        {delivery.delivered_on_time ? 'On Time' : 'Late'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          ₹{delivery.delivery_fee?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeliveryDetails(delivery)}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {selectedDelivery && (
        <DeliveryDetailsModal
          delivery={selectedDelivery}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedDelivery(null);
          }}
          onUpdate={() => {
            refreshPending();
            refreshActive();
          }}
        />
      )}

      {selectedDeliveryForPooling && (
        <TruckPoolingModal
          deliveryId={selectedDeliveryForPooling}
          isOpen={poolingModalOpen}
          onClose={() => {
            setPoolingModalOpen(false);
            setSelectedDeliveryForPooling(null);
          }}
          onBatchAdded={handleBatchAdded}
        />
      )}
    </div>
  );
};

