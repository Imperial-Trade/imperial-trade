/**
 * Enhanced OneSignal Hook with iOS PWA Player ID Management
 * CRITICAL FIX: Addresses 85.7% auto-trigger failure rate with comprehensive debugging
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { withTimeout } from "@/api/client/utils/timeout";
import { detectBrowser, getBrowserSpecificConfig, getBrowserInstructions } from "@/utils/browserDetection";
import { detectSafariPWA } from "@/utils/safariPWADetection";
import { 
  generateDeviceFingerprint, 
  getStoredDeviceFingerprint, 
  storeDeviceFingerprint,
  checkDeviceSubscriptionStatus,
  setDeviceSubscriptionStatus,
  type DeviceInfo 
} from "@/utils/deviceFingerprint";

declare global {
  interface Window {
    OneSignal?: any;
  }
}

export function useOneSignalEnhanced() {
  const { user, profile } = useAuth();
  const [initialized, setInitialized] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  
  const [hasSubscription, setHasSubscription] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [deviceHasSubscription, setDeviceHasSubscription] = useState(false);
  const isIframeBlocked = typeof window !== 'undefined' && window.self !== window.top;
  const debug = (() => { try { return localStorage.getItem('onesignal_debug') === '1'; } catch { return false; } })();
  
  // Enhanced browser and PWA detection
  const browserInfo = typeof window !== 'undefined' ? detectBrowser() : { 
    name: 'Unknown', 
    version: '0', 
    isSupported: false, 
    isMobile: false, 
    requiresSpecialHandling: true,
    isIOS: false,
    isIOSWebPushSupported: false,
    isPWACapable: false,
    isStandalone: false,
    isInAppBrowser: false
  };
  
  const safariPWAInfo = detectSafariPWA();
  const browserConfig = getBrowserSpecificConfig(browserInfo);
  const isGranted = permission === 'granted' && hasSubscription;

  useEffect(() => {
    let cancelled = false;

    const setupOneSignal = async () => {
      try {
        // **CROSS-DEVICE FIX: Generate device fingerprint first**
        const currentDeviceInfo = generateDeviceFingerprint();
        setDeviceInfo(currentDeviceInfo);
        
        let storedFingerprint = getStoredDeviceFingerprint();
        if (!storedFingerprint) {
          storeDeviceFingerprint(currentDeviceInfo.fingerprint);
          storedFingerprint = currentDeviceInfo.fingerprint;
        }

        // **CRITICAL DEBUG: Enhanced logging for auto-trigger failure analysis**
        console.info(`[OneSignal CROSS-DEVICE DEBUG] Starting initialization for user: ${user?.id?.substring(0, 8)}...`);
        console.info(`[OneSignal CROSS-DEVICE DEBUG] Device fingerprint: ${currentDeviceInfo.fingerprint}`);
        console.info(`[OneSignal CROSS-DEVICE DEBUG] Browser: ${browserInfo.name} ${browserInfo.version}, Mobile: ${browserInfo.isMobile}, Supported: ${browserInfo.isSupported}`);
        console.info(`[OneSignal CROSS-DEVICE DEBUG] Current permission: ${permission}, hasSubscription: ${hasSubscription}`);
        console.info(`[OneSignal CROSS-DEVICE DEBUG] Profile status: push_active=${profile?.push_subscription_active}, player_id=${profile?.onesignal_player_id ? 'exists' : 'missing'}`);

        // Check browser compatibility first
        if (!browserInfo.isSupported) {
          console.warn(`[OneSignal] Browser ${browserInfo.name} ${browserInfo.version} is not supported for push notifications`);
          return;
        }

        // **CROSS-DEVICE FIX: Check device-specific subscription status**
        if (user?.id) {
          const deviceHasSub = await checkDeviceSubscriptionStatus(user.id, currentDeviceInfo.fingerprint);
          setDeviceHasSubscription(deviceHasSub);
          console.info(`[OneSignal CROSS-DEVICE DEBUG] Device subscription status: ${deviceHasSub}`);
        }

        if (debug) console.info(`[OneSignal] Initializing for ${browserInfo.name} ${browserInfo.version}${browserInfo.isMobile ? ' (mobile)' : ''}`);

        // **PHASE 1: Enhanced Configuration Loading**
        let configData = null;
        let configAttempts = 0;
        const maxConfigAttempts = 3;
        
        while (configAttempts < maxConfigAttempts && !configData) {
          configAttempts++;
          try {
            if (debug) console.info(`[OneSignal] Loading config (attempt ${configAttempts}/${maxConfigAttempts})`);
            
            const { data, error } = await withTimeout(
              supabase.functions.invoke("onesignal-config", { method: "GET" }),
              10000
            );
            
            if (error) {
              console.warn(`[OneSignal] Config error (attempt ${configAttempts}):`, error);
              if (configAttempts === maxConfigAttempts) {
                throw new Error(`Configuration failed after ${maxConfigAttempts} attempts: ${error.message || 'Unknown error'}`);
              }
              await new Promise(r => setTimeout(r, 1000 * configAttempts));
              continue;
            }
            
            if (!data?.appId) {
              console.warn(`[OneSignal] Invalid config data (attempt ${configAttempts}):`, data);
              if (configAttempts === maxConfigAttempts) {
                throw new Error('OneSignal App ID not found in configuration');
              }
              await new Promise(r => setTimeout(r, 1000 * configAttempts));
              continue;
            }
            
            configData = data;
            if (debug) console.info('[OneSignal] Configuration loaded successfully:', { appId: data.appId });
            
          } catch (configError) {
            console.warn(`[OneSignal] Config attempt ${configAttempts} failed:`, configError);
            if (configAttempts === maxConfigAttempts) {
              console.error('[OneSignal] All configuration attempts failed. Please check Supabase secrets.');
              return;
            }
            await new Promise(r => setTimeout(r, 1000 * configAttempts));
          }
        }
        
        if (!configData) {
          console.error('[OneSignal] Failed to load configuration after all attempts');
          return;
        }

        // Inject OneSignal SDK script
        await new Promise<void>((resolve, reject) => {
          if (document.getElementById("onesignal-sdk")) {
            if (debug) console.info('[OneSignal] SDK script already loaded');
            return resolve();
          }
          
          const script = document.createElement("script");
          script.id = "onesignal-sdk";
          script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
          script.async = true;
          script.onload = () => {
            if (debug) console.info('[OneSignal] SDK script loaded successfully');
            resolve();
          };
          script.onerror = (e) => {
            console.error('[OneSignal] Failed to load SDK script:', e);
            reject(new Error("Failed to load OneSignal SDK"));
          };
          document.head.appendChild(script);
        });

        if (cancelled) return;

        // **PHASE 2: Enhanced OneSignal SDK Initialization**
        if (typeof window !== 'undefined') {
          window.OneSignal = window.OneSignal || ([] as any[]);
          
          // Prevent multiple initializations
          if ((window as any).OneSignal?.__IMPERIAL_INIT_DONE__) {
            if (debug) console.info('[OneSignal] Already initialized, checking ready state');
            
            try {
              const isReady = !!(window as any).OneSignal?.Notifications;
              if (isReady) {
                setInitialized(true);
                return;
              } else {
                console.warn('[OneSignal] Previous initialization not functional, reinitializing');
                (window as any).OneSignal.__IMPERIAL_INIT_DONE__ = false;
              }
            } catch (e) {
              console.warn('[OneSignal] Error checking previous initialization:', e);
              (window as any).OneSignal.__IMPERIAL_INIT_DONE__ = false;
            }
          }

          // Enhanced SDK initialization with comprehensive error handling
          const initPromise = new Promise<void>((resolve, reject) => {
            try {
              window.OneSignal.push(function () {
                try {
                  const initConfig = {
                    appId: configData.appId,
                    allowLocalhostAsSecureOrigin: true,
                    autoRegister: false,
                    autoResubscribe: false,
                    notifyButton: { enable: false },
                    bell: { enabled: false },
                    showCredit: false,
                    // **CRITICAL FIX: Enhanced native slidedown prompt configuration**
                    promptOptions: {
                      slidedown: {
                        enabled: true,
                        actionMessage: "Get instant alerts for premium trading signals and market opportunities! Stay ahead of the market with real-time notifications.",
                        acceptButtonText: "Enable Notifications", 
                        cancelButtonText: "Not Now",
                        displayPredicate: function() {
                          console.info('[OneSignal CRITICAL DEBUG] Slidedown display predicate called');
                          return true; // Always allow slidedown when triggered
                        }
                      }
                    }
                  };
                  
                  if (debug) console.info('[OneSignal] Initializing with config:', initConfig);
                  
                  (window as any).OneSignal.init(initConfig);
                  (window as any).OneSignal.__IMPERIAL_INIT_DONE__ = true;
                  
                  setTimeout(() => {
                    try {
                      const isReady = !!(window as any).OneSignal?.Notifications && !!(window as any).OneSignal?.User;
                      if (isReady) {
                        if (debug) console.info('[OneSignal] Initialization verified successfully');
                        resolve();
                      } else {
                        console.warn('[OneSignal] Initialization completed but SDK not fully ready');
                        reject(new Error('SDK initialization incomplete'));
                      }
                    } catch (e) {
                      console.error('[OneSignal] Post-initialization verification failed:', e);
                      reject(e);
                    }
                  }, 500);
                  
                } catch (initError) {
                  console.error('[OneSignal] Initialization error:', initError);
                  reject(initError);
                }
              });
            } catch (pushError) {
              console.error('[OneSignal] Failed to push initialization function:', pushError);
              reject(pushError);
            }
          });
          
          await withTimeout(initPromise, 10000).catch(timeoutError => {
            console.error('[OneSignal] Initialization timeout:', timeoutError);
            throw timeoutError;
          });
        }

        // **PHASE 3: Enhanced User Linking and Permission Observation**
        window.OneSignal.push(function () {
          try {
            // Enhanced permission change listener
            const handlePermissionChange = () => {
              try { 
                if (typeof Notification !== 'undefined') {
                  const newPermission = Notification.permission;
                  setPermission(newPermission);
                  if (debug) console.info('[OneSignal] Permission changed to:', newPermission);
                }
              } catch (e) {
                console.warn('[OneSignal] Permission change handler error:', e);
              }
            };

            (window as any).OneSignal.Notifications?.addEventListener?.("permissionChange", handlePermissionChange);

            // **Enhanced push subscription tracking with Player ID capture**
            const ps = (window as any).OneSignal?.User?.PushSubscription;
            if (ps) {
              try {
                const updateSubscriptionState = () => {
                  try {
                    const id = ps.id;
                    const optedIn = ps.optedIn;
                    const hasValidSub = !!(optedIn ?? id);
                    
                    setHasSubscription(hasValidSub);
                    
                    if (debug) console.info('[OneSignal] Subscription state updated:', { 
                      id, optedIn, hasValidSub, browser: browserInfo.name,
                      isIOSPWA: safariPWAInfo.isSafariPWA
                    });

                    // CRITICAL: Capture and store Player ID immediately when subscription is active
                    if (hasValidSub && id && user?.id) {
                      console.log('[OneSignal] Player ID captured:', id.substring(0, 8) + '...', 
                        safariPWAInfo.isSafariPWA ? '(iOS PWA)' : '(Standard Web)');
                      
                      // Sequential Player ID capture with validation
                      captureAndStorePlayerIdSequential(id);
                    }
                  } catch (e) {
                    console.warn('[OneSignal] Subscription state update error:', e);
                  }
                };

                // Initial state
                updateSubscriptionState();
                
                // Listen for changes
                ps.addEventListener?.('change', updateSubscriptionState);
              } catch (e) {
                console.warn('[OneSignal] Subscription listener setup error:', e);
              }
            }

            // **User login and identity management**
            if (user?.id) {
              (window as any).OneSignal.login(user.id);
              console.log(`[OneSignal] User logged in with external_id: ${user.id}`);
              
              // Create/update user in backend
              ensureOneSignalUser().then(success => {
                if (success) {
                  console.log('[OneSignal] User creation/update successful');
                } else {
                  console.warn('[OneSignal] User creation/update failed');
                }
              }).catch(err => {
                console.warn('[OneSignal] User creation/update error:', err);
              });
              
              // Apply identity and tags
              const applyIdentity = async () => {
                try {
                  if (user?.email) {
                    const osUser = (window as any).OneSignal?.User;
                    if (osUser?.addEmail) {
                      await osUser.addEmail(user.email);
                      if (debug) console.info('[OneSignal] Email identity attached:', user.email);
                    }
                  }
                  
                   // Minimal tags to avoid OneSignal plan limits
                   const tags: Record<string, string> = {
                    platform: safariPWAInfo.isIOS ? 'ios' : 'web'
                  };
                  if (profile?.role) tags["role"] = String(profile.role);
                  
                  if (Object.keys(tags).length > 0) {
                    if ((window as any).OneSignal.User?.addTags) {
                      await (window as any).OneSignal.User.addTags(tags);
                    } else if ((window as any).OneSignal.sendTags) {
                      await (window as any).OneSignal.sendTags(tags);
                    }
                  }
                } catch (err) {
                  console.warn('[OneSignal] Identity/tags error:', err);
                }
              };
              
              applyIdentity();
            }
          } catch (e) {
            console.error('[OneSignal] Setup error:', e);
          }
        });

        setInitialized(true);
        console.info('[OneSignal CRITICAL DEBUG] Setup completed - triggering auto-prompt check');
        
        // **CRITICAL FIX: Enhanced auto-trigger with comprehensive debugging**
        if (user?.id) {
          setTimeout(() => {
            console.info('[OneSignal CRITICAL DEBUG] Auto-trigger delay expired, checking conditions...');
            triggerNativePromptIfEligible();
          }, 2000); // Ensure OneSignal is fully ready
        }

      } catch (error) {
        console.error('[OneSignal] Setup failed:', error);
      }
    };

    setupOneSignal();
    return () => {
      cancelled = true;
    };
  }, [user?.id, profile?.role, profile?.user_type, browserInfo.name]);
  
  // **CRITICAL: Sequential Player ID Capture with Upsert Logic - Prevents race conditions**
  const captureAndStorePlayerIdSequential = async (playerId: string): Promise<boolean> => {
    try {
      if (!user?.id || !playerId) {
        console.warn('[OneSignal] Missing user ID or player ID for capture');
        return false;
      }

      console.log('[OneSignal] Sequential Player ID capture:', playerId.substring(0, 8) + '...');

      // Step 1: Verify OneSignal initialization
      if (!(window as any).OneSignal?.User?.PushSubscription?.id) {
        console.warn('[OneSignal] OneSignal not ready for Player ID capture, retrying...');
        await new Promise(r => setTimeout(r, 1000));
        
        if (!(window as any).OneSignal?.User?.PushSubscription?.id) {
          console.error('[OneSignal] OneSignal still not ready after retry');
          return false;
        }
      }

      // Step 2: Upsert device subscription directly with conflict resolution
      if (deviceInfo) {
        try {
          const { error: deviceError } = await supabase
            .from('device_subscriptions')
            .upsert({
              user_id: user.id,
              device_fingerprint: deviceInfo.fingerprint,
              onesignal_player_id: playerId,
              browser_name: deviceInfo.browserName,
              browser_version: deviceInfo.browserVersion,
              platform: deviceInfo.platform,
              is_mobile: deviceInfo.isMobile,
              device_info: deviceInfo as any, // Cast to any to match Json type
              is_active: true,
              last_seen_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,device_fingerprint',
              ignoreDuplicates: false
            });

          if (deviceError) {
            console.error('[OneSignal] Device subscription upsert failed:', deviceError);
          } else {
            console.log('[OneSignal] ✓ Device subscription upserted successfully');
          }
        } catch (deviceUpsertError) {
          console.error('[OneSignal] Device upsert error:', deviceUpsertError);
        }
      }

      // Step 3: Backend sync with retry logic
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        attempts++;
        
        try {
          const { data, error } = await withTimeout(
            supabase.functions.invoke('onesignal-upsert-user', {
              body: {
                user_id: user.id,
                email: user.email,
                player_id: playerId,
                device_fingerprint: deviceInfo?.fingerprint,
                device_info: deviceInfo ? {
                  browser_name: deviceInfo.browserName,
                  browser_version: deviceInfo.browserVersion,
                  platform: deviceInfo.platform,
                  is_mobile: deviceInfo.isMobile,
                  screen_resolution: deviceInfo.screenResolution,
                  timezone: deviceInfo.timezone,
                  language: deviceInfo.language
                } : {},
                tags: {
                  role: profile?.role || 'user',
                  platform: 'web' // Simplified to avoid tag limits
                }
              }
            }),
            10000
          );

          if (error) {
            console.warn(`[OneSignal] Attempt ${attempts}/${maxAttempts} failed:`, error);
            if (attempts === maxAttempts) {
              throw error;
            }
            await new Promise(r => setTimeout(r, 1000 * attempts));
            continue;
          }

          // Step 5: Verify database update
          const { data: verifyProfile } = await supabase
            .from('profiles')
            .select('onesignal_player_id')
            .eq('id', user.id)
            .single();

          if (verifyProfile?.onesignal_player_id === playerId) {
            console.log('[OneSignal] Player ID captured and verified successfully');
            return true;
          } else {
            console.warn('[OneSignal] Player ID verification failed, database not updated');
            if (attempts === maxAttempts) {
              return false;
            }
            await new Promise(r => setTimeout(r, 1000 * attempts));
          }
        } catch (err) {
          console.error(`[OneSignal] Capture attempt ${attempts} exception:`, err);
          if (attempts === maxAttempts) {
            throw err;
          }
          await new Promise(r => setTimeout(r, 1000 * attempts));
        }
      }

      return false;
    } catch (err) {
      console.error('[OneSignal] Player ID capture failed:', err);
      return false;
    }
  };

  // **Enhanced user creation/update with retry logic**
  const ensureOneSignalUser = async (): Promise<boolean> => {
    try {
      if (!user?.id) {
        console.warn('[OneSignal] No user ID for user creation');
        return false;
      }

      const tags: Record<string, string> = {};
      if (profile?.role) tags["role"] = String(profile.role);
      if (profile?.user_type) tags["user_type"] = String(profile.user_type);

      const { data, error } = await withTimeout(
        supabase.functions.invoke('onesignal-upsert-user', {
          body: {
            user_id: user.id,
            email: user.email,
            tags
          }
        }),
        10000
      );

      if (error) {
        console.error('[OneSignal] User creation failed:', error);
        return false;
      }

      if (debug) console.info('[OneSignal] User creation/update successful:', data);
      return true;
    } catch (err) {
      console.error('[OneSignal] User creation exception:', err);
      return false;
    }
  };

  // **Enhanced user creation with Player ID and modern OneSignal User Model**
  const ensureOneSignalUserWithPlayerId = async (playerId?: string): Promise<boolean> => {
    try {
      if (!user?.id) {
        console.warn('[OneSignal] No user ID for enhanced user creation');
        return false;
      }

      // Get current Player ID from OneSignal if not provided
      const currentPlayerId = playerId || (window as any).OneSignal?.User?.PushSubscription?.id;
      
      if (!currentPlayerId) {
        console.warn('[OneSignal] No Player ID available for enhanced user creation');
      }

      // Enhanced tags with device/browser information
      const tags: Record<string, string> = {
        platform: safariPWAInfo.isIOS ? 'ios' : 'web',
        browser: browserInfo.name,
        browser_version: browserInfo.version,
        is_pwa: safariPWAInfo.isSafariPWA ? 'true' : 'false',
        is_mobile: browserInfo.isMobile ? 'true' : 'false'
      };
      
      if (profile?.role) tags["role"] = String(profile.role);
      if (profile?.user_type) tags["user_type"] = String(profile.user_type);

      const { data, error } = await withTimeout(
        supabase.functions.invoke('onesignal-upsert-user', {
          body: {
            user_id: user.id,
            email: user.email,
            player_id: currentPlayerId,
            tags
          }
        }),
        15000
      );

      if (error) {
        console.error('[OneSignal] Enhanced user creation failed:', error);
        return false;
      }

      if (debug) console.info('[OneSignal] Enhanced user creation successful:', data);
      return true;
    } catch (err) {
      console.error('[OneSignal] Enhanced user creation exception:', err);
      return false;
    }
  };

  // **Subscription verification with detailed OneSignal status**
  const verifySubscription = async (): Promise<{ 
    isSubscribed: boolean; 
    playerId?: string; 
    details?: any 
  }> => {
    try {
      if (!user?.id) {
        return { isSubscribed: false, details: { error: 'No user ID' } };
      }

      const { data, error } = await withTimeout(
        supabase.functions.invoke('onesignal-verify-subscription', {
          body: { user_id: user.id }
        }),
        10000
      );

      if (error) {
        console.error('[OneSignal] Subscription verification failed:', error);
        return { isSubscribed: false, details: { error } };
      }

      const isSubscribed = data?.is_subscribed || false;
      const playerId = data?.player_id;

      if (debug) console.info('[OneSignal] Subscription verification:', { isSubscribed, playerId, data });
      
      return { isSubscribed, playerId, details: data };
    } catch (err) {
      console.error('[OneSignal] Subscription verification exception:', err);
      return { isSubscribed: false, details: { exception: err } };
    }
  };

  // **CRITICAL FIX: Enhanced permission request with comprehensive error handling and retry logic**
  const requestPermission = async (): Promise<{ 
    success: boolean; 
    error?: string; 
    details?: any 
  }> => {
    try {
      console.info('[OneSignal CRITICAL DEBUG] === PERMISSION REQUEST STARTED ===');
      
      if (!browserInfo.isSupported) {
        const error = `Browser ${browserInfo.name} ${browserInfo.version} is not supported`;
        console.warn('[OneSignal]', error);
        return { success: false, error, details: { browserInfo } };
      }

      if (isIframeBlocked) {
        const error = 'Cannot request permissions in iframe';
        console.warn('[OneSignal]', error);
        return { success: false, error, details: { isIframeBlocked: true } };
      }

      if (!(window as any).OneSignal?.Notifications) {
        const error = 'OneSignal not initialized';
        console.error('[OneSignal]', error);
        return { success: false, error, details: { initialized } };
      }

      // **CRITICAL FIX: Enhanced slidedown prompt with debugging**
      console.info('[OneSignal CRITICAL DEBUG] Requesting permission via slidedown...');
      
      const slidedownPromise = (window as any).OneSignal.Slidedown.promptPush();
      console.info('[OneSignal CRITICAL DEBUG] Slidedown.promptPush() called, waiting for response...');
      
      const result = await withTimeout(slidedownPromise, browserConfig.permissionTimeout);
      
      console.info('[OneSignal CRITICAL DEBUG] Slidedown response received:', result);

      if (result) {
        console.log('[OneSignal] Permission granted via slidedown');
        setPermission('granted');
        
        // Wait a moment for subscription to be established
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const ps = (window as any).OneSignal?.User?.PushSubscription;
        if (ps?.id && user?.id) {
          console.log('[OneSignal] Capturing Player ID after permission grant:', ps.id.substring(0, 8) + '...');
          await captureAndStorePlayerIdSequential(ps.id);
        }
        
        return { success: true, details: { method: 'slidedown', result } };
      } else {
        console.log('[OneSignal] Permission denied via slidedown');
        setPermission('denied');
        return { success: false, error: 'Permission denied', details: { method: 'slidedown', result } };
      }
    } catch (err: any) {
      console.error('[OneSignal CRITICAL DEBUG] Permission request failed:', err);
      
      // Fallback to browser native prompt for critical cases
      if (err.message?.includes('timeout') || err.message?.includes('slidedown')) {
        try {
          console.info('[OneSignal CRITICAL DEBUG] Trying fallback browser native prompt...');
          
          const nativePermission = await Notification.requestPermission();
          console.info('[OneSignal CRITICAL DEBUG] Native permission result:', nativePermission);
          
          setPermission(nativePermission);
          
          if (nativePermission === 'granted') {
            // Try to establish OneSignal subscription
            try {
              const ps = (window as any).OneSignal?.User?.PushSubscription;
              if (ps?.optIn) {
                await ps.optIn();
                console.log('[OneSignal] Subscription established via fallback');
              }
            } catch (subscribeErr) {
              console.warn('[OneSignal] Fallback subscription failed:', subscribeErr);
            }
            
            return { success: true, details: { method: 'native_fallback', permission: nativePermission } };
          } else {
            return { success: false, error: 'Permission denied via native prompt', details: { method: 'native_fallback', permission: nativePermission } };
          }
        } catch (nativeErr) {
          console.error('[OneSignal] Native fallback also failed:', nativeErr);
          return { success: false, error: err.message || 'Permission request failed', details: { originalError: err, fallbackError: nativeErr } };
        }
      } else {
        return { success: false, error: err.message || 'Unknown error', details: { error: err } };
      }
    }
  };

  // **CROSS-DEVICE FIX: Enhanced auto-trigger with device-specific eligibility**
  const triggerNativePromptIfEligible = async () => {
    try {
      console.info('[OneSignal CROSS-DEVICE DEBUG] === AUTO-TRIGGER ELIGIBILITY CHECK ===');
      
      // Check device-specific subscription status
      let deviceNeedsPrompt = true;
      if (user?.id && deviceInfo?.fingerprint) {
        try {
          const { data } = await supabase
            .rpc('should_show_onesignal_prompt', {
              p_user_id: user.id,
              p_device_fingerprint: deviceInfo.fingerprint
            });
          deviceNeedsPrompt = data === true;
          console.info(`[OneSignal CROSS-DEVICE DEBUG] Device needs prompt (DB check): ${deviceNeedsPrompt}`);
        } catch (dbError) {
          console.warn('[OneSignal CROSS-DEVICE DEBUG] Device DB check failed, defaulting to local check:', dbError);
        }
      }
      
      // Debug all conditions in detail
      const conditions = {
        initialized: initialized,
        userExists: !!user?.id,
        oneSignalReady: !!(window as any).OneSignal?.Notifications,
        permission: permission,
        hasSubscription: hasSubscription,
        deviceHasSubscription: deviceHasSubscription,
        deviceNeedsPrompt: deviceNeedsPrompt,
        browserSupported: browserInfo.isSupported,
        notIframeBlocked: !isIframeBlocked,
        hasDeviceInfo: !!deviceInfo?.fingerprint
      };
      
      console.info('[OneSignal CROSS-DEVICE DEBUG] Condition details:', conditions);
      
      // **CROSS-DEVICE LOGIC: Check device-specific status instead of global profile**
      const shouldAutoPrompt = (
        conditions.initialized && 
        conditions.userExists && 
        conditions.oneSignalReady &&
        conditions.permission === 'default' && 
        !conditions.hasSubscription && 
        !conditions.deviceHasSubscription &&
        conditions.deviceNeedsPrompt &&
        conditions.browserSupported &&
        conditions.notIframeBlocked &&
        conditions.hasDeviceInfo
      );
      
      console.info(`[OneSignal CRITICAL DEBUG] Should auto-prompt: ${shouldAutoPrompt}`);
      
      if (shouldAutoPrompt) {
        console.info('[OneSignal CRITICAL DEBUG] ✅ All conditions met - triggering native prompt');
        
        const result = await requestPermission();
        console.info('[OneSignal CROSS-DEVICE DEBUG] Auto-trigger result:', result);
        
        // **CROSS-DEVICE FIX: Store device subscription status on success**
        if (result.success && user?.id && deviceInfo?.fingerprint) {
          try {
            setDeviceSubscriptionStatus(user.id, deviceInfo.fingerprint, true);
            console.info('[OneSignal CROSS-DEVICE DEBUG] Device subscription status stored locally');
            
            // Store in database
            const { data: playerId } = await supabase
              .from('device_subscriptions')
              .insert({
                user_id: user.id,
                device_fingerprint: deviceInfo.fingerprint,
                onesignal_player_id: (window as any).OneSignal?.User?.PushSubscription?.id || 'pending',
                device_info: {
                  browser_name: deviceInfo.browserName,
                  browser_version: deviceInfo.browserVersion,
                  platform: deviceInfo.platform,
                  is_mobile: deviceInfo.isMobile,
                  screen_resolution: deviceInfo.screenResolution,
                  timezone: deviceInfo.timezone,
                  language: deviceInfo.language
                },
                browser_name: deviceInfo.browserName,
                browser_version: deviceInfo.browserVersion,
                platform: deviceInfo.platform,
                is_mobile: deviceInfo.isMobile
              })
              .select('id')
              .single();
            
            if (playerId) {
              console.info('[OneSignal CROSS-DEVICE DEBUG] Device subscription stored in database');
            }
          } catch (storeError) {
            console.warn('[OneSignal CROSS-DEVICE DEBUG] Failed to store device subscription:', storeError);
          }
        }
        
        if (!result.success) {
          console.warn('[OneSignal CROSS-DEVICE DEBUG] Auto-trigger failed, scheduling retry in 10s');
          setTimeout(() => {
            console.info('[OneSignal CROSS-DEVICE DEBUG] Retry attempt...');
            triggerNativePromptIfEligible();
          }, 10000);
        }
      } else {
        // Log specific reason for not triggering
        const blockers = Object.entries(conditions)
          .filter(([key, value]) => {
            if (key === 'permission') return value !== 'default';
            if (key === 'hasSubscription' || key === 'deviceHasSubscription') return value === true;
            if (key === 'deviceNeedsPrompt') return value === false;
            return value === false;
          })
          .map(([key]) => key);
        
        console.info(`[OneSignal CROSS-DEVICE DEBUG] ❌ Not triggering due to: ${blockers.join(', ')}`);
      }
    } catch (error) {
      console.error('[OneSignal CROSS-DEVICE DEBUG] Auto-trigger check failed:', error);
    }
  };

  // **Enhanced auto-trigger effect with multiple retry mechanisms**
  useEffect(() => {
    if (!initialized || !user?.id) return;

    console.info('[OneSignal CRITICAL DEBUG] Auto-trigger effect triggered');
    
    // Initial delay to ensure OneSignal is fully ready
    const initialTimer = setTimeout(() => {
      triggerNativePromptIfEligible();
    }, 3000);

    // Backup retry for edge cases
    const backupTimer = setTimeout(() => {
      console.info('[OneSignal CRITICAL DEBUG] Backup auto-trigger check...');
      triggerNativePromptIfEligible();
    }, 8000);

    return () => {
      clearTimeout(initialTimer);
      clearTimeout(backupTimer);
    };
  }, [initialized, user?.id, permission, hasSubscription, profile?.push_subscription_active, profile?.onesignal_player_id]);

  return {
    initialized,
    permission,
    hasSubscription,
    deviceHasSubscription,
    deviceInfo,
    isGranted,
    isIframeBlocked,
    requestPermission,
    ensureOneSignalUser,
    ensureOneSignalUserWithPlayerId,
    verifySubscription,
    captureAndStorePlayerId: captureAndStorePlayerIdSequential,
    browserInfo,
    browserInstructions: getBrowserInstructions(browserInfo)
  };
}