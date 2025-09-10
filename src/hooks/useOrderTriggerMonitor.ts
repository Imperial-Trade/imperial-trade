import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OrderTriggerPayload {
  orderId: string;
  userId: string;
  assetName: string;
  tradeType: string;
  entryPrice: number;
  triggeredAt: string;
}

export const useOrderTriggerMonitor = (userId?: string) => {
  const { toast } = useToast();

  const handleOrderTrigger = useCallback((payload: OrderTriggerPayload) => {
    // Only show notification for current user's orders
    if (userId && payload.userId === userId) {
      toast({
        title: "🎯 Limit Order Triggered!",
        description: `Your ${payload.tradeType.replace('_', ' ')} order for ${payload.assetName} at $${payload.entryPrice} is now active`,
        duration: 5000,
      });

      // Optional: Play notification sound
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {
          // Ignore audio errors (user interaction required)
        });
      } catch (error) {
        // Ignore audio errors
      }

      // Optional: Browser notification (requires permission)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Limit Order Triggered', {
          body: `${payload.assetName} ${payload.tradeType.replace('_', ' ')} at $${payload.entryPrice}`,
          icon: '/favicon.ico',
          tag: `order-${payload.orderId}`,
        });
      }
    }
  }, [userId, toast]);

  useEffect(() => {
    if (!userId) return;

    console.log('🔔 Setting up order trigger monitoring for user:', userId);

    const channelId = `orders-${Date.now()}-${Math.random().toString(36).slice(-4)}`;
    
    // Subscribe to order trigger broadcasts
    const channel = supabase
      .channel('order-triggers')
      .on('broadcast', { event: 'order_triggered' }, ({ payload }) => {
        console.log('📢 Order trigger received:', payload);
        handleOrderTrigger(payload as OrderTriggerPayload);
      })
      .subscribe((status) => {
        console.log('📡 Order trigger subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log(`WS-ORDERS: SUBSCRIBE [${channelId}] name=order-triggers`);
        }
      });

    // Request notification permission on first setup
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        console.log('🔔 Notification permission:', permission);
      });
    }

    return () => {
      console.log(`WS-ORDERS: UNSUBSCRIBE [${channelId}]`);
      supabase.removeChannel(channel);
    };
  }, [userId, handleOrderTrigger]);

  // Manual trigger function for testing/manual activation
  const triggerOrderMonitor = useCallback(async () => {
    try {
      console.log('🚀 Manually triggering order monitor...');
      
      // Get current session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      
      // Skip if no session or access token (not authenticated)
      if (!session?.access_token) {
        console.log('⏸️ No session or access token - skipping monitor call');
        return false;
      }
      
      const { data, error } = await supabase.functions.invoke('order-trigger-monitor', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (error) {
        console.error('❌ Error triggering order monitor:', error);
        
        // Only show toast for server errors (5xx), suppress auth errors (4xx)
        const errorMessage = error.message || '';
        const isAuthError = errorMessage.includes('400') || errorMessage.includes('401') || 
                           errorMessage.includes('403') || errorMessage.includes('Unauthorized');
        
        if (!isAuthError) {
          toast({
            title: "Monitor Error",
            description: "Failed to run order monitor",
            variant: "destructive",
          });
        }
        return false;
      }

      console.log('✅ Order monitor completed:', data);
      
      if (data.triggered > 0) {
        toast({
          title: "Orders Processed",
          description: `${data.triggered} limit orders were triggered`,
        });
      }

      return true;
    } catch (error) {
      console.error('💥 Fatal error calling order monitor:', error);
      
      // Only show toast for server errors (5xx), suppress auth errors (4xx)
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isAuthError = errorMessage.includes('400') || errorMessage.includes('401') || 
                         errorMessage.includes('403') || errorMessage.includes('Unauthorized');
      
      if (!isAuthError) {
        toast({
          title: "Monitor Error",
          description: "Failed to run order monitor",
          variant: "destructive",
        });
      }
      return false;
    }
  }, [toast]);

  return {
    triggerOrderMonitor,
  };
};