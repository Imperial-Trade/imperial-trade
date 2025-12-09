import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './use-toast';
import { supabase } from '../integrations/supabase/client';

// OneSignal SDK - accessed globally from CDN script
declare global {
  interface Window {
    OneSignal: any;
    OneSignalDeferred: any[];
  }
}

interface PushDiagnostics {
  isSecureContext: boolean;
  serviceWorkerSupported: boolean;
  serviceWorkerRegistered: boolean;
  notificationPermission: NotificationPermission | 'unsupported';
  oneSignalLoaded: boolean;
  oneSignalInitialized: boolean;
  isOptedIn: boolean;
  playerId: string | null;
  isIOS: boolean;
  isPWA: boolean;
  issues: string[];
}

interface UseOneSignalReturn {
  isInitialized: boolean;
  isPushEnabled: boolean;
  subscribeToPush: () => Promise<boolean>;
  unsubscribeFromPush: () => Promise<boolean>;
  getUserId: () => Promise<string | null>;
  runDiagnostics: () => Promise<PushDiagnostics>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚀 EARLY INITIALIZATION - Run on page load (before user interaction)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// This ensures Service Worker and OneSignal SDK are ready BEFORE
// the user clicks "Notify Me" - no delays when they're fast!

let globalInitPromise: Promise<boolean> | null = null;
let globalServiceWorkerReady = false;
let globalOneSignalReady = false;

async function preInitializeOneSignal(): Promise<boolean> {
  // Only run once globally
  if (globalInitPromise) return globalInitPromise;
  
  globalInitPromise = (async () => {
    try {
      console.log('🚀 [OneSignal] PRE-INITIALIZING on page load...');
      
      // Step 1: Pre-register Service Worker immediately
      if ('serviceWorker' in navigator) {
        try {
          const existingReg = await navigator.serviceWorker.getRegistration('/');
          if (!existingReg) {
            console.log('⏳ [ServiceWorker] Pre-registering OneSignalSDKWorker.js...');
            await navigator.serviceWorker.register('/OneSignalSDKWorker.js', { scope: '/' });
          }
          await navigator.serviceWorker.ready;
          globalServiceWorkerReady = true;
          console.log('✅ [ServiceWorker] Ready and waiting');
        } catch (swError) {
          console.warn('⚠️ [ServiceWorker] Pre-registration issue:', swError);
        }
      }

      // Step 2: Wait for OneSignal SDK to load from CDN
      if (typeof window.OneSignal === 'undefined') {
        console.log('⏳ [OneSignal] Waiting for SDK to load from CDN...');
        await new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            if (typeof window.OneSignal !== 'undefined') {
              clearInterval(checkInterval);
              resolve();
            }
          }, 50); // Check every 50ms for faster detection
          
          // Timeout after 10 seconds
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
          }, 10000);
        });
      }

      if (typeof window.OneSignal === 'undefined') {
        console.error('❌ [OneSignal] SDK failed to load from CDN');
        return false;
      }

      // Step 3: Initialize OneSignal SDK (without prompting)
      try {
        await window.OneSignal.init({
          appId: "3ea69bee-8061-4dd7-8053-fc95779b0f1e",
          safari_web_id: "web.onesignal.auto.18b6e18e-7804-46d0-9cf7-7a5dce161e98",
          serviceWorkerPath: '/OneSignalSDKWorker.js',
          serviceWorkerParam: { scope: '/' },
          autoResubscribe: false,
          autoRegister: false,
          promptOptions: {
            autoPrompt: false,
            slidedown: { prompts: [], autoPrompt: false },
            native: { autoPrompt: false }
          },
          notifyButton: { enable: false },
          allowLocalhostAsSecureOrigin: true,
        });
        globalOneSignalReady = true;
        console.log('✅ [OneSignal] SDK pre-initialized and ready');
      } catch (initError: any) {
        if (initError.message?.includes('already initialized') || 
            initError.message?.includes('AppID')) {
          globalOneSignalReady = true;
          console.log('✅ [OneSignal] SDK already initialized');
        } else {
          console.error('❌ [OneSignal] Pre-initialization failed:', initError);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('❌ [OneSignal] Pre-initialization error:', error);
      return false;
    }
  })();

  return globalInitPromise;
}

