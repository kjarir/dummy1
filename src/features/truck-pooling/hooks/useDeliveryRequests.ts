import { useState, useEffect } from 'react';
import { 
  DeliveryRequest, 
  getPendingDeliveryRequests, 
  getUserDeliveryRequests,
  getDriverActiveDeliveries,
  getDriverDeliveryHistory 
} from '@/features/truck-pooling/services/deliveryService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function usePendingDeliveryRequests() {
  const [deliveries, setDeliveries] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeliveries();
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('delivery_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_requests',
          filter: 'status=eq.pending',
        },
        () => {
          loadDeliveries();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadDeliveries = async () => {
    setLoading(true);
    const data = await getPendingDeliveryRequests();
    setDeliveries(data);
    setLoading(false);
  };

  return { deliveries, loading, refresh: loadDeliveries };
}

export function useUserDeliveryRequests() {
  const { profile } = useAuth();
  const [deliveries, setDeliveries] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      loadDeliveries();
      
      // Subscribe to real-time updates
      const subscription = supabase
        .channel('user_delivery_requests_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'delivery_requests',
          },
          () => {
            loadDeliveries();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [profile?.id]);

  const loadDeliveries = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const data = await getUserDeliveryRequests(profile.id);
    setDeliveries(data);
    setLoading(false);
  };

  return { deliveries, loading, refresh: loadDeliveries };
}

export function useDriverActiveDeliveries() {
  const { profile } = useAuth();
  const [deliveries, setDeliveries] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id && profile?.user_type === 'driver') {
      loadDeliveries();
      
      // Subscribe to real-time updates
      const subscription = supabase
        .channel('driver_active_deliveries_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'delivery_requests',
          },
          () => {
            loadDeliveries();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [profile?.id, profile?.user_type]);

  const loadDeliveries = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const data = await getDriverActiveDeliveries(profile.id);
    setDeliveries(data);
    setLoading(false);
  };

  return { deliveries, loading, refresh: loadDeliveries };
}

export function useDriverDeliveryHistory() {
  const { profile } = useAuth();
  const [deliveries, setDeliveries] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id && profile?.user_type === 'driver') {
      loadDeliveries();
    }
  }, [profile?.id, profile?.user_type]);

  const loadDeliveries = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const data = await getDriverDeliveryHistory(profile.id);
    setDeliveries(data);
    setLoading(false);
  };

  return { deliveries, loading, refresh: loadDeliveries };
}

