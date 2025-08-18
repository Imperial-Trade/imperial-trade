
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { detectSafariPWA } from '@/utils/safariPWADetection';

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
  requestPermission: () => Promise<{ success: boolean; error?: string; details?: any; finalPermission?: string }>;
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

      // Always use centralized workers from /push/onesignal/ directory
      console.log('[OneSignal] Using centralized service workers from /push/onesignal/');
      
      // Initialize OneSignal with enhanced configuration
      window.OneSignal = window.OneSignal || [];
      window.OneSignal.push(() => {
        window.OneSignal.init({
          appId,
          serviceWorkerParam: { scope: '/push/onesignal/' },
          serviceWorkerPath: '/push/onesignal/OneSignalSDKWorker.js',
          serviceWorkerUpdaterPath: '/push/onesignal/OneSignalSDKUpdaterWorker.js',
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

        // V16-compatible event listeners with v15 fallbacks
        try {
          // V16 event listeners
          if (window.OneSignal.User?.PushSubscription?.addEventListener) {
            console.log('[OneSignal] Setting up v16 event listeners');
            
            window.OneSignal.User.PushSubscription.addEventListener('change', (event: any) => {
              console.log('[OneSignal] v16 subscription change:', event);
              const isSubscribed = event.current.optedIn;
              setState(prev => ({
                ...prev,
                hasSubscription: isSubscribed,
                isGranted: isSubscribed && Notification.permission === 'granted'
              }));
              
              if (isSubscribed) {
                syncWithSupabase();
              }
            });
          }
          
          if (window.OneSignal.Notifications?.addEventListener) {
            window.OneSignal.Notifications.addEventListener('permissionChange', (event: any) => {
              console.log('[OneSignal] v16 permission change:', event);
              const permission = event.permission;
              setState(prev => ({
                ...prev,
                permission: permission as NotificationPermission,
                isGranted: permission === 'granted'
              }));
            });
          }
        } catch (v16Error) {
          console.log('[OneSignal] v16 events not available, using v15 fallbacks');
        }

        // V15 fallback event listeners
        try {
          window.OneSignal.on('subscriptionChange', (isSubscribed: boolean) => {
            console.log('[OneSignal] v15 subscription change:', isSubscribed);
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
            console.log('[OneSignal] v15 permission change:', permission);
            setState(prev => ({
              ...prev,
              permission: permission as NotificationPermission,
              isGranted: permission === 'granted'
            }));
          });
        } catch (v15Error) {
          console.warn('[OneSignal] v15 event listeners failed:', v15Error);
        }

        // Get initial state with v16/v15 compatibility
        const getInitialState = async () => {
          try {
            let permission: NotificationPermission;
            let isEnabled: boolean;
            let playerId: string | null = null;

            // Try v16 APIs first
            if (window.OneSignal?.Notifications?.permission !== undefined) {
              permission = window.OneSignal.Notifications.permission;
              console.log('[OneSignal] Got permission from v16:', permission);
            } else if (window.OneSignal?.getNotificationPermission) {
              permission = await window.OneSignal.getNotificationPermission();
              console.log('[OneSignal] Got permission from v15:', permission);
            } else {
              permission = Notification.permission;
              console.log('[OneSignal] Got permission from browser:', permission);
            }

            if (window.OneSignal?.User?.PushSubscription?.optedIn !== undefined) {
              isEnabled = window.OneSignal.User.PushSubscription.optedIn;
              playerId = window.OneSignal.User.PushSubscription.id || null;
              console.log('[OneSignal] Got subscription from v16:', { isEnabled, playerId: playerId?.substring(0, 8) });
            } else if (window.OneSignal?.isPushNotificationsEnabled) {
              isEnabled = await window.OneSignal.isPushNotificationsEnabled();
              if (window.OneSignal?.getPlayerId) {
                playerId = await window.OneSignal.getPlayerId();
              }
              console.log('[OneSignal] Got subscription from v15:', { isEnabled, playerId: playerId?.substring(0, 8) });
            } else {
              isEnabled = false;
              console.log('[OneSignal] No subscription APIs available');
            }
            
            const browserName = getBrowserName();
            const browserInstructions = getBrowserInstructions(browserName);
            
            setState(prev => ({
              ...prev,
              permission,
              isGranted: permission === 'granted',
              hasSubscription: isEnabled || !!playerId,
              initialized: true,
              browserInfo: { name: browserName, version: getBrowserVersion() },
              browserInstructions
            }));

            console.log('[OneSignal] ✅ Initial state ready:', { permission, isEnabled, hasPlayerId: !!playerId });
          } catch (error) {
            console.error('[OneSignal] Error getting initial state:', error);
            // Set initialized to true even on error to allow fallback permission requests
            const browserName = getBrowserName();
            setState(prev => ({ 
              ...prev, 
              initialized: true,
              browserInfo: { name: browserName, version: getBrowserVersion() },
              browserInstructions: getBrowserInstructions(browserName)
            }));
          }
        };

        getInitialState();
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

          // Get data with v16/v15 compatibility
          let userId: string | null = null;
          let playerId: string | null = null;
          let permission: NotificationPermission;

          try {
            // Try v16 APIs first
            if (window.OneSignal?.User?.getExternalUserId) {
              userId = await window.OneSignal.User.getExternalUserId();
            } else if (window.OneSignal?.getExternalUserId) {
              userId = await window.OneSignal.getExternalUserId();
            }

            if (window.OneSignal?.User?.PushSubscription?.id) {
              playerId = window.OneSignal.User.PushSubscription.id;
            } else if (window.OneSignal?.getPlayerId) {
              playerId = await window.OneSignal.getPlayerId();
            }

            if (window.OneSignal?.Notifications?.permission) {
              permission = window.OneSignal.Notifications.permission;
            } else if (window.OneSignal?.getNotificationPermission) {
              permission = await window.OneSignal.getNotificationPermission();
            } else {
              permission = Notification.permission;
            }
          } catch (error) {
            console.warn('[OneSignal] Error getting sync data:', error);
            permission = Notification.permission;
          }

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

  // V16-proof permission request with reliable subscription handling
  const requestPermission = useCallback(async (): Promise<{ success: boolean; error?: string; details?: any; finalPermission?: string }> => {
    try {
      console.log('[OneSignal] 🎯 Starting v16-proof permission request...');
      
      // Detect iOS PWA for enhanced handling
      const safariPWAInfo = detectSafariPWA();
      const isIOSSafari = safariPWAInfo.isIOS || safariPWAInfo.isSafari;
      
      if (isIOSSafari) {
        console.log('[OneSignal] 🍎 iOS/Safari detected - ensuring gesture-safe operation');
      }

      // Add timeout to prevent indefinite hangs
      const timeoutMs = 10000; // 10 seconds
      console.log(`[OneSignal] Setting ${timeoutMs/1000}s timeout for permission request`);

      const permissionPromise = (async () => {
        // STEP 1: Request permission - must be first async operation for gesture safety
        console.log('[OneSignal] 🚀 Requesting permission...');
        
        try {
          // Try OneSignal v16 API first, then fallback to v15/browser
          if (window.OneSignal?.Notifications?.requestPermission) {
            console.log('[OneSignal] Using v16 Notifications.requestPermission()');
            await window.OneSignal.Notifications.requestPermission();
          } else if (window.OneSignal?.showNativePrompt) {
            console.log('[OneSignal] Using v15 showNativePrompt()');
            await window.OneSignal.showNativePrompt();
          } else {
            console.log('[OneSignal] Using browser native Notification.requestPermission()');
            await Notification.requestPermission();
          }
        } catch (promptError) {
          console.warn('[OneSignal] Primary permission request failed, using browser fallback:', promptError);
          await Notification.requestPermission();
        }
      })();

      // Race permission request against timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Permission request timed out')), timeoutMs);
      });

      let permissionResult;
      try {
        await Promise.race([permissionPromise, timeoutPromise]);
        console.log('[OneSignal] ✅ Permission request completed within timeout');
      } catch (timeoutError) {
        console.warn('[OneSignal] ⚠️ Permission request timed out, continuing with best-effort flow:', timeoutError);
        
        toast({
          title: "Setup Taking Longer Than Expected",
          description: "Continuing setup in the background. You may need to try again if notifications don't work.",
          duration: 5000,
        });
      }

      // STEP 2: Read authoritative permission state (v16-proof)
      let finalPermission: NotificationPermission;
      try {
        if (window.OneSignal?.Notifications?.permission) {
          finalPermission = window.OneSignal.Notifications.permission;
          console.log('[OneSignal] ✅ Permission from v16 API:', finalPermission);
        } else if (window.OneSignal?.getNotificationPermission) {
          finalPermission = await window.OneSignal.getNotificationPermission();
          console.log('[OneSignal] ✅ Permission from v15 API:', finalPermission);
        } else {
          finalPermission = Notification.permission;
          console.log('[OneSignal] ✅ Permission from browser API:', finalPermission);
        }
      } catch (error) {
        console.warn('[OneSignal] Failed to get permission from OneSignal, using browser API:', error);
        finalPermission = Notification.permission;
      }

      const permissionGranted = finalPermission === 'granted';

      if (permissionGranted) {
        console.log('[OneSignal] 🎉 Permission granted! Ensuring subscription...');
        
        // STEP 3: Force subscription with Player ID polling (v16-proof)
        try {
          // Force opt-in to create subscription
          if (window.OneSignal?.User?.PushSubscription?.optIn) {
            console.log('[OneSignal] Using v16 User.PushSubscription.optIn()');
            await window.OneSignal.User.PushSubscription.optIn();
          } else if (window.OneSignal?.setSubscription) {
            console.log('[OneSignal] Using v15 setSubscription(true)');
            await window.OneSignal.setSubscription(true);
          } else if (window.OneSignal?.registerForPushNotifications) {
            console.log('[OneSignal] Using v15 registerForPushNotifications()');
            await window.OneSignal.registerForPushNotifications();
          }

          // Poll for Player ID with timeout
          console.log('[OneSignal] 🔄 Polling for Player ID...');
          let playerId = null;
          let attempts = 0;
          const maxAttempts = 10;
          
          while (!playerId && attempts < maxAttempts) {
            try {
              if (window.OneSignal?.User?.PushSubscription?.id) {
                playerId = window.OneSignal.User.PushSubscription.id;
                console.log('[OneSignal] ✅ Got Player ID from v16 API:', playerId?.substring(0, 8));
              } else if (window.OneSignal?.getPlayerId) {
                playerId = await window.OneSignal.getPlayerId();
                console.log('[OneSignal] ✅ Got Player ID from v15 API:', playerId?.substring(0, 8));
              }
              
              if (!playerId) {
                attempts++;
                console.log(`[OneSignal] 🔄 Attempt ${attempts}/${maxAttempts} - waiting for Player ID...`);
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            } catch (error) {
              console.warn(`[OneSignal] Error getting Player ID (attempt ${attempts + 1}):`, error);
              attempts++;
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }

          if (!playerId) {
            console.warn('[OneSignal] ⚠️ No Player ID after polling - subscription may be incomplete');
          }

          // STEP 4: Verify subscription status
          let isSubscribed = false;
          try {
            if (window.OneSignal?.User?.PushSubscription?.optedIn !== undefined) {
              isSubscribed = window.OneSignal.User.PushSubscription.optedIn;
              console.log('[OneSignal] ✅ Subscription status from v16 API:', isSubscribed);
            } else if (window.OneSignal?.isPushNotificationsEnabled) {
              isSubscribed = await window.OneSignal.isPushNotificationsEnabled();
              console.log('[OneSignal] ✅ Subscription status from v15 API:', isSubscribed);
            }
          } catch (error) {
            console.warn('[OneSignal] Failed to verify subscription status:', error);
            // If we have a Player ID, assume subscribed
            isSubscribed = !!playerId;
          }

          console.log('[OneSignal] 📊 Final state:', { 
            permission: finalPermission, 
            playerId: playerId?.substring(0, 8), 
            isSubscribed 
          });

          // STEP 5: Sync to Supabase only after successful subscription
          if (playerId || isSubscribed) {
            console.log('[OneSignal] 🔄 Syncing to Supabase...');
            await syncWithSupabase();
          }

          // STEP 6: Update local state
          setState(prev => ({
            ...prev,
            permission: finalPermission,
            isGranted: true,
            hasSubscription: isSubscribed || !!playerId
          }));

          // Success toast based on final permission state
          toast({
            title: "🎉 Notifications Enabled!",
            description: "You'll now receive trading signals and updates.",
            duration: 3000,
          });

          return { success: true, finalPermission };
          
        } catch (subscriptionError) {
          console.error('[OneSignal] Subscription setup failed after permission grant:', subscriptionError);
          
          // Still update state to reflect permission granted
          setState(prev => ({
            ...prev,
            permission: finalPermission,
            isGranted: true,
            hasSubscription: false
          }));

          toast({
            title: "Permission Granted",
            description: "Notifications enabled, but setup may be incomplete. Please try again if you don't receive alerts.",
            duration: 5000,
          });

          return { success: true, finalPermission, error: 'Subscription setup incomplete' };
        }
      } else {
        // Permission denied or dismissed
        setState(prev => ({
          ...prev,
          permission: finalPermission,
          isGranted: false,
          hasSubscription: false
        }));

        const errorMessage = finalPermission === 'denied' 
          ? 'Notifications blocked. Please enable them in your browser settings.'
          : 'Permission request was dismissed.';

        toast({
          title: "Notifications Not Enabled",
          description: errorMessage,
          variant: "destructive",
          duration: 5000,
        });

        return { success: false, error: errorMessage, finalPermission };
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