// 🔥 START PRE-INITIALIZATION IMMEDIATELY when this module loads
// This runs as soon as the user visits ANY page on the site
if (typeof window !== 'undefined') {
  // Use requestIdleCallback for non-blocking initialization, or setTimeout as fallback
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => preInitializeOneSignal(), { timeout: 2000 });
  } else {
    setTimeout(() => preInitializeOneSignal(), 100);
  }
}

export const useOneSignal = (): UseOneSignalReturn => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [isInitialized, setIsInitialized] = useState(globalOneSignalReady);
  const [isPushEnabled, setIsPushEnabled] = useState(false);

  // Initialize OneSignal and sync with user state
  useEffect(() => {
    if (loading || !user) {
      console.log('⏳ [OneSignal] Waiting for authentication...');
      return;
    }

    // iOS PWA Detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || isInStandaloneMode;
    
    if (isIOS && !isPWA) {
      console.warn('⚠️ [iOS] Not running as PWA. Push notifications require "Add to Home Screen"');
    }

    async function initializeAndSync() {
      try {
        // Wait for pre-initialization to complete (should already be done)
        const preInitSuccess = await preInitializeOneSignal();
        
        if (!preInitSuccess) {
          console.error('❌ [OneSignal] Pre-initialization failed');
          return;
        }

        setIsInitialized(true);
        console.log('✅ [OneSignal] Ready for user:', user.id?.substring(0, 8));

        // Check current subscription status
        const permission = await window.OneSignal.Notifications.permission;
        const isSubscribed = await window.OneSignal.User.PushSubscription.optedIn;
        
        console.log('📊 [OneSignal] Permission:', permission, 'Subscribed:', isSubscribed);
        
        if (isSubscribed) {
          setIsPushEnabled(true);
          
          // ✅ SYNC: Ensure database matches OneSignal state + save Player ID
          const playerId = await window.OneSignal.User.PushSubscription.id;
          
          if (playerId) {
            const { error } = await supabase
              .from('profiles')
              .update({ 
                xeon_stream_subscription: true,
                device_token: playerId,
                device_platform: 'web',
                device_token_updated_at: new Date().toISOString()
              })
              .eq('id', user.id);
            
            if (error) {
              console.error('❌ [Database] Failed to sync subscription:', error);
            } else {
              console.log('✅ [Database] Synced subscription + Player ID:', playerId?.substring(0, 12));
            }
          }
        } else {
          setIsPushEnabled(false);
        }

        // Listen for subscription changes
        window.OneSignal.User.PushSubscription.addEventListener('change', async (event: any) => {
          console.log('🔔 [OneSignal] Subscription changed:', event);
          const isNowSubscribed = event.current.optedIn;
          setIsPushEnabled(isNowSubscribed);
          
          // Update database with subscription status + Player ID
          let playerId = null;
          if (isNowSubscribed) {
            playerId = await window.OneSignal.User.PushSubscription.id;
          }
          
          const { error } = await supabase
            .from('profiles')
            .update({ 
              xeon_stream_subscription: isNowSubscribed,
              device_token: playerId,
              device_platform: isNowSubscribed ? 'web' : null,
              device_token_updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
          
          if (error) {
            console.error('❌ [Database] Failed to update subscription:', error);
          } else {
            console.log(`✅ [Database] Updated subscription to ${isNowSubscribed}`);
          }
        });

      } catch (error) {
        console.error('❌ [OneSignal] Initialization failed:', error);
      }
    }

    initializeAndSync();
  }, [loading, user]);

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    // iOS PWA Check
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || isInStandaloneMode;
    
    if (isIOS && !isPWA) {
      console.error('❌ [iOS] Cannot subscribe: Not in PWA mode');
      toast({
        title: "iOS Installation Required",
        description: "Tap Share → Add to Home Screen, then open from your home screen.",
        variant: "destructive",
      });
      return false;
    }

    try {
      console.log('🔔 [OneSignal] Starting subscription...', { 
        isIOS, 
        isPWA,
        preInitialized: globalOneSignalReady,
        serviceWorkerReady: globalServiceWorkerReady 
      });

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🚀 ENSURE PRE-INITIALIZATION IS COMPLETE
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // If user clicks fast, wait for pre-init to finish (usually already done)
      
      if (!globalOneSignalReady) {
        console.log('⏳ [OneSignal] Waiting for pre-initialization to complete...');
        const preInitSuccess = await preInitializeOneSignal();
        if (!preInitSuccess) {
          toast({
            title: "Initialization Failed",
            description: "Please refresh the page and try again.",
            variant: "destructive",
          });
          return false;
        }
      }

      // Service worker should already be ready from pre-init
      const serviceWorkerReady = globalServiceWorkerReady;
      console.log('✅ [OneSignal] Pre-initialization confirmed, SW ready:', serviceWorkerReady);

      // Request notification permission with timeout safety
      const permissionPromise = window.OneSignal.Notifications.requestPermission();
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve('timeout'), 15000));
      
      const permissionResult = await Promise.race([permissionPromise, timeoutPromise]);

      if (permissionResult === 'timeout') {
        console.warn('⚠️ [OneSignal] Permission request timed out');
        toast({
          title: "Permission Request Timed Out",
          description: "Please check your browser settings to enable notifications manually.",
          variant: "destructive",
        });
        return false;
      }

      const permission = permissionResult;
      
      if (!permission) {
        console.warn('⚠️ [OneSignal] Permission denied');
        toast({
          title: "Permission Denied",
          description: isIOS 
            ? "Enable notifications in iOS Settings → Trade Imperial → Notifications" 
            : "Please enable notifications in your browser settings.",
          variant: "destructive",
        });
        return false;
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🔒 ROBUST PLAYER ID GENERATION
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      // Step 1: Opt in to push notifications
      console.log('🔔 [OneSignal] Calling optIn()...');
      await window.OneSignal.User.PushSubscription.optIn();
      
      // Step 3: Wait for Player ID with extended retry logic
      let playerId: string | null = null;
      let attempts = 0;
      const maxAttempts = 20; // 10 seconds total (20 * 500ms)
      
      console.log('⏳ [OneSignal] Waiting for Player ID...');
      
      while (!playerId && attempts < maxAttempts) {
        try {
          // Method 1: Direct subscription ID
          playerId = await window.OneSignal.User.PushSubscription.id;
          
          // Method 2: If still null, try getting from subscription token
          if (!playerId) {
            const subscriptionState = window.OneSignal.User.PushSubscription;
            if (subscriptionState && subscriptionState.token) {
              // Some OneSignal versions use token instead of id
              playerId = subscriptionState.token;
            }
          }
          
          // Method 3: Try legacy method if available
          if (!playerId && window.OneSignal.getUserId) {
            playerId = await window.OneSignal.getUserId();
          }
          
        } catch (idError) {
          console.warn(`⚠️ [OneSignal] Attempt ${attempts + 1} failed:`, idError);
        }
        
        if (!playerId) {
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      // Step 4: Final verification - check if optedIn is true even if ID is missing
      if (!playerId) {
        const isOptedIn = await window.OneSignal.User.PushSubscription.optedIn;
        console.log('🔍 [OneSignal] optedIn status:', isOptedIn);
        
        if (isOptedIn) {
          // User is opted in but ID not available yet - this can happen on slow networks
          // Try one more time after a longer delay
          console.log('⏳ [OneSignal] Opted in but no ID - waiting 3 more seconds...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          playerId = await window.OneSignal.User.PushSubscription.id;
        }
      }

      // Step 5: If still no Player ID, provide detailed error
      if (!playerId) {
        console.error('❌ [OneSignal] Failed to get Player ID after all attempts', {
          attempts,
          serviceWorkerReady,
          isSecureContext: window.isSecureContext,
          protocol: window.location.protocol,
          userAgent: navigator.userAgent.substring(0, 100),
        });
        
        // Check for common issues
        let errorMessage = "Could not get device ID. ";
        
        if (!window.isSecureContext) {
          errorMessage += "HTTPS is required for push notifications.";
        } else if (!serviceWorkerReady) {
          errorMessage += "Service worker failed to register. Try refreshing the page.";
        } else if (isIOS && !isPWA) {
          errorMessage += "On iOS, you must add this app to your home screen first.";
        } else {
          errorMessage += "Please try again or check your browser settings.";
        }
        
        toast({
          title: "Subscription Error",
          description: errorMessage,
          variant: "destructive",
        });
        return false;
      }
      
      console.log('✅ [OneSignal] Player ID obtained:', {
        playerId: playerId.substring(0, 12) + '...',
        attempts: attempts + 1,
        serviceWorkerReady,
      });

      console.log('✅ [OneSignal] Subscribed successfully!', {
        playerId,
        permission: 'granted'
      });

      // ✅ CRITICAL: Save device FIRST, then update profile
      // This ensures Player ID is always stored before marking user as subscribed
      if (user?.id) {
        // ✅ STEP 1: MULTI-DEVICE SUPPORT - Store this device in device_subscriptions table (max 2 devices)
        // The database trigger will automatically deactivate the oldest device if user has >2
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isMobile = isIOS || isAndroid;
        
        // Detect browser
        let browserName = 'Other';
        if (navigator.userAgent.includes('Chrome') && !navigator.userAgent.includes('Edge')) {
          browserName = 'Chrome';
        } else if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
          browserName = 'Safari';
        } else if (navigator.userAgent.includes('Firefox')) {
          browserName = 'Firefox';
        } else if (navigator.userAgent.includes('Edge')) {
          browserName = 'Edge';
        }

        // Generate human-readable device name
        let deviceName = 'Unknown Device';
        if (isIOS) {
          if (navigator.userAgent.includes('iPad')) {
            deviceName = 'iPad';
          } else {
            deviceName = 'iPhone';
          }
          deviceName += ` (${browserName} PWA)`;
        } else if (isAndroid) {
          deviceName = `Android (${browserName})`;
        } else if (navigator.platform.includes('Mac')) {
          deviceName = `Mac (${browserName})`;
        } else if (navigator.platform.includes('Win')) {
          deviceName = `Windows (${browserName})`;
        } else if (navigator.platform.includes('Linux')) {
          deviceName = `Linux (${browserName})`;
        } else {
          deviceName = `${navigator.platform} (${browserName})`;
        }

        const deviceInfo = {
          platform: navigator.platform,
          userAgent: navigator.userAgent,
          isMobile,
          browserName,
          language: navigator.language,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          isIOS,
          isAndroid,
          isPWA,
        };

        // Create a stable device fingerprint based on browser characteristics
        const fingerprintSource = `${navigator.userAgent}_${navigator.platform}_${window.screen.width}x${window.screen.height}_${user.id}`;
        const deviceFingerprint = btoa(fingerprintSource).substring(0, 50);

        const { data: deviceData, error: deviceError } = await supabase
          .from('device_subscriptions')
          .upsert({
            user_id: user.id,
            device_fingerprint: deviceFingerprint,
            onesignal_player_id: playerId,
            device_info: deviceInfo,
            device_name: deviceName,
            browser_name: browserName,
            platform: navigator.platform,
            is_mobile: isMobile,
            is_active: true,
            last_seen_at: new Date().toISOString(),
          }, {
            onConflict: 'device_fingerprint',
          })
          .select('id')
          .single();

        if (deviceError) {
          console.error('❌ [Database] Failed to save device subscription:', deviceError);
        } else {
          console.log('✅ [Database] Saved device subscription:', {
            playerId,
            deviceName,
            platform: navigator.platform,
            isMobile,
          });
          
          // Check how many active devices user now has
          const { data: activeDevices, error: countError } = await supabase
            .from('device_subscriptions')
            .select('id, device_name, onesignal_player_id')
            .eq('user_id', user.id)
            .eq('is_active', true);
          
          if (!countError && activeDevices) {
            console.log(`📱 [Devices] User now has ${activeDevices.length}/2 active devices:`, 
              activeDevices.map(d => d.device_name));
          }
        }

        // ✅ STEP 2: Update profile ONLY AFTER device is saved with Player ID
        // This ensures xeon_stream_subscription is only true when we have a valid Player ID
        if (!deviceError) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ 
              xeon_stream_subscription: true,
              device_token: playerId,
              device_platform: 'web',
              device_token_updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

          if (profileError) {
            console.error('❌ [Database] Failed to update profile:', profileError);
          } else {
            console.log('✅ [Database] Updated profile subscription (Player ID verified)');
          }
        } else {
          console.error('❌ [Database] Skipping profile update - device save failed');
          toast({
            title: "Subscription Incomplete",
            description: "Device registered but profile update failed. Please try again.",
            variant: "destructive",
          });
          return false;
        }

        // ✅ STEP 3: AUTO-SUBSCRIBE to ALL signal providers
        try {
          const { data: providers, error: providersError } = await supabase
            .from('profiles')
            .select('id')
            .or('user_type.eq.educator,user_type.eq.admin');

          if (providersError) {
            console.error('❌ [Auto-Subscribe] Failed to fetch providers:', providersError);
          } else if (providers && providers.length > 0) {
            const subscriptions = providers.map(provider => ({
              user_id: user.id,
              provider_id: provider.id,
              is_active: true,
              subscribed_at: new Date().toISOString(),
            }));

            const { error: subscribeError } = await supabase
              .from('signal_subscriptions')
              .upsert(subscriptions, {
                onConflict: 'user_id,provider_id',
                ignoreDuplicates: false,
              });

            if (subscribeError) {
              console.error('❌ [Auto-Subscribe] Failed to create subscriptions:', subscribeError);
            } else {
              console.log(`✅ [Auto-Subscribe] Subscribed to ${providers.length} signal providers`);
            }
          }
        } catch (autoSubError) {
          console.error('❌ [Auto-Subscribe] Error:', autoSubError);
          // Don't fail the entire subscription if this fails
        }

        // ✅ Welcome notification is handled automatically by OneSignal Dashboard configuration
        // See: OneSignal Dashboard → Settings → Welcome Notification
        // Message: "You have now enabled Trade Alerts, TP Hits, and Market Updates. 🔔"
        console.log('🎉 [Welcome] OneSignal will send welcome notification automatically');
      }

      setIsPushEnabled(true);

      toast({
        title: "Push Notifications Enabled! 🎉",
        description: "You'll now receive instant trade alerts, TP hits, and market updates.",
      });

      return true;
    } catch (error: any) {
      console.error('❌ [OneSignal] Subscription failed:', error);
      
      toast({
        title: "Subscription Failed",
        description: error.message || "Could not enable push notifications.",
        variant: "destructive",
      });

      return false;
    }
  }, [isInitialized, toast, user]);

  // Unsubscribe from push notifications
  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    if (!isInitialized) {
      console.error('❌ [OneSignal] SDK not initialized');
      return false;
    }

    try {
      console.log('🔕 [OneSignal] Unsubscribing...');

      // Opt out of push notifications
      await window.OneSignal.User.PushSubscription.optOut();

      console.log('✅ [OneSignal] Unsubscribed successfully');

      // ✅ CRITICAL FIX: Update database to mark user as not push-enabled + clear Player ID
      if (user?.id) {
        // Deactivate this specific device
        const fingerprintSource = `${navigator.userAgent}_${navigator.platform}_${window.screen.width}x${window.screen.height}_${user.id}`;
        const deviceFingerprint = btoa(fingerprintSource).substring(0, 50);
        
        const { error: deviceError } = await supabase
          .from('device_subscriptions')
          .update({ 
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('device_fingerprint', deviceFingerprint);

        if (deviceError) {
          console.error('❌ [Database] Failed to deactivate device:', deviceError);
        } else {
          console.log('✅ [Database] Deactivated device subscription');
        }

        // Check if user has any other active devices
        const { data: activeDevices, error: countError } = await supabase
          .from('device_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true);

        // Only clear profile subscription if NO active devices remain
        if (!countError && (!activeDevices || activeDevices.length === 0)) {
          const { error } = await supabase
            .from('profiles')
            .update({ 
              xeon_stream_subscription: false,
              device_token: null,
              device_platform: null,
              device_token_updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

          if (error) {
            console.error('❌ [Database] Failed to update profile subscription:', error);
          } else {
            console.log('✅ [Database] Updated profile subscription to false (no active devices)');
          }
        } else {
          console.log(`📱 [Devices] User still has ${activeDevices?.length || 0} active device(s)`);
        }
      }

      setIsPushEnabled(false);

      toast({
        title: "Push Notifications Disabled",
        description: "You won't receive push notifications anymore.",
      });

      return true;
    } catch (error: any) {
      console.error('❌ [OneSignal] Unsubscribe failed:', error);
      
      toast({
        title: "Unsubscribe Failed",
        description: error.message || "Could not disable push notifications.",
        variant: "destructive",
      });

      return false;
    }
  }, [isInitialized, toast, user]);

  // Get current OneSignal user ID
  const getUserId = useCallback(async (): Promise<string | null> => {
    if (!isInitialized) {
      return null;
    }

    try {
      const userId = await window.OneSignal.User.PushSubscription.id;
      return userId;
    } catch (error) {
      console.error('❌ [OneSignal] Failed to get user ID:', error);
      return null;
    }
  }, [isInitialized]);

  // Diagnostic function to troubleshoot push notification issues
  const runDiagnostics = useCallback(async (): Promise<PushDiagnostics> => {
    const issues: string[] = [];
    
    // Check secure context (HTTPS)
    const isSecureContext = window.isSecureContext;
    if (!isSecureContext) {
      issues.push('Not running in secure context (HTTPS required)');
    }

    // Check service worker support
    const serviceWorkerSupported = 'serviceWorker' in navigator;
    if (!serviceWorkerSupported) {
      issues.push('Service Worker not supported in this browser');
    }

    // Check service worker registration
    let serviceWorkerRegistered = false;
    if (serviceWorkerSupported) {
      try {
        const registration = await navigator.serviceWorker.getRegistration('/');
        serviceWorkerRegistered = !!registration;
        if (!serviceWorkerRegistered) {
          issues.push('OneSignal Service Worker not registered');
        }
      } catch {
        issues.push('Failed to check Service Worker registration');
      }
    }

    // Check notification permission
    let notificationPermission: NotificationPermission | 'unsupported' = 'unsupported';
    if ('Notification' in window) {
      notificationPermission = Notification.permission;
      if (notificationPermission === 'denied') {
        issues.push('Notification permission denied by user');
      } else if (notificationPermission === 'default') {
        issues.push('Notification permission not yet requested');
      }
    } else {
      issues.push('Notifications not supported in this browser');
    }

    // Check iOS/PWA status
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || isInStandaloneMode;
    
    if (isIOS && !isPWA) {
      issues.push('iOS requires PWA mode (Add to Home Screen)');
    }

    // Check OneSignal status
    const oneSignalLoaded = typeof window.OneSignal !== 'undefined';
    if (!oneSignalLoaded) {
      issues.push('OneSignal SDK not loaded');
    }

    let oneSignalInitialized = false;
    let isOptedIn = false;
    let playerId: string | null = null;

    if (oneSignalLoaded) {
      try {
        // Check if initialized by trying to access subscription
        isOptedIn = await window.OneSignal.User.PushSubscription.optedIn;
        oneSignalInitialized = true;
        
        if (isOptedIn) {
          playerId = await window.OneSignal.User.PushSubscription.id;
          if (!playerId) {
            issues.push('Opted in but no Player ID - possible sync issue');
          }
        } else {
          issues.push('User not opted in to push notifications');
        }
      } catch (e) {
        issues.push('OneSignal SDK not fully initialized');
      }
    }

    const diagnostics: PushDiagnostics = {
      isSecureContext,
      serviceWorkerSupported,
      serviceWorkerRegistered,
      notificationPermission,
      oneSignalLoaded,
      oneSignalInitialized,
      isOptedIn,
      playerId,
      isIOS,
      isPWA,
      issues,
    };

    console.log('🔍 [OneSignal Diagnostics]', diagnostics);
    
    return diagnostics;
  }, []);

  return {
    isInitialized,
    isPushEnabled,
    subscribeToPush,
    unsubscribeFromPush,
    getUserId,
    runDiagnostics,
  };
};

