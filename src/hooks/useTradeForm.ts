
import { useState, useCallback } from 'react';
import { useOptimizedDebounce } from './useOptimizedDebounce';

export interface TradeFormData {
  asset: string;
  pnl: number | '';
  direction: 'long' | 'short' | '';
  outcome: 'win' | 'loss' | '';
  strategy: string;
  emotion: string;
  session: 'sydney' | 'tokyo' | 'london' | 'newyork' | '';
  notes: string;
  entry_price?: number;
  exit_price?: number;
  position_size?: number;
  screenshot_url?: string; // Legacy field
  screenshot_urls?: string[]; // New field for multiple images
  screenshotFiles?: File[]; // Files to upload
}

const initialFormData: TradeFormData = {
  asset: '',
  pnl: '',
  direction: '',
  outcome: '',
  strategy: '',
  emotion: '',
  session: '',
  notes: '',
};

export const useTradeForm = (onSubmit: (data: TradeFormData) => void) => {
  const [formData, setFormData] = useState<TradeFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounced values for text inputs to prevent re-renders
  const debouncedAsset = useOptimizedDebounce(formData.asset, 300);
  const debouncedNotes = useOptimizedDebounce(formData.notes, 300);

  // Immediate update handlers for non-text inputs
  const updateDirection = useCallback((direction: 'long' | 'short') => {
    setFormData(prev => ({ ...prev, direction }));
  }, []);

  const updateOutcome = useCallback((outcome: 'win' | 'loss') => {
    setFormData(prev => ({ ...prev, outcome }));
  }, []);

  const updateStrategy = useCallback((strategy: string) => {
    setFormData(prev => ({ ...prev, strategy }));
  }, []);

  const updateEmotion = useCallback((emotion: string) => {
    setFormData(prev => ({ ...prev, emotion }));
  }, []);

  const updateSession = useCallback((session: 'sydney' | 'tokyo' | 'london' | 'newyork') => {
    setFormData(prev => ({ ...prev, session }));
  }, []);

  // Text input handlers with local state (no debouncing for immediate UI feedback)
  const updateAsset = useCallback((asset: string) => {
    setFormData(prev => ({ ...prev, asset }));
  }, []);

  const updatePnL = useCallback((pnl: number | '') => {
    setFormData(prev => ({ ...prev, pnl }));
  }, []);

  const updateNotes = useCallback((notes: string) => {
    setFormData(prev => ({ ...prev, notes }));
  }, []);

  // Form validation
  const isValid = useCallback(() => {
    return formData.asset && formData.pnl !== '';
  }, [formData.asset, formData.pnl]);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (!isValid()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setFormData(initialFormData); // Reset form
    } catch (error) {
      console.error('Error submitting trade:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onSubmit, isValid]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData(initialFormData);
  }, []);

  return {
    formData,
    debouncedAsset,
    debouncedNotes,
    isSubmitting,
    isValid: isValid(),
    updateAsset,
    updatePnL,
    updateDirection,
    updateOutcome,
    updateStrategy,
    updateEmotion,
    updateSession,
    updateNotes,
    handleSubmit,
    resetForm,
  };
};
