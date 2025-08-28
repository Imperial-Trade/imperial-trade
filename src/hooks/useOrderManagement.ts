
import { useCallback } from 'react';
import { TradingApiService } from '@/api/services/TradingApiService';
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
    const currentUserId = ensureAuthAndOwnershipContext();

    // Update order to closed status with cancellation reason
    const response = await TradingApiService.updateAlert(orderId, {
      status: 'closed',
      closeReason: 'manual',
    });

    console.log('✅ Order cancelled successfully:', orderId);
  }, [toast, userId]);

  const modifyOrderPrice = useCallback(async (orderId: string, newPrice: number): Promise<void> => {
    // For now, this is a placeholder - modifying entry price requires backend support
    console.warn('⚠️ Order modification not yet implemented in backend');
    throw new Error('Order modification feature coming soon');
  }, []);

  const convertToMarketOrder = useCallback(async (orderId: string): Promise<void> => {
    const currentUserId = ensureAuthAndOwnershipContext();

    // Convert pending limit order to active market order
    const response = await TradingApiService.updateAlert(orderId, { status: 'active' });

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
