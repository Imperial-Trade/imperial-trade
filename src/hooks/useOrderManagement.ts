import { useCallback } from 'react';
import { tradingApiService } from '@/api/services/TradingApiService';
import { useToast } from '@/hooks/use-toast';

export const useOrderManagement = () => {
  const { toast } = useToast();

  const cancelOrder = useCallback(async (orderId: string): Promise<void> => {
    try {
      // Update order to closed status with cancellation reason
      const response = await tradingApiService.updateAlert(orderId, {
        status: 'closed',
        closeReason: 'manual'
      }, 'system'); // Add userId parameter

      if (!response.success) {
        throw new Error(response.error || 'Failed to cancel order');
      }

      console.log('✅ Order cancelled successfully:', orderId);
    } catch (error) {
      console.error('❌ Error cancelling order:', error);
      throw error;
    }
  }, []);

  const modifyOrderPrice = useCallback(async (orderId: string, newPrice: number): Promise<void> => {
    try {
      // For now, this is a placeholder - modifying entry price requires backend support
      console.warn('⚠️ Order modification not yet implemented in backend');
      throw new Error('Order modification feature coming soon');
    } catch (error) {
      console.error('❌ Error modifying order:', error);
      throw error;
    }
  }, []);

  const convertToMarketOrder = useCallback(async (orderId: string): Promise<void> => {
    try {
      // Convert pending limit order to active market order
      const response = await tradingApiService.updateAlert(orderId, {
        status: 'active'
      }, 'system'); // Add userId parameter

      if (!response.success) {
        throw new Error(response.error || 'Failed to convert order');
      }

      toast({
        title: "Order Converted",
        description: "Limit order converted to market order",
      });

      console.log('✅ Order converted to market order:', orderId);
    } catch (error) {
      console.error('❌ Error converting order:', error);
      throw error;
    }
  }, [toast]);

  return {
    cancelOrder,
    modifyOrderPrice,
    convertToMarketOrder,
  };
};