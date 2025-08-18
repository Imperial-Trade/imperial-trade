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

  // OneSignal login/logout functions
  const loginUserInOneSignal = useCallback(async (userId: string) => {
    try {
      if (!window.OneSignal) return;
      
      console.log(`[OneSignal] 🔑 Logging in user: ${userId.substring(0, 8)}...`);
      
      // Try v16 login first, then v15 fallback
      if (window.OneSignal?.login) {
        await window.OneSignal.login(userId);
        console.log('[OneSignal] ✅ User logged in via v16 API');
      } else if (window.OneSignal?.setExternalUserId) {
        await window.OneSignal.setExternalUserId(userId);
        console.log('[OneSignal] ✅ External user ID set via v15 API');
      } else {
        console.warn('[OneSignal] ⚠️ No login API available');
      }
    } catch (error) {
      console.error('[OneSignal] ❌ Login failed:', error);
    }
  }, []);

  const logoutUserFromOneSignal = useCallback(async () => {
    try {
      if (!window.OneSignal) return;
      
      console.log('[OneSignal] 🚪 Logging out user...');
      
      // Try v16 logout first, then v15 fallback
      if (window.OneSignal?.logout) {
        await window.OneSignal.logout();
        console.log('[OneSignal] ✅ User logged out via v16 API');
      } else if (window.OneSignal?.removeExternalUserId) {
        await window.OneSignal.removeExternalUserId();
        console.log('[OneSignal] ✅ External user ID removed via v15 API');
      } else {
        console.warn('[OneSignal] ⚠️ No logout API available');
      }
    } catch (error) {
      console.error('[OneSignal] ❌ Logout failed:', error);
    }
  }, []);

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

      // Get current auth user for email
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // If user is logged in but OneSignal doesn't have external_id, login first
      if (currentUser && !userId) {
        console.log('[OneSignal] 🔄 User logged in but not linked to OneSignal, logging in...');
        await loginUserInOneSignal(currentUser.id);
      }

      const deviceInfo = getDeviceInfo();
      
      const { data, error } = await supabase.functions.invoke('onesignal-upsert-user', {
        body: {
          user_id: currentUser?.id,
          email: currentUser?.email,
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
  }, [getDeviceInfo, loginUserInOneSignal]);

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
  }, [checkIframeBlocked, getBrowserInstructions, syncWithSupabase]);

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
        
        // For Safari/iOS, immediately trigger native permission request to preserve user gesture
        if (isIOSSafari) {
          console.log('[OneSignal] 🍎 Safari/iOS detected, triggering immediate native permission request...');
          try {
            const nativePermission = await Notification.requestPermission();
            console.log('[OneSignal] Native permission result:', nativePermission);
            
            if (nativePermission !== 'granted') {
              throw new Error(`Native permission denied: ${nativePermission}`);
            }
          } catch (nativeError) {
            console.warn('[OneSignal] Native permission request failed:', nativeError);
            throw nativeError;
          }
        }
        
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
          if (!isIOSSafari) { // Only fallback if we haven't already tried native request
            await Notification.requestPermission();
          } else {
            throw promptError; // Re-throw for Safari/iOS since native request already failed
          }
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
          description: "Please wait while we finish setting up notifications...",
          duration: 3000,
        });
      }

      // STEP 2: Wait for permission state to stabilize
      console.log('[OneSignal] ⏳ Waiting for permission state...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // STEP 3: Get final permission state from multiple sources
      let finalPermission: NotificationPermission;
      try {
        if (window.OneSignal?.Notifications?.permission) {
          finalPermission = window.OneSignal.Notifications.permission;
          console.log('[OneSignal] Final permission from v16:', finalPermission);
        } else if (window.OneSignal?.getNotificationPermission) {
          finalPermission = await window.OneSignal.getNotificationPermission();
          console.log('[OneSignal] Final permission from v15:', finalPermission);
        } else {
          finalPermission = Notification.permission;
          console.log('[OneSignal] Final permission from browser:', finalPermission);
        }
      } catch (permError) {
        console.warn('[OneSignal] Error getting final permission, using browser:', permError);
        finalPermission = Notification.permission;
      }

      if (finalPermission === 'granted') {
        // STEP 4: Final verification and sync with backend
        console.log('[OneSignal] 🔄 Final verification and backend sync...');
        
        // Wait for subscription to be fully active
        let syncAttempts = 0;
        const maxSyncAttempts = 5;
        
        while (syncAttempts < maxSyncAttempts) {
          try {
            let currentPlayerId: string | null = null;
            let currentSubscriptionState = false;
            
            // Check subscription state with v16/v15 compatibility
            if (window.OneSignal?.User?.PushSubscription?.id) {
              currentPlayerId = window.OneSignal.User.PushSubscription.id;
              currentSubscriptionState = window.OneSignal.User.PushSubscription.optedIn;
            } else if (window.OneSignal?.getPlayerId && window.OneSignal?.isPushNotificationsEnabled) {
              currentPlayerId = await window.OneSignal.getPlayerId();
              currentSubscriptionState = await window.OneSignal.isPushNotificationsEnabled();
            }
            
            console.log(`[OneSignal] Sync attempt ${syncAttempts + 1}: Player ID ${currentPlayerId?.substring(0, 8)}, Subscribed: ${currentSubscriptionState}`);
            
            if (currentPlayerId && currentSubscriptionState) {
              // Get current user to ensure login before sync
              const { data: { user: currentUser } } = await supabase.auth.getUser();
              if (currentUser) {
                console.log('[OneSignal] 🔑 Ensuring user is logged in to OneSignal before sync...');
                await loginUserInOneSignal(currentUser.id);
              }
              
              // Subscription is active, sync with backend
              await syncWithSupabase();
              console.log('[OneSignal] ✅ Backend sync completed');
              break;
            } else if (syncAttempts === maxSyncAttempts - 1) {
              // Last attempt - sync anyway with best effort
              console.log('[OneSignal] ⚠️ Final sync attempt with partial data');
              const { data: { user: currentUser } } = await supabase.auth.getUser();
              if (currentUser) {
                await loginUserInOneSignal(currentUser.id);
              }
              await syncWithSupabase();
            }
            
            syncAttempts++;
            if (syncAttempts < maxSyncAttempts) {
              await new Promise(resolve => setTimeout(resolve, 800)); // Wait 800ms between attempts
            }
          } catch (syncError) {
            console.warn(`[OneSignal] Sync attempt ${syncAttempts + 1} failed:`, syncError);
            syncAttempts++;
            if (syncAttempts < maxSyncAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }

        // Update local state
        setState(prev => ({
          ...prev,
          permission: finalPermission,
          isGranted: true,
          hasSubscription: true
        }));

        toast({
          title: "Notifications Enabled! 🎉",
          description: "You'll now receive trading signals and updates.",
          duration: 4000,
        });

        return { success: true, finalPermission };
          
      } else {
        // Permission denied or dismissed
        setState(prev => ({
          ...prev,
          permission: finalPermission,
          isGranted: false,
          hasSubscription: false
        }));

        let errorMessage = finalPermission === 'denied' 
          ? 'Notifications blocked. Please enable them in your browser settings.'
          : 'Permission request was dismissed.';
          
        // Provide specific help for Safari/iOS users
        if (isIOSSafari) {
          errorMessage = 'To enable notifications on iOS: Go to Settings > [App Name] > Notifications and turn on "Allow Notifications"';
        }

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
  }, [syncWithSupabase, toast, loginUserInOneSignal]);

  // Initialize on mount and setup auth listener
  useEffect(() => {
    initializeOneSignal();
    
    // Set up auth state listener for login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[OneSignal] 🔄 Auth state changed:', event, !!session?.user);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // User signed in - login to OneSignal
          console.log('[OneSignal] 👤 User signed in, linking to OneSignal...');
          setTimeout(async () => {
            await loginUserInOneSignal(session.user.id);
            // Sync after login to ensure proper association
            await syncWithSupabase();
          }, 1000); // Small delay to ensure OneSignal is ready
        } else if (event === 'SIGNED_OUT') {
          // User signed out - logout from OneSignal
          console.log('[OneSignal] 👋 User signed out, unlinking from OneSignal...');
          await logoutUserFromOneSignal();
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [initializeOneSignal, loginUserInOneSignal, logoutUserFromOneSignal, syncWithSupabase]);

  return {
    ...state,
    requestPermission,
  };
};