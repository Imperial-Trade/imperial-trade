
import { useCallback } from 'react';
import { tradingApiService } from '@/api/services/TradingApiService';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';

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
    console.log('🚀 [useOrderManagement] cancelOrder called:', { orderId, userId });
    const currentUserId = ensureAuthAndOwnershipContext();

    // Update order to closed status with cancellation reason
    const response = await tradingApiService.updateAlert(
      orderId,
      {
        status: 'closed',
        closeReason: 'manual',
      },
      currentUserId
    );

    if (!response.success) {
      const errorMsg = response.error || 'Failed to cancel order - Unknown error';
      console.error('❌ [useOrderManagement] Cancel order failed:', {
        orderId,
        error: errorMsg,
        response
      });
      throw new Error(errorMsg);
    }

    console.log('✅ [useOrderManagement] Order cancelled successfully:', orderId);
    toast({
      title: 'Order Cancelled',
      description: 'Your limit order has been cancelled successfully',
    });
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
