
import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface SignalNotification {
  id: string;
  title: string;
  message: string;
  type: 'new_signal' | 'signal_update' | 'tp_hit' | 'sl_hit';
  assetName: string;
  creatorName?: string;
}

export const useSignalNotifications = () => {
  const { user } = useAuth();

  const showNotification = useCallback((notification: SignalNotification) => {
    const { title, message, type, assetName } = notification;
    
    // Browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        tag: `signal-${notification.id}`,
        badge: '/favicon.ico'
      });
    }

    // Toast notification
    switch (type) {
      case 'new_signal':
        toast.success(title, {
          description: message,
          duration: 5000,
          action: {
            label: 'View',
            onClick: () => {
              // Could navigate to specific signal
              console.log('Navigate to signal:', notification.id);
            }
          }
        });
        break;
      case 'tp_hit':
        toast.success(`🎯 ${title}`, {
          description: message,
          duration: 4000
        });
        break;
      case 'sl_hit':
        toast.error(`🛑 ${title}`, {
          description: message,
          duration: 4000
        });
        break;
      default:
        toast.info(title, {
          description: message,
          duration: 3000
        });
    }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }, []);

  // Listen for custom events dispatched by the realtime context
  useEffect(() => {
    const handleSignalPosted = () => {
      showNotification({
        id: Date.now().toString(),
        title: 'New Trading Signal',
        message: 'A new Xeon Stream signal has been posted',
        type: 'new_signal',
        assetName: 'Various'
      });
    };

    const handleSignalUpdate = (event: CustomEvent) => {
      const { signal, updateType } = event.detail;
      
      if (updateType === 'tp_hit') {
        showNotification({
          id: signal.id,
          title: `${signal.asset_name} - Take Profit Hit!`,
          message: `TP${signal.tp_hits?.slice(-1)[0]} reached for ${signal.asset_name}`,
          type: 'tp_hit',
          assetName: signal.asset_name
        });
      } else if (updateType === 'sl_hit') {
        showNotification({
          id: signal.id,
          title: `${signal.asset_name} - Stop Loss Hit`,
          message: `Stop loss triggered for ${signal.asset_name}`,
          type: 'sl_hit',
          assetName: signal.asset_name
        });
      }
    };

    window.addEventListener('signal-posted', handleSignalPosted);
    window.addEventListener('signal-updated', handleSignalUpdate as EventListener);

    return () => {
      window.removeEventListener('signal-posted', handleSignalPosted);
      window.removeEventListener('signal-updated', handleSignalUpdate as EventListener);
    };
  }, [showNotification]);

  // Auto-request notification permission for authenticated users
  useEffect(() => {
    if (user && 'Notification' in window) {
      requestNotificationPermission();
    }
  }, [user, requestNotificationPermission]);

  return {
    showNotification,
    requestNotificationPermission,
    isSupported: 'Notification' in window,
    permission: 'Notification' in window ? Notification.permission : 'denied'
  };
};
