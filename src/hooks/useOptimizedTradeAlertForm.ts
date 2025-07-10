
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useCallback } from 'react';
import { tradeAlertSubmissionSchema, type TradeAlertSubmissionData } from '@/lib/validations/tradeAlertSchema';

interface UseOptimizedTradeAlertFormProps {
  onSubmit: (data: TradeAlertSubmissionData) => Promise<void> | void;
  enableSmartValidation?: boolean;
}

interface UseOptimizedTradeAlertFormReturn {
  form: ReturnType<typeof useForm<TradeAlertSubmissionData>>;
  handleSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  hasErrors: boolean;
}

export const useOptimizedTradeAlertForm = ({
  onSubmit,
  enableSmartValidation = true
}: UseOptimizedTradeAlertFormProps): UseOptimizedTradeAlertFormReturn => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TradeAlertSubmissionData>({
    resolver: zodResolver(tradeAlertSubmissionSchema),
    defaultValues: {
      asset_name: '',
      finnhub_symbol: '',
      trade_type: 'buy',
      entry_price: 0,
      stop_loss: 0,
      tp1: undefined,
      tp2: undefined,
      tp3: undefined,
      tp4: undefined,
      tp5: undefined,
      notes: '',
      status: 'active'
    },
    mode: enableSmartValidation ? 'onChange' : 'onSubmit'
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    form.handleSubmit(async (data) => {
      console.log('Form submitting with data:', data);
      
      try {
        setIsSubmitting(true);
        await onSubmit(data);
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
