
import { useState, useCallback, useMemo } from 'react';
import { FormError, FormState } from '@/types/components';

export interface FormValidationRule<T = unknown> {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  custom?: (value: T) => string | null;
}

export interface FormFieldConfig<T = unknown> {
  name: string;
  defaultValue?: T;
  validation?: FormValidationRule<T>;
}

export interface TypedFormConfig<T extends Record<string, unknown>> {
  fields: { [K in keyof T]: FormFieldConfig<T[K]> };
  onSubmit?: (data: T) => Promise<void> | void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export function useTypedForm<T extends Record<string, unknown>>(config: TypedFormConfig<T>) {
  const [data, setData] = useState<T>(() => {
    const initialData = {} as T;
    Object.entries(config.fields).forEach(([key, field]) => {
      (initialData as any)[key] = field.defaultValue;
    });
    return initialData;
  });

  const [errors, setErrors] = useState<FormError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const validateField = useCallback((name: string, value: unknown): string | null => {
    const fieldConfig = config.fields[name as keyof T];
    if (!fieldConfig?.validation) return null;

    const rules = fieldConfig.validation;

    // Required validation
    if (rules.required && (value === undefined || value === null || value === '')) {
      return `${name} is required`;
    }

    // Skip other validations if value is empty and not required
    if (!rules.required && (value === undefined || value === null || value === '')) {
      return null;
    }

    // String validations
    if (typeof value === 'string') {
      if (rules.minLength !== undefined && value.length < rules.minLength) {
        return `${name} must be at least ${rules.minLength} characters`;
      }
      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        return `${name} must be no more than ${rules.maxLength} characters`;
      }
      if (rules.pattern && !rules.pattern.test(value)) {
        return `${name} format is invalid`;
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        return `${name} must be at least ${rules.min}`;
      }
      if (rules.max !== undefined && value > rules.max) {
        return `${name} must be no more than ${rules.max}`;
      }
    }

    // Custom validation
    if (rules.custom) {
      return rules.custom(value);
    }

    return null;
  }, [config.fields]);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormError[] = [];

    Object.keys(config.fields).forEach(fieldName => {
      const value = data[fieldName as keyof T];
      const error = validateField(fieldName, value);
      if (error) {
        newErrors.push({ field: fieldName, message: error });
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  }, [data, config.fields, validateField]);

  const setValue = useCallback(<K extends keyof T>(name: K, value: T[K]) => {
    setData(prev => ({ ...prev, [name]: value }));

    if (config.validateOnChange) {
      // Cast to unknown to match validateField signature
      const error = validateField(name as string, value as unknown);
      setErrors(prev => {
        const filtered = prev.filter(e => e.field !== name);
        return error ? [...filtered, { field: name as string, message: error }] : filtered;
      });
    }
  }, [config.validateOnChange, validateField]);

  const setFieldTouched = useCallback((name: string) => {
    setTouched(prev => new Set(prev).add(name));

    if (config.validateOnBlur) {
      const value = data[name as keyof T];
      const error = validateField(name, value as unknown);
      setErrors(prev => {
        const filtered = prev.filter(e => e.field !== name);
        return error ? [...filtered, { field: name, message: error }] : filtered;
      });
    }
  }, [config.validateOnBlur, data, validateField]);

  const getFieldError = useCallback((name: string): string | undefined => {
    return errors.find(e => e.field === name)?.message;
  }, [errors]);

  const isFieldTouched = useCallback((name: string): boolean => {
    return touched.has(name);
  }, [touched]);

  const reset = useCallback(() => {
    const initialData = {} as T;
    Object.entries(config.fields).forEach(([key, field]) => {
      (initialData as any)[key] = field.defaultValue;
    });
    setData(initialData);
    setErrors([]);
    setTouched(new Set());
    setIsSubmitting(false);
  }, [config.fields]);

  const handleSubmit = useCallback(async (event?: React.FormEvent) => {
    if (event) {
      event.preventDefault();
    }

    setIsSubmitting(true);

    try {
      const isValid = validateForm();
      if (!isValid) {
        return;
      }

      if (config.onSubmit) {
        await config.onSubmit(data);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors(prev => [...prev, { 
        field: 'submit', 
        message: error instanceof Error ? error.message : 'Submission failed' 
      }]);
    } finally {
      setIsSubmitting(false);
    }
  }, [data, config.onSubmit, validateForm]);

  const formState: FormState<T> = useMemo(() => ({
    data,
    errors,
    isSubmitting,
    isValid: errors.length === 0
  }), [data, errors, isSubmitting]);

  return {
    // Form state
    formState,
    data,
    errors,
    isSubmitting,
    touched,

    // Field operations
    setValue,
    setFieldTouched,
    getFieldError,
    isFieldTouched,

    // Form operations
    validateForm,
    reset,
    handleSubmit,

    // Utilities
    isValid: errors.length === 0,
    hasErrors: errors.length > 0,
    isDirty: touched.size > 0
  };
}

// Specialized hook for trade alert forms - Fixed interface
export interface TradeAlertFormData extends Record<string, unknown> {
  asset_name: string;
  finnhub_symbol: string;
  trade_type: 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
  entry_price: number;
  stop_loss: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  tp4?: number;
  tp5?: number;
  notes?: string;
}

export function useTradeAlertForm(onSubmit?: (data: TradeAlertFormData) => Promise<void>) {
  return useTypedForm<TradeAlertFormData>({
    fields: {
      asset_name: {
        name: 'asset_name',
        defaultValue: '',
        validation: { required: true, minLength: 2 }
      },
      finnhub_symbol: {
        name: 'finnhub_symbol',
        defaultValue: '',
        validation: { required: true }
      },
      trade_type: {
        name: 'trade_type',
        defaultValue: 'buy',
        validation: { required: true }
      },
      entry_price: {
        name: 'entry_price',
        defaultValue: 0,
        validation: { required: true, min: 0.01 }
      },
      stop_loss: {
        name: 'stop_loss',
        defaultValue: 0,
        validation: { required: true, min: 0.01 }
      },
      tp1: {
        name: 'tp1',
        defaultValue: undefined,
        validation: { min: 0.01 }
      },
      tp2: {
        name: 'tp2',
        defaultValue: undefined,
        validation: { min: 0.01 }
      },
      tp3: {
        name: 'tp3',
        defaultValue: undefined,
        validation: { min: 0.01 }
      },
      tp4: {
        name: 'tp4',
        defaultValue: undefined,
        validation: { min: 0.01 }
      },
      tp5: {
        name: 'tp5',
        defaultValue: undefined,
        validation: { min: 0.01 }
      },
      notes: {
        name: 'notes',
        defaultValue: '',
        validation: { maxLength: 500 }
      }
    },
    onSubmit,
    validateOnChange: true,
    validateOnBlur: true
  });
}
