
import { useCallback } from 'react';
import { tradingApiService } from '@/api/services/TradingApiService';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';

export const useOrderManagement = () => {
  const { toast } = useToast();
  const { userId } = useCurrentUser();

  const ensureAuthAndOwnershipContext = () => {
    if (!userId) {
      const err = new Error('You must be signed in to manage orders.');
      toast({
        title: 'Not signed in',
        description: 'Please sign in to modify or cancel orders.',
        variant: 'destructive',
      });
      throw err;
    }
    return userId;
  };

  const cancelOrder = useCallback(async (orderId: string): Promise<void> => {
    console.log('🚫 Cancelling order:', orderId);
    
    const currentUserId = ensureAuthAndOwnershipContext();

    try {
      // ============================================
      // FIX #3: Use RPC function instead of direct update
      // ============================================
      const { data, error } = await supabase.rpc('close_trade_alert', {
        p_alert_id: orderId,
        p_user_id: currentUserId,
        p_close_reason: 'manual'
      });

      if (error) {
        console.error('❌ RPC close_trade_alert failed:', error);
        throw new Error(error.message || 'Failed to cancel order');
      }

      console.log('✅ Order cancelled via RPC:', data);

      // ✅ Dispatch event for instant UI update
      window.dispatchEvent(new CustomEvent('signal-closed-confirmed', {
        detail: {
          signalId: orderId,
          closeReason: 'manual',
          timestamp: new Date().toISOString()
        }
      }));

      toast({
        title: '✅ Order Cancelled',
        description: 'Limit order cancelled successfully'
      });

    } catch (error: any) {
      console.error('💥 Cancel order failed:', error);
      toast({
        title: '❌ Cancellation Failed',
        description: error.message || 'Failed to cancel order',
        variant: 'destructive'
      });
      throw error;
    }
  }, [toast, userId]);

  const modifyOrderPrice = useCallback(async (orderId: string, newPrice: number): Promise<void> => {
    // For now, this is a placeholder - modifying entry price requires backend support
    console.warn('⚠️ Order modification not yet implemented in backend');
    throw new Error('Order modification feature coming soon');
  }, []);

  const convertToMarketOrder = useCallback(async (orderId: string): Promise<void> => {
    const currentUserId = ensureAuthAndOwnershipContext();

    // Convert pending limit order to active market order
    const response = await tradingApiService.updateAlert(
      orderId,
      { status: 'active' },
      currentUserId
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to convert order');
    }

    toast({
      title: 'Order Converted',
      description: 'Limit order converted to market order',
    });

    console.log('✅ Order converted to market order:', orderId);
  }, [toast, userId]);

  return {
    cancelOrder,
    modifyOrderPrice,
    convertToMarketOrder,
  };
};
