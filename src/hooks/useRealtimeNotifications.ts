import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Real-time notification listener hook
 * Subscribes to user-specific notifications and displays them instantly
 */
export function useRealtimeNotifications(userId: string | undefined) {
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    console.log('🔔 [Notifications] Subscribing to real-time notifications for user:', userId);

    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const notification = payload.new as any;
          
          console.log('🔔 [Notification] Received:', notification);
          
          // Show toast notification
          toast({
            title: notification.title || 'New Notification',
            description: notification.message,
            variant: notification.priority === 'high' ? 'destructive' : 'default'
          });
          
          // Play sound for high-priority notifications
          if (notification.priority === 'high') {
            try {
              const audio = new Audio('/notification-sound.mp3');
              audio.volume = 0.5;
              audio.play().catch(err => 
                console.error('Failed to play notification sound:', err)
              );
            } catch (error) {
              console.error('Failed to create audio:', error);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`🔔 [Notifications] Subscription status: ${status}`);
      });

    return () => {
      console.log('🔔 [Notifications] Unsubscribing from notifications');
      supabase.removeChannel(channel);
    };
  }, [userId, toast]);
}
