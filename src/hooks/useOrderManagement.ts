
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

  const cancelOrder = useCallback(async (orderId: string, closingPrice?: number): Promise<void> => {
    console.log('🚫 Cancelling order:', orderId, 'at price:', closingPrice);
    
    const currentUserId = ensureAuthAndOwnershipContext();

    try {
      // ============================================
      // Call RPC function to close the alert
      // ============================================
      const { data, error } = await supabase.rpc('close_trade_alert', {
        p_alert_id: orderId,
        p_user_id: currentUserId,
        p_close_reason: 'manual',
        p_closing_price: closingPrice || null
      });

      if (error) {
        console.error('❌ RPC close_trade_alert failed:', error);
        
        // ✅ Enhanced error handling
        let errorMessage = error.message || 'Failed to cancel order';
        
        // Check for constraint violation (backward compatibility with old RPC)
        if (errorMessage.includes('limit_orders_start_pending')) {
          errorMessage = 'Unable to cancel pending limit order. Please try again or contact support.';
        }
        
        throw new Error(errorMessage);
      }

      // ✅ Type-safe response handling
      const response = data as any;

      // ✅ Check RPC response success flag
      if (response && response.success === false) {
        console.error('❌ RPC returned error:', response);
        throw new Error(response.error || 'Failed to cancel order');
      }

      console.log('✅ Order cancelled via RPC:', response);

      // ✅ Dispatch event for instant UI update
      window.dispatchEvent(new CustomEvent('signal-closed-confirmed', {
        detail: {
          signalId: orderId,
          closeReason: 'manual',
          wasPending: response?.was_pending || false,
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
