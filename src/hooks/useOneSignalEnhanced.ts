/**
 * Enhanced OneSignal Hook with iOS PWA Player ID Management
 * CRITICAL FIX: Addresses 85.7% auto-trigger failure rate with comprehensive debugging
 */

import { useEffect, useState, useCallback } from "react";
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
  
  // Enhanced debug logging
  console.log('🔔 OneSignal Enhanced Hook - Starting initialization');
  
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

        // **PHASE 2: V16-Compatible OneSignal SDK Initialization**
        if (typeof window !== 'undefined') {
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

          // **V16 CRITICAL FIX: Use direct initialization or OneSignalDeferred**
          const initPromise = new Promise<void>((resolve, reject) => {
            const attemptInitialization = () => {
              try {
                // Check if OneSignal is available as constructor (v16 style)
                if ((window as any).OneSignal && typeof (window as any).OneSignal.init === 'function') {
                  console.info('[OneSignal] Using v16 direct initialization');
                  
                  const initConfig = {
                    appId: configData.appId,
                    allowLocalhostAsSecureOrigin: true,
                    autoRegister: false,
                    autoResubscribe: false,
                    notifyButton: { enable: false },
                    bell: { enabled: false },
                    showCredit: false,
                    // CRITICAL: Disable ALL automatic prompts - native only
                    promptOptions: {
                      slidedown: { enabled: false },
                      customlink: { enabled: false }, 
                      bell: { enabled: false },
                      native: { enabled: false } // Prevent auto-native prompts
                    },
                    // Additional safeguards against auto-prompts
                    welcomeNotification: { disable: true }
                  };
                  
                  if (debug) console.info('[OneSignal] Initializing with v16 config:', initConfig);
                  
                  (window as any).OneSignal.init(initConfig);
                  (window as any).OneSignal.__IMPERIAL_INIT_DONE__ = true;
                  
                  // Enhanced readiness polling with 20-second timeout
                  let pollAttempts = 0;
                  const maxPollAttempts = 40; // 20 seconds at 500ms intervals
                  
                  const pollForReadiness = () => {
                    pollAttempts++;
                    try {
                      const notifications = (window as any).OneSignal?.Notifications;
                      const user = (window as any).OneSignal?.User;
                      const isReady = !!(notifications && user);
                      
                      if (isReady) {
                        console.info(`[OneSignal] SDK ready after ${pollAttempts * 500}ms`);
                        resolve();
                      } else if (pollAttempts >= maxPollAttempts) {
                        console.error(`[OneSignal] SDK failed to become ready after ${maxPollAttempts * 500}ms`);
                        console.error('[OneSignal] SDK state:', {
                          OneSignal: !!(window as any).OneSignal,
                          Notifications: !!notifications,
                          User: !!user
                        });
                        reject(new Error('SDK readiness timeout'));
                      } else {
                        if (pollAttempts % 4 === 0) { // Log every 2 seconds
                          console.info(`[OneSignal] Waiting for SDK readiness... (${pollAttempts * 500}ms)`);
                        }
                        setTimeout(pollForReadiness, 500);
                      }
                    } catch (e) {
                      console.error('[OneSignal] Readiness check error:', e);
                      reject(e);
                    }
                  };
                  
                  pollForReadiness();
                  
                } else if ((window as any).OneSignalDeferred) {
                  console.info('[OneSignal] Using OneSignalDeferred pattern');
                  
                  (window as any).OneSignalDeferred.push(function(OneSignal: any) {
                    try {
                      const initConfig = {
                        appId: configData.appId,
                        allowLocalhostAsSecureOrigin: true,
                        autoRegister: false,
                        autoResubscribe: false,
                        notifyButton: { enable: false },
                        bell: { enabled: false },
                        showCredit: false,
                        promptOptions: {
                          slidedown: { enabled: false },
                          customlink: { enabled: false },
                          bell: { enabled: false }
                        }
                      };
                      
                      OneSignal.init(initConfig);
                      (window as any).OneSignal = OneSignal;
                      (window as any).OneSignal.__IMPERIAL_INIT_DONE__ = true;
                      
                      console.info('[OneSignal] OneSignalDeferred initialization complete');
                      resolve();
                      
                    } catch (deferredError) {
                      console.error('[OneSignal] OneSignalDeferred error:', deferredError);
                      reject(deferredError);
                    }
                  });
                  
                } else {
                  console.warn('[OneSignal] Neither direct init nor OneSignalDeferred available, falling back to legacy pattern');
                  
                  // Fallback to legacy pattern
                  window.OneSignal = window.OneSignal || [];
                  (window.OneSignal as any[]).push(function () {
                    try {
                      const initConfig = {
                        appId: configData.appId,
                        allowLocalhostAsSecureOrigin: true,
                        autoRegister: false,
                        autoResubscribe: false,
                        notifyButton: { enable: false },
                        bell: { enabled: false },
                        showCredit: false,
                        promptOptions: {
                          slidedown: { enabled: false },
                          customlink: { enabled: false },
                          bell: { enabled: false }
                        }
                      };
                      
                      (window as any).OneSignal.init(initConfig);
                      (window as any).OneSignal.__IMPERIAL_INIT_DONE__ = true;
                      
                      setTimeout(() => {
                        try {
                          const isReady = !!(window as any).OneSignal?.Notifications && !!(window as any).OneSignal?.User;
                          if (isReady) {
                            console.info('[OneSignal] Legacy initialization verified');
                            resolve();
                          } else {
                            console.error('[OneSignal] Legacy initialization failed readiness check');
                            reject(new Error('Legacy SDK initialization incomplete'));
                          }
                        } catch (e) {
                          console.error('[OneSignal] Legacy verification failed:', e);
                          reject(e);
                        }
                      }, 1000);
                      
                    } catch (legacyError) {
                      console.error('[OneSignal] Legacy initialization error:', legacyError);
                      reject(legacyError);
                    }
                  });
                }
                
              } catch (initError) {
                console.error('[OneSignal] Initialization attempt failed:', initError);
                reject(initError);
              }
            };

            // Try initialization with a small delay to ensure SDK is loaded
            setTimeout(attemptInitialization, 100);
          });
          
          await withTimeout(initPromise, 25000).catch(timeoutError => {
            console.error('[OneSignal] Extended initialization timeout (25s):', timeoutError);
            console.error('[OneSignal] Final SDK state check:', {
              OneSignal: !!(window as any).OneSignal,
              OneSignalDeferred: !!(window as any).OneSignalDeferred,
              hasInit: typeof (window as any).OneSignal?.init === 'function',
              Notifications: !!(window as any).OneSignal?.Notifications,
              User: !!(window as any).OneSignal?.User
            });
            throw timeoutError;
          });
        }

        // **PHASE 3: V16-Compatible User Linking and Permission Observation**
        const setupListeners = () => {
          try {
            console.info('[OneSignal] Setting up v16-compatible listeners...');
            
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
        };
        
        // Set up listeners directly (v16 compatible)
        setupListeners();

        setInitialized(true);
        console.info('[OneSignal] Setup completed - ready for manual native prompts only');

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

      // Parse subscription status with backward compatibility
      const isSubscribed = data?.subscription_status?.is_subscribed ?? data?.is_subscribed ?? false;
      const playerId = data?.subscription_status?.details?.player_id ?? data?.player_id ?? null;

      if (debug) console.info('[OneSignal] Subscription verification:', { isSubscribed, playerId, data });
      
      return { isSubscribed, playerId, details: data };
    } catch (err) {
      console.error('[OneSignal] Subscription verification exception:', err);
      return { isSubscribed: false, details: { exception: err } };
    }
  };

  // Post-permission sync with backend
  const syncSubscriptionStatus = async (playerId?: string) => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('onesignal-upsert-user', {
        body: {
          user_id: user.id,
          email: user.email,
          player_id: playerId,
          device_fingerprint: deviceInfo?.fingerprint,
          device_info: deviceInfo
        }
      });
      
      if (error) {
        console.warn('[OneSignal] Sync failed:', error);
      } else {
        console.info('[OneSignal] Subscription status synced successfully');
        
        // Update device-specific subscription status
        if (playerId && deviceInfo?.fingerprint) {
          setDeviceSubscriptionStatus(user.id, deviceInfo.fingerprint, true);
          setDeviceHasSubscription(true);
        }
      }
    } catch (syncError) {
      console.warn('[OneSignal] Sync error:', syncError);
    }
  };

  /**
   * Wait for OneSignal player ID with polling
   * Essential for iOS PWA where player ID capture can be delayed
   */
  const waitForPlayerId = useCallback(async (maxAttempts = 10, interval = 1000): Promise<string | null> => {
    console.log('🔄 [OneSignal] Waiting for player ID...');
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (!window.OneSignal) {
          console.log(`⏳ [OneSignal] OneSignal not ready, attempt ${attempt}/${maxAttempts}`);
          await new Promise(resolve => setTimeout(resolve, interval));
          continue;
        }

        const ps = (window as any).OneSignal?.User?.PushSubscription;
        const playerId = ps?.id;
        if (playerId) {
          console.log('✅ [OneSignal] Player ID captured:', playerId.substring(0, 8) + '...');
          return playerId;
        }
        
        console.log(`⏳ [OneSignal] No player ID yet, attempt ${attempt}/${maxAttempts}`);
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      } catch (error) {
        console.warn(`❌ [OneSignal] Error getting player ID, attempt ${attempt}:`, error);
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      }
    }
    
    console.warn('⚠️ [OneSignal] Failed to get player ID after all attempts');
    return null;
  }, []);

  // **CRITICAL FIX: Enhanced permission request with comprehensive error handling and retry logic**
  const requestPermission = async (): Promise<{
    success: boolean; 
    error?: string; 
    details?: any 
  }> => {
    try {
      console.info('[OneSignal CRITICAL DEBUG] === PERMISSION REQUEST STARTED ===');
      
      // **HARD GUARD: Ensure user is authenticated before requesting permissions**
      if (!user?.id) {
        const error = 'User must be logged in to enable push notifications';
        console.warn('[OneSignal]', error);
        return { success: false, error, details: { authenticated: false } };
      }
      
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

      // Use OneSignal native permission request for all platforms
      console.info('[OneSignal] Requesting permission via native prompt...');
      
      let result;
      
      // Use native OneSignal permission request for all platforms
      if (safariPWAInfo.isSafariPWA || browserInfo.isIOS) {
        console.info('[OneSignal] iOS Safari PWA detected - using native permission flow');
        
        try {
          // Try v16 Notifications.requestPermission first
          if ((window as any).OneSignal.Notifications?.requestPermission) {
            result = await (window as any).OneSignal.Notifications.requestPermission();
            console.info('[OneSignal] iOS permission result:', result);
          } else {
            // Fallback to PushSubscription optIn for iOS
            const ps = (window as any).OneSignal?.User?.PushSubscription;
            if (ps?.optIn) {
              result = await ps.optIn();
              console.info('[OneSignal] iOS PushSubscription.optIn() result:', result);
            } else {
              throw new Error('iOS OneSignal v16 methods not available');
            }
          }
        } catch (iosError) {
          console.warn('[OneSignal] iOS permission failed:', iosError);
          throw iosError;
        }
      } else {
      // **NATIVE PROMPT ONLY: Use OneSignal.Notifications.requestPermission for all non-iOS browsers**
      console.info('[OneSignal] Using native permission prompt for non-iOS browser...');
      
      try {
        // Use direct native permission request only - no slidedown
        if ((window as any).OneSignal.Notifications?.requestPermission) {
          result = await (window as any).OneSignal.Notifications.requestPermission();
          console.info('[OneSignal] Native permission result:', result);
        } else {
          throw new Error('OneSignal v16 Notifications.requestPermission method not available');
        }
      } catch (permissionError) {
        console.warn('[OneSignal] Native permission failed:', permissionError);
        throw permissionError;
      }
      }
      
      console.info('[OneSignal] Permission response received:', result);

      if (result) {
        console.log('[OneSignal] Permission granted via native prompt');
        setPermission('granted');
        
        // Wait for and capture player ID with enhanced polling
        try {
          const playerId = await waitForPlayerId(15, 1000); // Wait up to 15 seconds
          if (playerId && user?.id) {
            await captureAndStorePlayerIdSequential(playerId);
            // Sync with backend after successful subscription
            await syncSubscriptionStatus(playerId);
          } else {
            console.warn('⚠️ [OneSignal] No player ID available after permission grant');
          }
        } catch (playerIdError) {
          console.warn('❌ [OneSignal] Error capturing player ID:', playerIdError);
        }
        
        setHasSubscription(true);
        return { success: true, details: { method: 'native_prompt', result, synced: true } };
      } else {
        console.log('[OneSignal] Permission denied via native prompt');
        setPermission('denied');
        return { success: false, error: 'Permission denied', details: { method: 'native_prompt', result } };
      }
    } catch (err: any) {
      console.error('[OneSignal] Permission request failed:', err);
      
      // Fallback to browser native prompt for critical cases
      if (err.message?.includes('timeout') || err.message?.includes('permission')) {
        try {
          console.info('[OneSignal] Trying fallback browser native prompt...');
          
          const nativePermission = await Notification.requestPermission();
          console.info('[OneSignal] Native permission result:', nativePermission);
          
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



  // Log final ready state
  if (initialized && user?.id) {
    console.info('[OneSignal] ✅ Production ready - native prompts only, no auto-triggers');
  }

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
    waitForPlayerId,
    browserInfo,
    browserInstructions: getBrowserInstructions(browserInfo)
  };
}