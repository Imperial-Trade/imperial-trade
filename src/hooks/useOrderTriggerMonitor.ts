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

    // Subscribe to order trigger broadcasts
    const channel = supabase
      .channel('order-triggers')
      .on('broadcast', { event: 'order_triggered' }, ({ payload }) => {
        console.log('📢 Order trigger received:', payload);
        handleOrderTrigger(payload as OrderTriggerPayload);
      })
      .subscribe((status) => {
        console.log('📡 Order trigger subscription status:', status);
      });

    // Request notification permission on first setup
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        console.log('🔔 Notification permission:', permission);
      });
    }

    return () => {
      console.log('🔕 Cleaning up order trigger monitoring');
      supabase.removeChannel(channel);
    };
  }, [userId, handleOrderTrigger]);

  // Manual trigger function for testing/manual activation
  const triggerOrderMonitor = useCallback(async () => {
    try {
      console.log('🚀 Manually triggering order monitor...');
      
      // Get current session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('order-trigger-monitor', {
        headers: session?.access_token ? {
          'Authorization': `Bearer ${session.access_token}`
        } : undefined
      });
      
      if (error) {
        console.error('❌ Error triggering order monitor:', error);
        
        // Only show toast for non-auth errors (5xx server errors)
        if (error.message && !error.message.includes('401') && !error.message.includes('403') && !error.message.includes('Unauthorized')) {
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
      
      // Only show toast for non-auth exceptions
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('401') && !errorMessage.includes('403') && !errorMessage.includes('Unauthorized')) {
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