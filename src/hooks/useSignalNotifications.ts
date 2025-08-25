
import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { TradeAlertWithProfile } from '@/api/services/TradingApiService';

interface SignalNotificationOptions {
  enableToasts?: boolean;
  enableBrowserNotifications?: boolean;
  soundEnabled?: boolean;
}

export const useSignalNotifications = (
  signals: TradeAlertWithProfile[],
  options: SignalNotificationOptions = {
    enableToasts: true,
    enableBrowserNotifications: false,
    soundEnabled: false
  }
) => {
  const showNewSignalNotification = useCallback((signal: TradeAlertWithProfile) => {
    if (options.enableToasts) {
      const isBuy = signal.tradeType === 'buy';
      
      toast.success(
        `New ${signal.tradeType.toUpperCase()} Signal: ${signal.assetName}`,
        {
          description: `Entry: ${signal.entryPrice} | Stop Loss: ${signal.stopLoss}`,
          duration: 5000,
          action: {
            label: "View",
            onClick: () => {
              // Could navigate to signal details or focus the signal
              console.log('Navigate to signal:', signal.id);
            },
          },
        }
      );
    }

    if (options.enableBrowserNotifications && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(`New ${signal.tradeType.toUpperCase()} Signal`, {
          body: `${signal.assetName} - Entry: ${signal.entryPrice}`,
          icon: '/favicon.ico',
          tag: `signal-${signal.id}`,
        });
      }
    }

    if (options.soundEnabled) {
      // Play notification sound
      try {
        const audio = new Audio('/notification-sound.mp3');
        audio.volume = 0.3;
        audio.play().catch(console.warn);
      } catch (error) {
        console.warn('Could not play notification sound:', error);
      }
    }
  }, [options]);

  const showSignalUpdateNotification = useCallback((signal: TradeAlertWithProfile, updateType: string) => {
    if (options.enableToasts) {
      toast.info(
        `Signal Updated: ${signal.assetName}`,
        {
          description: `Status changed to ${signal.status}`,
          duration: 3000,
        }
      );
    }
  }, [options]);

  // Listen for custom signal events
  useEffect(() => {
    const handleSignalPosted = () => {
      // This event is dispatched from the SignalRealtimeContext
      // We don't have the signal data here, so we just show a generic notification
      if (options.enableToasts) {
        toast.success('New trading signal posted!', {
          duration: 3000,
        });
      }
    };

    window.addEventListener('signal-posted', handleSignalPosted);
    
    return () => {
      window.removeEventListener('signal-posted', handleSignalPosted);
    };
  }, [options.enableToasts]);

  // Request notification permissions
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }, []);

  return {
    showNewSignalNotification,
    showSignalUpdateNotification,
    requestNotificationPermission,
    notificationPermission: 'Notification' in window ? Notification.permission : 'denied'
  };
};
