import React, { useState, useCallback } from 'react';

interface ToastState {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'celebration';
  title: string;
  description?: string;
  progress?: number;
  duration?: number;
}

export const useEnhancedToast = () => {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const showToast = useCallback((toast: Omit<ToastState, 'id'>) => {
    const id = Date.now().toString();
    const newToast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove after duration
    const duration = toast.duration || 4000;
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
    
    return id;
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<ToastState>) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ));
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((title: string, description?: string) => {
    return showToast({ type: 'success', title, description });
  }, [showToast]);

  const error = useCallback((title: string, description?: string) => {
    return showToast({ type: 'error', title, description });
  }, [showToast]);

  const celebrate = useCallback((title: string, description?: string) => {
    return showToast({ type: 'celebration', title, description, duration: 6000 });
  }, [showToast]);

  const withProgress = useCallback((title: string, description?: string) => {
    return showToast({ type: 'info', title, description, progress: 0, duration: 0 });
  }, [showToast]);

  return {
    toasts,
    showToast,
    updateToast,
    removeToast,
    success,
    error,
    celebrate,
    withProgress
  };
};