
import { useState, useEffect } from 'react';

export type ConnectionStatus = 'online' | 'offline' | 'checking';

export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [lastOnline, setLastOnline] = useState<Date | null>(null);

  useEffect(() => {
    const updateOnlineStatus = () => {
      const isOnline = navigator.onLine;
      setStatus(isOnline ? 'online' : 'offline');
      
      if (isOnline) {
        setLastOnline(new Date());
      }
    };

    // Initial check
    updateOnlineStatus();

    // Listen for network changes
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Periodic connectivity test
    const interval = setInterval(async () => {
      if (navigator.onLine) {
        try {
          const response = await fetch('/favicon.ico', { 
            method: 'HEAD',
            cache: 'no-cache'
          });
          
          if (response.ok) {
            setStatus('online');
            setLastOnline(new Date());
          } else {
            setStatus('offline');
          }
        } catch {
          setStatus('offline');
        }
      }
    }, 30000); // Check every 30 seconds

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(interval);
    };
  }, []);

  return {
    status,
    isOnline: status === 'online',
    isOffline: status === 'offline',
    lastOnline
  };
}
