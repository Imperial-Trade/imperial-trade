
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NotificationPermissionState {
  permission: NotificationPermission | 'unsupported';
  isGranted: boolean;
  hasSubscription: boolean;
  initialized: boolean;
  isIframeBlocked: boolean;
  browserInfo?: any;
  browserInstructions?: string;
}

interface UseOneSignalEnhancedReturn extends NotificationPermissionState {
  requestPermission: () => Promise<{ success: boolean; error?: string; details?: any }>;
}

declare global {
  interface Window {
    OneSignal?: any;
  }
}

export const useOneSignalEnhanced = (): UseOneSignalEnhancedReturn => {
  const { toast } = useToast();
  const [state, setState] = useState<NotificationPermissionState>({
    permission: 'default',
    isGranted: false,
    hasSubscription: false,
    initialized: false,
    isIframeBlocked: false,
  });

  const initializationRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  // Enhanced device fingerprinting
  const generateDeviceFingerprint = useCallback(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('fingerprint', 10, 10);
    const canvasFingerprint = canvas.toDataURL();
    
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      !!navigator.cookieEnabled,
      typeof navigator.doNotTrack,
      canvasFingerprint.substring(0, 50)
    ];
    
    return btoa(components.join('|')).substring(0, 32);
  }, []);

  const getDeviceInfo = useCallback(() => {
    const fingerprint = generateDeviceFingerprint();
    return {
      fingerprint,
      browserName: getBrowserName(),
      browserVersion: getBrowserVersion(),
      platform: navigator.platform,
      isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      userAgent: navigator.userAgent
    };
  }, [generateDeviceFingerprint]);

  const getBrowserName = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  };

  const getBrowserVersion = () => {
    const userAgent = navigator.userAgent;
    const match = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/(\d+)/);
    return match ? match[2] : 'Unknown';
  };

  const checkIframeBlocked = useCallback(() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }, []);

  const getBrowserInstructions = useCallback((browserName: string) => {
    const instructions = {
      'Chrome': 'Click the bell icon in the address bar, then select "Allow"',
      'Firefox': 'Click "Allow" when prompted, or click the shield icon in the address bar',
      'Safari': 'Go to Safari Preferences > Websites > Notifications and allow notifications for this site',
      'Edge': 'Click "Allow" when prompted, or go to Settings > Site permissions > Notifications'
    };
    return instructions[browserName as keyof typeof instructions] || 'Allow notifications when prompted by your browser';
  }, []);

  // Enhanced initialization with better error handling
  const initializeOneSignal = useCallback(async () => {
    if (initializationRef.current || typeof window === 'undefined') return;
    
    try {
      initializationRef.current = true;
      
      // Check for iframe blocking
      const isIframeBlocked = checkIframeBlocked();
      if (isIframeBlocked) {
        setState(prev => ({ ...prev, isIframeBlocked: true }));
        console.warn('[OneSignal] Running in iframe - notifications may be blocked');
      }

      // Load OneSignal configuration
      const { data: config } = await supabase.functions.invoke('onesignal-config');
      if (!config?.success) {
        throw new Error('Failed to load OneSignal configuration');
      }

      const { appId } = config;
      
      // Initialize OneSignal with enhanced configuration
      window.OneSignal = window.OneSignal || [];
      window.OneSignal.push(() => {
        window.OneSignal.init({
          appId,
          serviceWorkerParam: {
            scope: '/'
          },
          serviceWorkerPath: 'OneSignalSDKWorker.js',
          allowLocalhostAsSecureOrigin: true,
          autoRegister: false, // We'll handle registration manually
          autoResubscribe: true,
          httpUseOneSignalCom: false,
          promptOptions: {
            slidedown: {
              enabled: false // Disable auto slidedown - we use manual modal
            },
            customlink: {
              enabled: true,
              style: "button",
              size: "medium",
              color: {
                button: '#007bff',
                text: '#ffffff',
              },
              text: {
                subscribe: "Subscribe to push notifications",
                unsubscribe: "Unsubscribe from push notifications"
              }
            }
          }
        });

        // Enhanced event listeners
        window.OneSignal.on('subscriptionChange', (isSubscribed: boolean) => {
          console.log('[OneSignal] Subscription changed:', isSubscribed);
          setState(prev => ({
            ...prev,
            hasSubscription: isSubscribed,
            isGranted: isSubscribed && Notification.permission === 'granted'
          }));
          
          if (isSubscribed) {
            syncWithSupabase();
          }
        });

        window.OneSignal.on('permissionChange', (permission: string) => {
          console.log('[OneSignal] Permission changed:', permission);
          setState(prev => ({
            ...prev,
            permission: permission as NotificationPermission,
            isGranted: permission === 'granted'
          }));
        });

        // Get initial state
        Promise.all([
          window.OneSignal.getNotificationPermission(),
          window.OneSignal.isPushNotificationsEnabled()
        ]).then(([permission, isEnabled]) => {
          console.log('[OneSignal] Initial state - Permission:', permission, 'Enabled:', isEnabled);
          
          const browserName = getBrowserName();
          const browserInstructions = getBrowserInstructions(browserName);
          
          setState(prev => ({
            ...prev,
            permission: permission as NotificationPermission,
            isGranted: permission === 'granted',
            hasSubscription: isEnabled,
            initialized: true,
            browserInfo: { name: browserName, version: getBrowserVersion() },
            browserInstructions
          }));
        }).catch(error => {
          console.error('[OneSignal] Error getting initial state:', error);
          setState(prev => ({ ...prev, initialized: true }));
        });
      });

      // Load OneSignal SDK
      if (!document.getElementById('onesignal-sdk')) {
        const script = document.createElement('script');
        script.id = 'onesignal-sdk';
        script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
        script.async = true;
        document.head.appendChild(script);
      }

    } catch (error) {
      console.error('[OneSignal] Initialization failed:', error);
      setState(prev => ({ 
        ...prev, 
        initialized: true,
        permission: 'unsupported'
      }));
    }
  }, [checkIframeBlocked, getBrowserInstructions]);

  // Enhanced Supabase sync
  const syncWithSupabase = useCallback(async () => {
    try {
      if (!window.OneSignal) return;

      const [userId, playerId, permission] = await Promise.all([
        window.OneSignal.User?.getExternalUserId?.() || window.OneSignal.getExternalUserId?.(),
        window.OneSignal.User?.PushSubscription?.getId?.() || window.OneSignal.getPlayerId?.(),
        window.OneSignal.getNotificationPermission?.()
      ]);

      console.log('[OneSignal] Syncing with Supabase:', { userId, playerId: playerId?.substring(0, 8), permission });

      const deviceInfo = getDeviceInfo();
      
      const { data, error } = await supabase.functions.invoke('onesignal-upsert-user', {
        body: {
          player_id: playerId,
          device_fingerprint: deviceInfo.fingerprint,
          device_info: deviceInfo
        }
      });

      if (error) {
        console.error('[OneSignal] Supabase sync failed:', error);
      } else {
        console.log('[OneSignal] Supabase sync successful:', data);
      }
    } catch (error) {
      console.error('[OneSignal] Sync error:', error);
    }
  }, [getDeviceInfo]);

  // Enhanced permission request with fallback
  const requestPermission = useCallback(async (): Promise<{ success: boolean; error?: string; details?: any }> => {
    try {
      if (!window.OneSignal) {
        return { success: false, error: 'OneSignal not initialized' };
      }

      console.log('[OneSignal] Requesting notification permission...');

      // Check current permission state
      const currentPermission = await window.OneSignal.getNotificationPermission();
      console.log('[OneSignal] Current permission:', currentPermission);

      if (currentPermission === 'granted') {
        // Permission already granted, check subscription
        const isSubscribed = await window.OneSignal.isPushNotificationsEnabled();
        console.log('[OneSignal] Already granted, subscription status:', isSubscribed);
        
        if (!isSubscribed) {
          // Permission granted but not subscribed - force opt-in
          console.log('[OneSignal] Permission granted but not subscribed, attempting opt-in...');
          try {
            await window.OneSignal.User?.PushSubscription?.optIn?.();
            await syncWithSupabase();
            
            setState(prev => ({
              ...prev,
              hasSubscription: true,
              isGranted: true,
              permission: 'granted'
            }));
            
            return { success: true };
          } catch (optInError) {
            console.error('[OneSignal] Opt-in failed:', optInError);
            return { success: false, error: 'Failed to opt-in to push notifications', details: optInError };
          }
        } else {
          await syncWithSupabase();
          return { success: true };
        }
      }

      // Request permission for new users
      let permissionResult;
      try {
        if (window.OneSignal.showNativePrompt) {
          permissionResult = await window.OneSignal.showNativePrompt();
        } else if (window.OneSignal.registerForPushNotifications) {
          permissionResult = await window.OneSignal.registerForPushNotifications();
        } else {
          // Fallback to browser native API
          permissionResult = await Notification.requestPermission();
        }
      } catch (promptError) {
        console.error('[OneSignal] Native prompt failed:', promptError);
        // Fallback to browser API
        permissionResult = await Notification.requestPermission();
      }

      console.log('[OneSignal] Permission result:', permissionResult);

      if (permissionResult === 'granted') {
        // Wait a bit for OneSignal to process the subscription
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const [playerId, isSubscribed] = await Promise.all([
          window.OneSignal.User?.PushSubscription?.getId?.() || window.OneSignal.getPlayerId?.(),
          window.OneSignal.isPushNotificationsEnabled?.()
        ]);
        
        console.log('[OneSignal] Post-permission state:', { playerId: playerId?.substring(0, 8), isSubscribed });
        
        await syncWithSupabase();
        
        setState(prev => ({
          ...prev,
          permission: 'granted',
          isGranted: true,
          hasSubscription: isSubscribed || !!playerId
        }));

        toast({
          title: "🎉 Notifications Enabled!",
          description: "You'll now receive trading signals and updates.",
          duration: 3000,
        });

        return { success: true };
      } else {
        setState(prev => ({
          ...prev,
          permission: permissionResult as NotificationPermission,
          isGranted: false,
          hasSubscription: false
        }));

        const errorMessage = permissionResult === 'denied' 
          ? 'Notifications blocked. Please enable them in your browser settings.'
          : 'Permission request was dismissed.';

        toast({
          title: "Notifications Not Enabled",
          description: errorMessage,
          variant: "destructive",
          duration: 5000,
        });

        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('[OneSignal] Permission request failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to request notification permission';
      
      toast({
        title: "Permission Request Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });

      return { success: false, error: errorMessage, details: error };
    }
  }, [syncWithSupabase, toast]);

  // Initialize on mount
  useEffect(() => {
    initializeOneSignal();
    
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [initializeOneSignal]);

  return {
    ...state,
    requestPermission,
  };
};
