
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tradeAlertSchema, tradeAlertSubmissionSchema, type TradeAlertFormData, type TradeAlertSubmissionData } from "@/lib/validations/tradeAlertSchema";
import { useCallback, useMemo, useRef } from "react";
import { useDebounce } from "./useDebounce";

export interface UseOptimizedTradeAlertFormOptions {
  onSubmit?: (data: TradeAlertSubmissionData) => Promise<void> | void;
  defaultValues?: Partial<TradeAlertFormData>;
  enableSmartValidation?: boolean;
}

export function useOptimizedTradeAlertForm(options: UseOptimizedTradeAlertFormOptions = {}) {
  const {
    onSubmit,
    defaultValues,
    enableSmartValidation = true
  } = options;

  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Create form with minimal validation mode for better performance
  const form = useForm<TradeAlertFormData>({
    resolver: zodResolver(tradeAlertSchema),
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
      ...defaultValues,
    },
    mode: 'onBlur', // Only validate on blur for better performance
  });

  // Debounced form data to prevent excessive re-renders
  const watchedData = form.watch();
  const debouncedFormData = useDebounce(watchedData, 300);

  // Optimized validation with debouncing
  const triggerValidation = useCallback((fieldName?: keyof TradeAlertFormData) => {
    if (!enableSmartValidation) return;

    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    validationTimeoutRef.current = setTimeout(() => {
      if (fieldName) {
        form.trigger(fieldName);
      } else {
        form.trigger();
      }
    }, 500);
  }, [form, enableSmartValidation]);

  // Optimized submission handler
  const handleSubmit = useCallback(async (data: TradeAlertFormData) => {
    if (!onSubmit) return;

    try {
      // Determine status based on trade type
      const isLimitOrder = data.trade_type === 'buy_limit' || data.trade_type === 'sell_limit';
      const submissionData: TradeAlertSubmissionData = {
        ...data,
        status: isLimitOrder ? 'pending' : 'active'
      };

      // Validate submission data
      const validatedData = tradeAlertSubmissionSchema.parse(submissionData);
      
      await onSubmit(validatedData);
    } catch (error) {
      console.error('Form submission error:', error);
      throw error;
    }
  }, [onSubmit]);

  // Memoized form state for performance
  const formState = useMemo(() => ({
    errors: Object.keys(form.formState.errors).map(field => ({
      field,
      message: form.formState.errors[field as keyof TradeAlertFormData]?.message || 'Invalid value'
    })),
    isSubmitting: form.formState.isSubmitting,
    isValid: form.formState.isValid,
    isDirty: form.formState.isDirty,
    hasErrors: Object.keys(form.formState.errors).length > 0
  }), [form.formState]);

  // Utility functions with proper memoization
  const reset = useCallback(() => {
    form.reset();
  }, [form]);

  const setValue = useCallback((
    name: keyof TradeAlertFormData,
    value: TradeAlertFormData[keyof TradeAlertFormData],
    options?: { shouldValidate?: boolean; shouldDirty?: boolean }
  ) => {
    form.setValue(name, value as any, {
      shouldValidate: options?.shouldValidate ?? false, // Don't validate immediately
      shouldDirty: options?.shouldDirty ?? true
    });

    // Trigger debounced validation for better UX
    if (enableSmartValidation && options?.shouldValidate) {
      triggerValidation(name);
    }
  }, [form, enableSmartValidation, triggerValidation]);

  const getFieldError = useCallback((name: keyof TradeAlertFormData): string | undefined => {
    return form.formState.errors[name]?.message;
  }, [form.formState.errors]);

  return {
    // React Hook Form instance
    form,
    
    // Optimized form state
    formState,
    data: debouncedFormData, // Use debounced data
    errors: formState.errors,
    isSubmitting: formState.isSubmitting,
    isValid: formState.isValid,
    isDirty: formState.isDirty,
    hasErrors: formState.hasErrors,

    // Form operations
    handleSubmit: form.handleSubmit(handleSubmit),
    reset,
    setValue,
    
    // Field utilities
    getFieldError,
    triggerValidation,
    
    // Direct form methods for advanced usage
    register: form.register,
    control: form.control,
    watch: form.watch,
    trigger: form.trigger,
  };
}

// Export the form data type for external use
export type { TradeAlertFormData, TradeAlertSubmissionData };
