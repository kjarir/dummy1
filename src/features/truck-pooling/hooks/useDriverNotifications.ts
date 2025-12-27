import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface DriverNotification {
  id: string;
  driver_id: string;
  delivery_request_id?: string;
  notification_type: 'new_delivery' | 'batch_added' | 'status_update' | 'payment_received';
  message: string;
  is_read: boolean;
  created_at: string;
}

export function useDriverNotifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<DriverNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id && profile?.user_type === 'driver') {
      loadNotifications();
      
      // Subscribe to real-time updates
      const subscription = supabase
        .channel('driver_notifications_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'driver_notifications',
            filter: `driver_id=eq.${profile.id}`,
          },
          () => {
            loadNotifications();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [profile?.id, profile?.user_type]);

  const loadNotifications = async () => {
    if (!profile?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('driver_notifications')
        .select('*')
        .eq('driver_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('driver_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!profile?.id) return;
    
    try {
      await supabase
        .from('driver_notifications')
        .update({ is_read: true })
        .eq('driver_id', profile.id)
        .eq('is_read', false);
      
      loadNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    refresh: loadNotifications,
    markAsRead,
    markAllAsRead,
  };
}

