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
// 📱 PLATFORM DETECTION - iOS, Android, Desktop
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function detectPlatform(): 'ios' | 'android' | 'web' | 'desktop' {
  const ua = navigator.userAgent.toLowerCase();
  
  // iOS detection (iPhone, iPad, iPod)
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'ios';
  }
  
  // Android detection
  if (/android/.test(ua)) {
    return 'android';
  }
  
  // Check if running as PWA on desktop
  const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator as any).standalone === true;
  
  // Desktop detection
  if (/windows|macintosh|linux/.test(ua) && !/mobile/.test(ua)) {
    return isPWA ? 'desktop' : 'web';
  }
  
  // Default to web for other cases (tablets, etc.)
  return 'web';
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
          safari_web_id: "web.onesignal.auto.18b6e18e-7804-46d0-9cf7-7a5dce161e98", // ✅ Verified from OneSignal Dashboard
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

        // ✅ CRITICAL: Login to OneSignal with Supabase User ID
        // This associates the user with their OneSignal subscription
        // Per Supabase Guide: https://supabase.com/partners/integrations/onesignal
        try {
          await window.OneSignal.login(user.id);
          console.log('✅ [OneSignal] Logged in with Supabase User ID:', user.id?.substring(0, 8));
        } catch (loginError: any) {
          // Login may fail if already logged in, which is fine
          if (!loginError.message?.includes('already logged in')) {
            console.warn('⚠️ [OneSignal] Login warning:', loginError.message);
          }
        }

        // Check current subscription status
        const permission = await window.OneSignal.Notifications.permission;
        const isSubscribed = await window.OneSignal.User.PushSubscription.optedIn;
        
        console.log('📊 [OneSignal] Permission:', permission, 'Subscribed:', isSubscribed);
        
        if (isSubscribed) {
          setIsPushEnabled(true);
          
          // Detect platform for accurate tracking
          const platform = detectPlatform();
          
          // Update database - we now use External User ID (Supabase User ID) for notifications
          // So we just need to mark the user as subscribed
          const { error } = await supabase
            .from('profiles')
            .update({ 
              xeon_stream_subscription: true,
              device_platform: platform,
              device_token_updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);
          
          if (error) {
            console.error('❌ [Database] Failed to sync subscription:', error);
          } else {
            console.log('✅ [Database] Synced subscription, Platform:', platform);
          }
        } else {
          setIsPushEnabled(false);
        }

        // Listen for subscription changes
        window.OneSignal.User.PushSubscription.addEventListener('change', async (event: any) => {
          console.log('🔔 [OneSignal] Subscription changed:', event);
          const isNowSubscribed = event.current.optedIn;
          setIsPushEnabled(isNowSubscribed);
          
          // Detect platform for accurate tracking
          const platform = detectPlatform();
          
          const { error } = await supabase
            .from('profiles')
            .update({ 
              xeon_stream_subscription: isNowSubscribed,
              device_platform: isNowSubscribed ? platform : null,
              device_token_updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);
          
          if (error) {
            console.error('❌ [Database] Failed to update subscription:', error);
          } else {
            console.log(`✅ [Database] Updated subscription to ${isNowSubscribed}, Platform: ${platform}`);
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
    // Platform detection
    const platform = detectPlatform();
    const isIOS = platform === 'ios';
    const isAndroid = platform === 'android';
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || isInStandaloneMode;
    
    // iOS requires PWA installation for push notifications
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
        platform,
        isIOS,
        isAndroid, 
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
        
        // Platform-specific permission instructions
        let permissionInstructions = "Please enable notifications in your browser settings.";
        if (isIOS) {
          permissionInstructions = "Enable notifications in iOS Settings → Trade Imperial → Notifications";
        } else if (isAndroid) {
          permissionInstructions = "Enable notifications in Android Settings → Apps → Trade Imperial → Notifications";
        }
        
        toast({
          title: "Permission Denied",
          description: permissionInstructions,
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
      
      // Step 2: Login with Supabase User ID (CRITICAL for External User ID targeting)
      // Per Supabase Guide: https://supabase.com/partners/integrations/onesignal
      if (user?.id) {
        try {
          console.log('🔐 [OneSignal] Logging in with Supabase User ID...');
          await window.OneSignal.login(user.id);
          console.log('✅ [OneSignal] Logged in with Supabase User ID:', user.id.substring(0, 8));
        } catch (loginError: any) {
          // Login may fail if already logged in, which is fine
          if (!loginError.message?.includes('already logged in')) {
            console.warn('⚠️ [OneSignal] Login warning (non-blocking):', loginError.message);
          }
        }
      }
      
      // Step 3: Check notification permission status
      const permission = await window.OneSignal.Notifications.permission;
      console.log('🔍 [OneSignal] Permission status:', permission);
      
      if (permission === false || permission === 'denied') {
        // Permission was denied
        let permissionInstructions = "Please enable notifications in your browser settings.";
        if (isIOS) {
          permissionInstructions = "Enable notifications in iOS Settings → Trade Imperial → Notifications";
        } else if (isAndroid) {
          permissionInstructions = "Enable notifications in your browser settings → Site settings → Notifications";
        }
        
        toast({
          title: "Permission Denied",
          description: permissionInstructions,
          variant: "destructive",
        });
        return false;
      }
      
      // Step 4: Brief delay to allow OneSignal to process, then verify
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const isSubscribed = await window.OneSignal.User.PushSubscription.optedIn;
      console.log('🔔 [OneSignal] Subscription status:', isSubscribed);
      
      console.log('✅ [OneSignal] Subscribed successfully!', {
        userId: user?.id?.substring(0, 12),
        platform,
        isPWA,
      });

      // ✅ Update profile to mark user as subscribed
      // We use External User IDs (Supabase UIDs) so we don't need to store Player IDs
      // OneSignal handles device tracking via OneSignal.login(uid)
      if (user?.id) {
        const devicePlatform = detectPlatform();
        
        // Simply mark the user as subscribed in the profile
        // OneSignal.login(uid) handles the device-to-user association
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            xeon_stream_subscription: true,
            device_platform: devicePlatform,
            device_token_updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (profileError) {
          console.error('❌ [Database] Failed to update profile:', profileError);
          // Don't fail - OneSignal still works via External User ID
        } else {
          console.log('✅ [Database] Updated profile subscription:', {
            xeon_stream_subscription: true,
            platform: devicePlatform,
          });
        }

        // ✅ AUTO-SUBSCRIBE to ALL signal providers
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

      // ✅ CRITICAL: Update database to mark user as not push-enabled + clear Player ID
      // Track if database operations succeed
      let databaseUpdateSucceeded = true;
      
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
          databaseUpdateSucceeded = false;
        } else {
          console.log('✅ [Database] Deactivated device subscription');
        }

        // Check if user has any other active devices
        const { data: activeDevices, error: countError } = await supabase
          .from('device_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (countError) {
          console.error('❌ [Database] Failed to check active devices:', countError);
          databaseUpdateSucceeded = false;
        }

        // Only clear profile subscription if NO active devices remain
        if (!countError && (!activeDevices || activeDevices.length === 0)) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ 
              xeon_stream_subscription: false,
              device_token: null,
              device_platform: null,
              device_token_updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);

          if (profileError) {
            console.error('❌ [Database] Failed to update profile subscription:', profileError);
            databaseUpdateSucceeded = false;
          } else {
            console.log('✅ [Database] Updated profile subscription to false (no active devices)');
          }
        } else if (!countError) {
          console.log(`📱 [Devices] User still has ${activeDevices?.length || 0} active device(s)`);
        }
      }

      // ✅ FIX: Only mark as successful if both OneSignal AND database operations succeeded
      if (!databaseUpdateSucceeded) {
        console.warn('⚠️ [Unsubscribe] OneSignal succeeded but database sync failed');
        toast({
          title: "Partial Unsubscribe",
          description: "Push disabled locally but database sync failed. You may still receive some notifications.",
          variant: "destructive",
        });
        
        // Still set UI state to disabled since OneSignal unsubscribe worked
        setIsPushEnabled(false);
        return false; // Return false because database sync failed
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

