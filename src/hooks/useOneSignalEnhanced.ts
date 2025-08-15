/**
 * Enhanced OneSignal Hook with iOS PWA Player ID Management
 * Addresses all 5 phases of the iOS PWA push notification fix
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { withTimeout } from "@/api/client/utils/timeout";
import { detectBrowser, getBrowserSpecificConfig, getBrowserInstructions } from "@/utils/browserDetection";
import { detectSafariPWA } from "@/utils/safariPWADetection";

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
        // Check browser compatibility first
        if (!browserInfo.isSupported) {
          console.warn(`[OneSignal] Browser ${browserInfo.name} ${browserInfo.version} is not supported for push notifications`);
          return;
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
                    // Configure native slidedown prompt
                    promptOptions: {
                      slidedown: {
                        enabled: true,
                        actionMessage: "Get instant alerts for premium trading signals and market opportunities! Stay ahead of the market with real-time notifications.",
                        acceptButtonText: "Enable Notifications", 
                        cancelButtonText: "Not Now"
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
            
            // Auto-trigger native slidedown after user login
            if (user?.id && (permission === 'default' || permission === 'denied')) {
              console.log('[OneSignal] User logged in - triggering native slidedown for trading signals');
              setTimeout(() => {
                try {
                  // Use OneSignal's built-in slidedown prompt with custom messaging
                  if ((window as any).OneSignal?.Slidedown?.promptPush) {
                    (window as any).OneSignal.Slidedown.promptPush({
                      force: true, // Show even if previously dismissed
                      forceSlidedownOverNative: false // Prefer native prompt when available
                    }).catch((e: any) => {
                      console.warn('[OneSignal] Auto-prompt failed:', e);
                    });
                  } else if ((window as any).OneSignal?.showSlidedownPrompt) {
                    (window as any).OneSignal.showSlidedownPrompt().catch((e: any) => {
                      console.warn('[OneSignal] Fallback prompt failed:', e);
                    });
                  }
                } catch (e) {
                  console.warn('[OneSignal] Auto-prompt error:', e);
                }
              }, 3000); // 3 second delay after login for better UX
            }

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
        if (debug) console.info('[OneSignal] Setup completed successfully');

      } catch (error) {
        console.error('[OneSignal] Setup failed:', error);
      }
    };

    setupOneSignal();
    return () => {
      cancelled = true;
    };
  }, [user?.id, profile?.role, profile?.user_type, browserInfo.name]);
  
  // **CRITICAL: Sequential Player ID Capture - Prevents race conditions**
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

      // Step 2: Database transaction with validation
      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('onesignal_player_id, push_subscription_active')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        console.error('[OneSignal] Failed to fetch current profile:', fetchError);
        return false;
      }

      // Step 3: Only update if Player ID is different or missing
      if (currentProfile?.onesignal_player_id === playerId) {
        console.log('[OneSignal] Player ID already stored correctly');
        return true;
      }

      // Step 4: Backend sync with retry logic
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
      console.error('[OneSignal] Sequential capture exception:', err);
      return false;
    }
  };

  // **Legacy function for backward compatibility**
  const captureAndStorePlayerId = captureAndStorePlayerIdSequential;

  // **PHASE 1: Enhanced OneSignal User Creation**
  const ensureOneSignalUser = async (): Promise<boolean> => {
    try {
      if (!user?.id || !user?.email) {
        console.warn('[OneSignal] User data incomplete - skipping user creation');
        return false;
      }

      const requestBody = {
        user_id: user.id,
        email: user.email,
        tags: {
          role: profile?.role || 'user',
          platform: 'web' // Simplified to avoid tag limits
        }
      };

      if (debug) console.info('[OneSignal] Creating/updating user:', requestBody);

      const { data, error } = await withTimeout(
        supabase.functions.invoke('onesignal-upsert-user', { body: requestBody }),
        10000
      );

      if (error) {
        console.error('[OneSignal] User creation/update failed:', error);
        return false;
      }

      if (debug) console.info('[OneSignal] User created/updated successfully:', data);
      return true;
    } catch (err) {
      console.error('[OneSignal] User creation/update exception:', err);
      return false;
    }
  };

  // **PHASE 2: EMERGENCY Enhanced OneSignal User Sync with Modern User Model**
  const ensureOneSignalUserWithPlayerId = async (playerId: string, userTags: Record<string, any> = {}): Promise<boolean> => {
    if (!user?.id) {
      console.warn('[OneSignal] Cannot sync user - no authenticated user');
      return false;
    }

    try {
      console.log(`[OneSignal] 🚨 EMERGENCY SYNC: Player ID ${playerId.substring(0, 8)}... for user ${user.id}`);
      
      // **PHASE 3: Modern OneSignal User Model payload**
      const payload = {
        user_id: user.id,
        email: user.email,
        player_id: playerId,
        external_id: user.id, // **PHASE 3: Explicit external_id for modern User Model**
        tags: {
          ...userTags,
          role: profile?.role || 'user',
          user_type: profile?.user_type || 'member',
          platform: safariPWAInfo.isIOS ? 'ios' : 'web',
          is_pwa: safariPWAInfo.isSafariPWA ? 'true' : 'false',
          has_web_push_support: safariPWAInfo.hasWebPushSupport ? 'true' : 'false',
          is_standalone: safariPWAInfo.isStandalone ? 'true' : 'false',
          browser_name: browserInfo.name,
          browser_version: browserInfo.version,
          last_sync: new Date().toISOString(),
          sync_method: 'emergency_player_id_capture',
          sync_timestamp: Date.now().toString(),
          device_type: safariPWAInfo.isSafariPWA ? 'ios_pwa' : 'web_browser'
        },
        force_update: true,
        retry_on_failure: true,
        modern_user_model: true // **PHASE 3: Flag for modern API usage**
      };

      console.log('[OneSignal] 📤 Emergency sync payload:', { 
        ...payload, 
        player_id: playerId.substring(0, 8) + '...',
        email: user.email?.substring(0, 3) + '...',
        external_id: user.id.substring(0, 8) + '...'
      });

      // **PHASE 2: Enhanced timeout and retry logic**
      const { data, error } = await withTimeout(
        supabase.functions.invoke("onesignal-upsert-user", { body: payload }),
        20000 // **PHASE 2: Extended timeout for emergency sync**
      );

      if (error) {
        console.error('[OneSignal] ❌ User sync with Player ID failed:', error);
        
        // **PHASE 2: Retry mechanism for critical failures**
        console.log('[OneSignal] 🔄 Retrying user sync...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const { data: retryData, error: retryError } = await supabase.functions.invoke("onesignal-upsert-user", { 
          body: payload 
        });
        
        if (retryError) {
          console.error('[OneSignal] ❌ Retry also failed:', retryError);
          return false;
        }
        
        console.log('[OneSignal] ✅ Retry successful:', retryData);
        return true;
      }

      console.log('[OneSignal] ✅ User synced successfully with Player ID:', data);
      return true;
    } catch (error) {
      console.error('[OneSignal] ❌ User sync with Player ID exception:', error);
      return false;
    }
  };

  // **PHASE 1: Enhanced subscription management with iOS PWA Player ID verification**
  const ensureSubscription = async (maxWaitMs: number = browserConfig.subscriptionTimeout, skipNativePermission: boolean = false): Promise<boolean> => {
    console.log(`[OneSignal] Starting subscription process (max wait: ${maxWaitMs}ms, skip native: ${skipNativePermission})`);
    
    const startTime = Date.now();
    
    try {
      if (!initialized) {
        console.warn('[OneSignal] SDK not initialized yet');
        return false;
      }

        // **Enhanced iOS PWA Subscription Verification with Player ID Capture**
        const pushSub = (window as any).OneSignal?.User?.PushSubscription;
        if (pushSub?.optedIn || pushSub?.id) {
          const playerId = pushSub.id;
          setHasSubscription(true);
          console.log(`[OneSignal] Subscription verified with Player ID: ${playerId}`);
          
          // **CRITICAL: Always ensure Player ID is stored for all platforms, especially iOS PWA**
          if (playerId) {
            console.log('[OneSignal] Updating user with Player ID');
            try {
              await ensureOneSignalUserWithPlayerId(playerId);
            } catch (e) {
              console.warn('[OneSignal] Failed to update user with Player ID:', e);
            }
          }
          
          return true;
        }

      // Check permission first
      if (permission === 'denied') {
        console.log('[OneSignal] Permission denied, cannot subscribe');
        return false;
      }

      const maxAttempts = browserConfig.maxRetries || 3;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (Date.now() - startTime > maxWaitMs) {
          console.warn('[OneSignal] Subscription timeout reached');
          break;
        }

        // **iOS PWA-specific subscription handling**
        if (safariPWAInfo.isSafariPWA) {
          console.log('[OneSignal] iOS PWA subscription flow - using direct notification request');
          
          try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              // Wait for OneSignal to establish subscription
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              const pushSub = (window as any).OneSignal?.User?.PushSubscription;
              if (pushSub?.id) {
                console.log(`[OneSignal] iOS PWA subscription successful with Player ID: ${pushSub.id}`);
                await ensureOneSignalUserWithPlayerId(pushSub.id);
                setHasSubscription(true);
                return true;
              }
            }
          } catch (e) {
            console.warn('[OneSignal] iOS PWA subscription error:', e);
          }
        }
        
        // Standard subscription for other platforms (NO SLIDEDOWN)
        try {
          console.log(`[OneSignal] Attempting subscription without native prompts (attempt ${attempt + 1}/${maxAttempts})`);
          
          // Use User API instead of slidedown to avoid native prompts
          const osUser = (window as any).OneSignal?.User;
          if (osUser?.PushSubscription) {
            await osUser.PushSubscription.optIn();
            console.log('[OneSignal] User API subscription triggered');
          }
        } catch (e) {
          console.warn(`[OneSignal] Subscription attempt ${attempt + 1} failed:`, e);
        }

        // Verify subscription
        const verification = await verifySubscription();
        if (verification.hasValidSubscription) {
          setHasSubscription(true);
          console.log(`[OneSignal] Subscription successful after ${Date.now() - startTime}ms`);
          
          // **Capture and store Player ID for iOS PWA users**
          if (safariPWAInfo.isSafariPWA && verification.playerId) {
            try {
              await ensureOneSignalUserWithPlayerId(verification.playerId);
            } catch (e) {
              console.warn('[OneSignal] Failed to store iOS PWA Player ID:', e);
            }
          }
          
          return true;
        }

        // Wait before retry
        if (attempt < maxAttempts - 1) {
          const delay = browserConfig.retryDelay * (attempt + 1);
          console.log(`[OneSignal] Waiting ${delay}ms before retry`);
          await new Promise(r => setTimeout(r, delay));
        }
      }

      console.warn(`[OneSignal] Subscription failed after ${maxAttempts} attempts`);
      return false;

    } catch (error) {
      console.error('[OneSignal] Subscription error:', error);
      return false;
    }
  };

  // **PHASE 2: Enhanced OneSignal subscription verification with iOS PWA Player ID tracking**
  const verifySubscription = async (): Promise<{
    hasValidSubscription: boolean;
    isOptedIn: boolean;
    playerId: string | null;
    serverVerified: boolean;
  }> => {
    try {
      const ps = (window as any).OneSignal?.User?.PushSubscription;
      const playerId = ps?.id || null;
      const isOptedIn = ps?.optedIn || false;
      const hasValidSubscription = !!(isOptedIn || playerId);

      console.log('[OneSignal] Subscription verification:', {
        hasValidSubscription,
        isOptedIn,
        playerId: playerId?.substring(0, 8) + '...',
        isIOSPWA: safariPWAInfo.isSafariPWA
      });

      return {
        hasValidSubscription,
        isOptedIn,
        playerId,
        serverVerified: hasValidSubscription
      };
    } catch (error) {
      console.error('[OneSignal] Subscription verification error:', error);
      return {
        hasValidSubscription: false,
        isOptedIn: false,
        playerId: null,
        serverVerified: false
      };
    }
  };

  // SIMPLIFIED NATIVE PROMPT REQUEST
  const requestPermission = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('[OneSignal] Starting OneSignal native slidedown request...');

      if (!initialized) {
        console.error('[OneSignal] SDK not initialized yet');
        return { success: false, error: 'OneSignal not initialized' };
      }

      // Check if already granted
      if (permission === 'granted' && hasSubscription) {
        console.log('[OneSignal] ✅ Already granted and subscribed');
        return { success: true };
      }

      // Use OneSignal's native slidedown prompt for all cases
      console.log('[OneSignal] Using OneSignal native slidedown prompt');
      await (window as any).OneSignal.Slidedown.promptPush();
      
      // Verify the subscription was successful
      setTimeout(async () => {
        await verifySubscription();
      }, 1000);
      
      return { success: true };
      
    } catch (error) {
      console.error('[OneSignal] Permission request failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  };

  return {
    initialized,
    permission,
    hasSubscription,
    isGranted,
    isIframeBlocked,
    requestPermission,
    browserInfo,
    browserInstructions: getBrowserInstructions(browserInfo),
    safariPWAInfo,
    ensureOneSignalUser,
    ensureOneSignalUserWithPlayerId,
    verifySubscription,
    captureAndStorePlayerId
  };
}