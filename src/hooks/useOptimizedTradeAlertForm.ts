
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useCallback } from 'react';
import { tradeAlertSubmissionSchema, type TradeAlertSubmissionData } from '@/lib/validations/tradeAlertSchema';

interface UseOptimizedTradeAlertFormProps {
  onSubmit: (data: TradeAlertSubmissionData) => Promise<void> | void;
  enableSmartValidation?: boolean;
  initialData?: Partial<TradeAlertSubmissionData>;
}

interface UseOptimizedTradeAlertFormReturn {
  form: ReturnType<typeof useForm<TradeAlertSubmissionData>>;
  handleSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  hasErrors: boolean;
}

export const useOptimizedTradeAlertForm = ({
  onSubmit,
  enableSmartValidation = true,
  initialData
}: UseOptimizedTradeAlertFormProps): UseOptimizedTradeAlertFormReturn => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues = {
    asset_name: '',
    tradermade_symbol: '',
    trade_type: 'buy' as const,
    entry_price: 0,
    stop_loss: 0,
    tp1: undefined,
    tp2: undefined,
    tp3: undefined,
    tp4: undefined,
    tp5: undefined,
    notes: '',
    status: 'active' as const
  };

  const form = useForm<TradeAlertSubmissionData>({
    resolver: zodResolver(tradeAlertSubmissionSchema),
    defaultValues: initialData ? { ...defaultValues, ...initialData } : defaultValues,
    mode: enableSmartValidation ? 'onChange' : 'onSubmit'
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    form.handleSubmit(async (data) => {
      console.log('Form submitting with data:', data);
      console.log('Form validation status:', form.formState.isValid);
      console.log('Form errors:', form.formState.errors);
      
      // Add debugging for each field
      console.log('Field values:', {
        asset_name: data.asset_name,
        tradermade_symbol: data.tradermade_symbol,
        trade_type: data.trade_type,
        entry_price: data.entry_price,
        stop_loss: data.stop_loss,
        tp1: data.tp1,
        notes: data.notes,
        status: data.status
      });
      
      // FIXED: Proper status logic with explicit typing - limit orders start as 'pending', market orders as 'active'
      const tradeType = data.trade_type;
      const correctStatus: 'pending' | 'active' = (tradeType === 'buy_limit' || tradeType === 'sell_limit') ? 'pending' : 'active';
      const normalizedData: TradeAlertSubmissionData = { ...data, status: correctStatus };
      
      console.log('Normalized data with correct status:', normalizedData);
      
      try {
        setIsSubmitting(true);
        await onSubmit(normalizedData);
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    })(e);
  }, [form, onSubmit]);

  const hasErrors = Object.keys(form.formState.errors).length > 0;

  return {
    form,
    handleSubmit,
    isSubmitting,
    hasErrors
  };
};

export type { TradeAlertSubmissionData };
