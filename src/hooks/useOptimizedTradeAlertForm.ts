
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

export interface TradeAlertSubmissionData {
  asset_name: string;
  tradermade_symbol: string;
  trade_type: 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
  entry_price: number;
  stop_loss: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  tp4?: number;
  tp5?: number;
  notes?: string;
  // Remove status from interface since it's now determined by the database trigger
}

export const useOptimizedTradeAlertForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (
    data: TradeAlertSubmissionData,
    onSubmit: (data: TradeAlertSubmissionData) => Promise<void>
  ) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      
      // Log the trade type for debugging
      console.log(`🔧 Form Submission: ${data.trade_type} order for ${data.asset_name}`);
      console.log('📋 Form Data:', {
        asset_name: data.asset_name,
        trade_type: data.trade_type,
        entry_price: data.entry_price,
        stop_loss: data.stop_loss,
        // Note: Status will be determined by database trigger
      });
      
      // No longer need to set status here - the database trigger handles it
      // The trigger will force limit orders to 'pending' and allow market orders as 'active'
      
      await onSubmit(data);
      
      const orderTypeText = data.trade_type.replace('_', ' ').toUpperCase();
      toast({
        title: "Educational Pattern Created!",
        description: `${data.asset_name} ${orderTypeText} pattern has been created successfully.`,
      });
      
    } catch (error: any) {
      console.error('Form submission error:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to create educational pattern. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    handleSubmit,
    isSubmitting
  };
};
