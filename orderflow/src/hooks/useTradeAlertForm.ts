import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tradeAlertSchema, tradeAlertSubmissionSchema, type TradeAlertFormData, type TradeAlertSubmissionData } from "@/lib/validations/tradeAlertSchema";
import { useCallback, useMemo, useEffect } from "react";

/**
 * @deprecated This hook is deprecated in favor of useOptimizedTradeAlertForm
 * Please migrate to useOptimizedTradeAlertForm for better performance and features
 * This hook will be removed in a future version
 */
export interface UseTradeAlertFormOptions {
  onSubmit?: (data: TradeAlertSubmissionData) => Promise<void> | void;
  defaultValues?: Partial<TradeAlertFormData>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

/**
 * @deprecated Use useOptimizedTradeAlertForm instead
 * This legacy hook provides basic form functionality but lacks performance optimizations
 */
export function useTradeAlertForm(options: UseTradeAlertFormOptions = {}) {
  const {
    onSubmit,
    defaultValues,
    validateOnChange = true,
    validateOnBlur = true
  } = options;

  // Log deprecation warning
  useEffect(() => {
    console.warn(
      '⚠️ useTradeAlertForm is deprecated. Please migrate to useOptimizedTradeAlertForm for better performance.\n' +
      'Benefits: Debounced validation, smart input detection, reduced re-renders'
    );
  }, []);

  // Create form with optimized default values
  const form = useForm<TradeAlertFormData>({
    resolver: zodResolver(tradeAlertSchema),
    defaultValues: {
      asset_name: '',
      tradermade_symbol: '',
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
    mode: validateOnChange ? 'onChange' : (validateOnBlur ? 'onBlur' : 'onSubmit'),
  });

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
    data: form.getValues(),
    errors: Object.keys(form.formState.errors).map(field => ({
      field,
      message: form.formState.errors[field as keyof TradeAlertFormData]?.message || 'Invalid value'
    })),
    isSubmitting: form.formState.isSubmitting,
    isValid: form.formState.isValid,
    isDirty: form.formState.isDirty,
    hasErrors: Object.keys(form.formState.errors).length > 0
  }), [form.formState]);

  // Utility functions
  const reset = useCallback(() => {
    form.reset();
  }, [form]);

  // Simplified setValue with proper typing
  const setValue = useCallback((
    name: keyof TradeAlertFormData,
    value: TradeAlertFormData[keyof TradeAlertFormData],
    options?: { shouldValidate?: boolean; shouldDirty?: boolean }
  ) => {
    form.setValue(name, value as any, {
      shouldValidate: options?.shouldValidate ?? validateOnChange,
      shouldDirty: options?.shouldDirty ?? true
    });
  }, [form, validateOnChange]);

  const getFieldError = useCallback((name: keyof TradeAlertFormData): string | undefined => {
    return form.formState.errors[name]?.message;
  }, [form.formState.errors]);

  const isFieldTouched = useCallback((name: keyof TradeAlertFormData): boolean => {
    return form.formState.touchedFields[name] ?? false;
  }, [form.formState.touchedFields]);

  return {
    // React Hook Form instance
    form,
    
    // Form state
    formState,
    data: form.watch(), // Real-time data updates
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
    isFieldTouched,
    
    // Direct form methods for advanced usage
    register: form.register,
    control: form.control,
    watch: form.watch,
    trigger: form.trigger,
  };
}

// Export the form data type for external use
export type { TradeAlertFormData, TradeAlertSubmissionData };
