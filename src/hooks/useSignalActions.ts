
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useSignalActions = () => {
  const [isLoading, setIsLoading] = useState(false);

  const closeSignal = async (signalId: string, closeReason: string = 'manual') => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('trade_alerts')
        .update({ 
          status: 'closed',
          close_reason: closeReason,
          updated_at: new Date().toISOString()
        })
        .eq('id', signalId);

      if (error) throw error;

      toast.success('Signal closed successfully', {
        duration: 5000,
        className: 'bg-green-50 border-green-200 text-green-800',
      });
      
      return true;
    } catch (error) {
      console.error('Error closing signal:', error);
      toast.error('Failed to close signal', {
        duration: 5000,
        className: 'bg-red-50 border-red-200 text-red-800',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const cancelOrder = async (signalId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('trade_alerts')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', signalId);

      if (error) throw error;

      toast.success('Order cancelled successfully', {
        duration: 5000,
        className: 'bg-orange-50 border-orange-200 text-orange-800',
      });
      
      return true;
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order', {
        duration: 5000,
        className: 'bg-red-50 border-red-200 text-red-800',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    closeSignal,
    cancelOrder,
    isLoading
  };
};
