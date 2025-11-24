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
    // ❌ DISABLED: Removed auto-request to prevent native prompt on login
    /*
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        console.log('🔔 Notification permission:', permission);
      });
    }
    */

    return () => {
      console.log(`WS-ORDERS: UNSUBSCRIBE [${channelId}]`);
      supabase.removeChannel(channel);
    };
  }, [userId, handleOrderTrigger]);

  // Manual trigger function for testing/manual activation
  const triggerOrderMonitor = useCallback(async () => {
    if (!userId) return false;

    try {
      console.log('🚀 Manually triggering order monitor...');
      
      const { data, error } = await supabase.functions.invoke('order-trigger-monitor', {
        body: { 
          triggered_by: 'manual_ui_request',
          user_id: userId,
          timestamp: new Date().toISOString()
        }
      });

      if (error) {
        console.error('❌ Error triggering order monitor:', error);
        // Don't show error toast to users - system handles this automatically via CRON
        console.log('ℹ️ Order monitor handled by automated system - manual trigger failed silently');
        return false;
      }

      if (data) {
        console.log('✅ Order monitor response:', data);
        if (data.triggered > 0) {
          toast({
            title: "Order Monitor",
            description: `Processed ${data.processed || 0} orders, activated ${data.triggered || 0}`,
            duration: 3000,
          });
        }
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Exception in order monitor:', error);
      // Silent failure - CRON jobs handle the monitoring automatically
      console.log('ℹ️ Manual trigger failed - automated system continues monitoring');
      return false;
    }
  }, [userId, toast]);

  return {
    triggerOrderMonitor,
  };
};