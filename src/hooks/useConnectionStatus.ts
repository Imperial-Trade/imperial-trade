
import { useState, useEffect } from 'react';

interface ConnectionStatusHook {
  status: 'online' | 'offline' | 'checking';
  isOnline: boolean;
  lastOnline: Date | null;
}

export function useConnectionStatus(): ConnectionStatusHook {
  const [status, setStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [lastOnline, setLastOnline] = useState<Date | null>(null);

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      setStatus('offline');
      return;
    }

    const updateStatus = () => {
      const isOnline = navigator.onLine;
      setStatus(isOnline ? 'online' : 'offline');
      
      if (isOnline) {
        setLastOnline(new Date());
      }
    };

    // Initial check
    updateStatus();

    // Listen for online/offline events
    const handleOnline = () => {
      console.log('🌐 Connection restored');
      setStatus('online');
      setLastOnline(new Date());
    };

    const handleOffline = () => {
      console.log('❌ Connection lost');
      setStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    status,
    isOnline: status === 'online',
    lastOnline
  };
}
