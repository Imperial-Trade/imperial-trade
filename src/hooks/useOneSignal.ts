import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { withTimeout } from "@/api/client/utils/timeout";
import { detectBrowser, getBrowserSpecificConfig, getBrowserInstructions } from "@/utils/browserDetection";

declare global {
  interface Window {
    OneSignal?: any;
  }
}

export function useOneSignal() {
  const { user, profile } = useAuth();
  const [initialized, setInitialized] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  
  const [hasSubscription, setHasSubscription] = useState(false);
  const isIframeBlocked = typeof window !== 'undefined' && window.self !== window.top;
  const debug = (() => { try { return localStorage.getItem('onesignal_debug') === '1'; } catch { return false; } })();
  
  // Browser detection for compatibility
  const browserInfo = typeof window !== 'undefined' ? detectBrowser() : { 
    name: 'Unknown', version: '0', isSupported: false, isMobile: false, requiresSpecialHandling: true 
  };
  const browserConfig = getBrowserSpecificConfig(browserInfo);
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

        // **PHASE 1: Enhanced Configuration Loading with Retry Logic**
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
              await new Promise(r => setTimeout(r, 1000 * configAttempts)); // Progressive delay
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
            if (debug) console.info('[OneSignal] Configuration loaded successfully:', { appId: data.appId, initialized: data.initialized });
            
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

        // Verify service worker files are accessible before proceeding
        try {
          const swResponse = await fetch('/OneSignalSDKWorker.js', { method: 'HEAD' });
          if (!swResponse.ok) {
            console.warn('[OneSignal] Service worker files not accessible, this may cause subscription issues');
          }
        } catch (e) {
          console.warn('[OneSignal] Could not verify service worker accessibility:', e);
        }

        // Inject OneSignal SDK script with enhanced error handling
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

          // **PHASE 2: Enhanced OneSignal SDK Initialization with Robust Error Handling**
        if (typeof window !== 'undefined') {
          window.OneSignal = window.OneSignal || ([] as any[]);
          
          // Prevent multiple initializations
          if ((window as any).OneSignal?.__IMPERIAL_INIT_DONE__) {
            if (debug) console.info('[OneSignal] Already initialized, checking ready state');
            
            // Verify the existing initialization is still functional
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

          // **Enhanced SDK readiness detection with exponential backoff**
          let sdkReady = false;
          let readyAttempts = 0;
          const maxReadyAttempts = 20;
          const timeout = browserConfig.subscriptionTimeout;
          const startTime = Date.now();
          
          while (!sdkReady && readyAttempts < maxReadyAttempts && (Date.now() - startTime) < timeout) {
            readyAttempts++;
            
            try {
              if ((window as any).OneSignal?.init) {
                sdkReady = true;
                if (debug) console.info(`[OneSignal] SDK ready after ${readyAttempts} attempts`);
                break;
              }
            } catch (e) {
              if (debug) console.warn(`[OneSignal] SDK readiness check ${readyAttempts} failed:`, e);
            }
            
            const delay = Math.min(100 * Math.pow(1.2, readyAttempts), 1000);
            await new Promise(r => setTimeout(r, delay));
          }
          
          if (!sdkReady) {
            console.error(`[OneSignal] SDK not ready after ${readyAttempts} attempts and ${Date.now() - startTime}ms`);
            return;
          }

          // **PHASE 1: Pre-initialization prompt blocking**
          // Block all OneSignal prompts globally before initialization
          if (typeof window !== 'undefined') {
            (window as any)._onesignalInitOptions = {
              notifyButton: { enable: false },
              promptOptions: { autoPrompt: false },
              slidedown: { enabled: false },
              bell: { enabled: false },
              autoRegister: false
            };
            
            // Global prompt blocking override
            if (!(window as any)._oneSignalPromptBlocked) {
              const originalPrompt = window.OneSignal?.showSlidedownPrompt;
              const originalNativePrompt = window.OneSignal?.showNativePrompt;
              const originalHttpPrompt = window.OneSignal?.showHttpPrompt;
              
              window.OneSignal.showSlidedownPrompt = () => {
                if (debug) console.info('[OneSignal] Blocked slidedown prompt');
                return Promise.resolve();
              };
              window.OneSignal.showNativePrompt = () => {
                if (debug) console.info('[OneSignal] Blocked native prompt');
                return Promise.resolve();
              };
              window.OneSignal.showHttpPrompt = () => {
                if (debug) console.info('[OneSignal] Blocked HTTP prompt');
                return Promise.resolve();
              };
              
              (window as any)._oneSignalPromptBlocked = true;
            }
          }

          // **Enhanced initialization with comprehensive error handling**
          const initPromise = new Promise<void>((resolve, reject) => {
            try {
              window.OneSignal.push(function () {
                try {
                  const initConfig = {
                    appId: configData.appId,
                    allowLocalhostAsSecureOrigin: true,
                    // **PHASE 1: Complete OneSignal prompt suppression - multiple layers**
                    autoRegister: false,
                    autoResubscribe: false,
                    notifyButton: { enable: false },
                    promptOptions: {
                      autoPrompt: false,
                      slidedown: { enabled: false },
                      customPromptOptions: { 
                        autoPrompt: false,
                        slidedown: { enabled: false }
                      }
                    },
                    slidedown: { 
                      enabled: false,
                      autoPrompt: false
                    },
                    bell: { 
                      enabled: false,
                      showLauncher: false
                    },
                    showCredit: false,
                    // Disable all automatic prompts
                    suppressAutoPrompts: true,
                    ...(configData.safariWebId && { safari_web_id: configData.safariWebId }),
                    // Browser-specific optimizations
                    ...(browserInfo.name === 'Safari' && { autoResubscribe: false }),
                    ...(browserInfo.name === 'Firefox' && { persistNotification: true })
                  };
                  
                  if (debug) console.info('[OneSignal] Initializing with config:', initConfig);
                  
                  (window as any).OneSignal.init(initConfig);
                  (window as any).OneSignal.__IMPERIAL_INIT_DONE__ = true;
                  
                  // **Enhanced post-initialization verification**
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

        // Enhanced user linking and permission observation
        window.OneSignal.push(function () {
          try {
            // Enhanced permission change listener with browser-specific handling
            const handlePermissionChange = () => {
              try { 
                if (typeof Notification !== 'undefined') {
                  const newPermission = Notification.permission;
                  setPermission(newPermission);
                  if (debug) console.info('[OneSignal] Permission changed to:', newPermission);
                  
                  // Browser-specific permission handling
                  if (newPermission === 'granted' && browserInfo.requiresSpecialHandling) {
                    // For Safari and Firefox, ensure subscription is created
                    setTimeout(() => {
                      ensureSubscription(browserConfig.subscriptionTimeout).catch(console.warn);
                    }, 1000);
                  }
                }
              } catch (e) {
                console.warn('[OneSignal] Permission change handler error:', e);
              }
            };

            (window as any).OneSignal.Notifications?.addEventListener?.("permissionChange", handlePermissionChange);

            // Enhanced push subscription tracking with better error handling
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
                      id, optedIn, hasValidSub, browser: browserInfo.name 
                    });
                  } catch (e) {
                    console.warn('[OneSignal] Subscription state update error:', e);
                  }
                };

                // Initial state
                updateSubscriptionState();
                
                // Listen for changes with enhanced error handling
                ps.addEventListener?.('change', updateSubscriptionState);
              } catch (e) {
                console.warn('[OneSignal] Subscription listener setup error:', e);
              }
            }

            if (user?.id) {
              // Login immediately if we have a subscription to ensure proper user linking
              const hasSub = !!(ps?.optedIn || ps?.id);
              if (hasSub) {
                (window as any).OneSignal.login(user.id);
                // Attach email identity and tags
                const applyIdentity = async () => {
                  try {
                    if (user?.email) {
                      const osUser = (window as any).OneSignal?.User;
                      if (osUser?.addEmail) {
                        await osUser.addEmail(user.email);
                        try { if (debug) console.info('[OneSignal] Email identity attached:', user.email); } catch {}
                      }
                      // Also add email as a tag for easy segmentation/search
                      const emailTag = { email: user.email } as Record<string, string>;
                      if (osUser?.addTags) {
                        await osUser.addTags(emailTag);
                      } else if ((window as any).OneSignal?.sendTags) {
                        await (window as any).OneSignal.sendTags(emailTag);
                      }
                    }
                    const tags: Record<string, string> = {};
                    if (profile?.role) tags["role"] = String(profile.role);
                    if (profile?.user_type) tags["user_type"] = String(profile.user_type);
                    if (Object.keys(tags).length > 0) {
                      if ((window as any).OneSignal.User?.addTags) {
                        await (window as any).OneSignal.User.addTags(tags);
                      } else if ((window as any).OneSignal.sendTags) {
                        await (window as any).OneSignal.sendTags(tags);
                      }
                    }
                  } catch {}
                };
                applyIdentity().catch(() => {});
              } else {
                try { if (debug) console.info('[OneSignal] User logged in but no push subscription yet; will login after subscription is created.'); } catch {}
              }
            } else {
              (window as any).OneSignal.logout?.();
            }

            // Mark initialized only after SDK is ready and setup completed
            setInitialized(true);
            try { if (typeof Notification !== 'undefined') setPermission(Notification.permission); } catch {}
            if (debug) console.info('[OneSignal] SDK initialized and listeners attached');;
            // Ensure a real subscription exists if permission is already granted
            try {
              const os = (window as any).OneSignal;
              const ps = os?.User?.PushSubscription;
              const currentPerm = typeof Notification !== 'undefined' ? Notification.permission : 'default';
              const hasSub = !!(ps?.optedIn || ps?.id);
              if (currentPerm === 'granted' && !hasSub) {
                if (debug) console.info('[OneSignal] Permission granted but no subscription found. Ensuring subscription...');
                ensureSubscription(20000)
                  .then((ok) => {
                    if (ok) {
                      if (debug) console.info('[OneSignal] Auto-subscribe completed.');
                      try { if (user?.id) os?.login?.(user.id); } catch {}
                    } else {
                      console.warn('[OneSignal] Auto-subscribe timed out. Verify OneSignal Web Push Site URL matches origin:', location.origin);
                    }
                  })
                  .catch((err) => {
                    console.warn('[OneSignal] Auto-subscribe error:', err);
                  });
              }
            } catch {}
          } catch (_) {}
        });

      } catch (e) {
        console.error(`[OneSignal] Setup failed for ${browserInfo.name}:`, e);
        
        // For unsupported browsers or critical errors, still mark as initialized
        // to prevent infinite loading states
        setInitialized(true);
      }
    };

    setupOneSignal();
    return () => {
      cancelled = true;
    };
  }, [user?.id, profile?.role, profile?.user_type, browserInfo.name]);
  
  // PHASE 3: Enhanced OneSignal User Creation with Player ID validation
  const ensureOneSignalUser = async (): Promise<boolean> => {
    try {
      if (!user?.id) return false;
      const tags: Record<string, string> = {};
      if (profile?.role) tags.role = String(profile.role);
      if (profile?.user_type) tags.user_type = String(profile.user_type);
      
      const { data, error } = await supabase.functions.invoke('onesignal-upsert-user', { 
        body: { 
          user_id: user.id,
          email: user.email,
          tags 
        } 
      });
      
      if (error) {
        console.warn('[OneSignal] User creation/update failed:', error);
        return false;
      }
      
      if (debug) console.info('[OneSignal] User created/updated successfully:', data);
      return data?.success || false;
    } catch (err) {
      console.warn('[OneSignal] ensureOneSignalUser error:', err);
      return false;
    }
  };

  // PHASE 3: Enhanced User creation WITH player_id linking
  const ensureOneSignalUserWithPlayerId = async (playerId: string): Promise<boolean> => {
    try {
      if (!user?.id || !playerId) {
        console.warn('[OneSignal] Missing user_id or player_id for user sync');
        return false;
      }
      
      const tags: Record<string, string> = {};
      if (profile?.role) tags.role = String(profile.role);
      if (profile?.user_type) tags.user_type = String(profile.user_type);
      
      const { data, error } = await supabase.functions.invoke('onesignal-upsert-user', { 
        body: { 
          user_id: user.id,
          email: user.email,
          tags,
          player_id: playerId  // Include player_id for proper linking
        } 
      });
      
      if (error) {
        console.warn('[OneSignal] User sync with player_id failed:', error);
        return false;
      }
      
      if (debug) console.info('[OneSignal] User synced with player_id successfully:', { playerId, data });
      return data?.success || false;
    } catch (err) {
      console.error('[OneSignal] ensureOneSignalUserWithPlayerId error:', err);
      return false;
    }
  };

  // PHASE 3: Enhanced subscription verification with player_id validation
  const verifySubscription = async (): Promise<{ local: boolean; remote?: any; error?: string }> => {
    try {
      const os = (window as any).OneSignal;
      if (!os) return { local: false, error: "OneSignal not loaded" };
      
      const ps = os?.User?.PushSubscription;
      const subscriptionId = ps?.id;
      const optedIn = ps?.optedIn;
      const localSubscribed = !!(subscriptionId && optedIn);
      
      // Enhanced server-side verification with player_id
      let remoteVerification = null;
      if (user?.id) {
        try {
          const { data: remoteData } = await supabase.functions.invoke('onesignal-verify-subscription', {
            body: { 
              user_id: user.id,
              player_id: subscriptionId // Pass player_id for verification
            }
          });
          remoteVerification = remoteData?.subscription_status;
          
          if (debug) console.info('[OneSignal] Remote verification result:', remoteVerification);
        } catch (err) {
          console.warn('[OneSignal] Remote verification failed:', err);
        }
      }
      
      return { 
        local: localSubscribed, 
        remote: remoteVerification,
        error: !localSubscribed && !remoteVerification?.is_subscribed ? "Not subscribed" : undefined
      };
    } catch (err) {
      return { local: false, error: `Verification failed: ${err.message}` };
    }
  };

  // **PHASE 1: Production-Grade Subscription with Robust Player ID Generation**
  const ensureSubscription = async (maxWaitMs: number = 20000): Promise<boolean> => {
    try {
      const os = (window as any).OneSignal;
      if (!os?.Notifications || !os?.User?.PushSubscription) {
        console.warn(`[OneSignal] SDK not ready for subscription (${browserInfo.name})`);
        return false;
      }

      const ps = os.User.PushSubscription;
      const already = !!(ps?.optedIn || ps?.id);
      if (already) {
        setHasSubscription(true);
        if (debug) console.info(`[OneSignal] WebPush subscription already exists (${browserInfo.name}) - Player ID: ${ps?.id}`);
        return true;
      }

      // **Enhanced browser-specific timeout and retry configuration**
      const actualTimeout = Math.min(maxWaitMs, browserConfig.subscriptionTimeout);
      const start = Date.now();
      let attempt = 0;
      
      if (debug) console.info(`[OneSignal] Starting WebPush subscription for ${browserInfo.name} (timeout: ${actualTimeout}ms)`);

      while (Date.now() - start < actualTimeout) {
        attempt += 1;
        try {
          if (debug) console.info(`[OneSignal] WebPush subscribe() attempt ${attempt}/${browserConfig.maxRetries} (${browserInfo.name})`);
          
          // **Phase 1: Always request browser permission first for ALL browsers**
          // This ensures browser settings show "Allow" instead of "Ask (default)"
          if (debug) console.info(`[OneSignal] Requesting browser permission first (${browserInfo.name})`);
          
          // Request native browser permission explicitly
          const browserPermission = await withTimeout(
            Notification.requestPermission(), 
            browserConfig.permissionTimeout
          );
          
          if (browserPermission !== 'granted') {
            throw new Error(`Browser permission denied: ${browserPermission}`);
          }
          
          if (debug) console.info(`[OneSignal] Browser permission granted (${browserInfo.name})`);
          
          // Small delay to ensure permission is properly set
          await new Promise(r => setTimeout(r, 300));
          
          // Now create OneSignal subscription
          if (browserInfo.name === 'Safari') {
            // Safari needs special handling after browser permission
            await withTimeout(os.Notifications.requestPermission(), browserConfig.permissionTimeout);
            await new Promise(r => setTimeout(r, 500)); // Small delay for Safari
            await withTimeout(os.Notifications.subscribe(), browserConfig.subscriptionTimeout);
          } else {
            // Standard OneSignal subscription for other browsers (after browser permission)
            await withTimeout(os.Notifications.subscribe(), browserConfig.subscriptionTimeout);
          }
        } catch (e) {
          console.warn(`[OneSignal] subscribe() attempt ${attempt} failed (${browserInfo.name}):`, (e as any)?.message || e);
        }

        // Enhanced polling with browser-specific timing
        const pollDuration = browserInfo.name === 'Firefox' ? 3000 : 2000;
        const pollStart = Date.now();
        
        while (Date.now() - pollStart < pollDuration) {
          try {
            const id = os?.User?.PushSubscription?.id ?? null;
            const optedIn = !!os?.User?.PushSubscription?.optedIn;
            const hasValidSub = !!(id || optedIn);
            
            setHasSubscription(hasValidSub);
            
            if (hasValidSub) {
              if (debug) console.info(`[OneSignal] Subscription confirmed (${browserInfo.name}):`, { id, optedIn });
              return true;
            }
          } catch (e) {
            console.warn('[OneSignal] Subscription polling error:', e);
          }
          await new Promise((r) => setTimeout(r, 200));
        }

        // Browser-specific backoff
        if (attempt >= browserConfig.maxRetries) {
          console.warn(`[OneSignal] Max retries reached for ${browserInfo.name}`);
          break;
        }
        
        const backoff = Math.min(browserConfig.retryDelay * attempt, 6000);
        await new Promise((r) => setTimeout(r, backoff));
      }

      console.warn(`[OneSignal] ensureSubscription timeout for ${browserInfo.name} after ${actualTimeout}ms`);
      return false;
    } catch (err) {
      console.error(`[OneSignal] ensureSubscription error (${browserInfo.name}):`, err);
      return false;
    }
  };

  // **PHASE 3: Production-Grade Permission Request with Enhanced Error Handling**
  const requestPermission = async (): Promise<{ success: boolean; error?: string; details?: any }> => {
    try {
      // **PHASE 3: Enhanced Initialization and SDK Readiness Checks**
      if (!initialized) {
        console.warn('[OneSignal] SDK not initialized when permission requested');
        return { 
          success: false, 
          error: "Push notification system is loading. Please wait a moment and try again.",
          details: { reason: 'not_initialized', initialized }
        };
      }

      const os = (window as any).OneSignal;
      if (!os) {
        console.error('[OneSignal] SDK object not available');
        return { 
          success: false, 
          error: "Push notification system unavailable. Please refresh the page and try again.",
          details: { reason: 'sdk_unavailable' }
        };
      }
      
      // **Enhanced SDK component readiness verification**
      if (!os.Notifications || !os.User || !os.User.PushSubscription) {
        console.warn('[OneSignal] SDK components not ready:', {
          notifications: !!os.Notifications,
          user: !!os.User,
          pushSubscription: !!os.User?.PushSubscription
        });
        return { 
          success: false, 
          error: "Push notification components are still loading. Please try again in a few seconds.",
          details: { reason: 'components_not_ready', components: {
            notifications: !!os.Notifications,
            user: !!os.User,
            pushSubscription: !!os.User?.PushSubscription
          }}
        };
      }

      if (debug) console.info(`[OneSignal] Starting WebPush permission request for ${browserInfo.name} ${browserInfo.version}`);

      // **Enhanced pre-checks with user-friendly messages**
      if (typeof Notification === 'undefined') {
        return { 
          success: false, 
          error: `Push notifications are not supported in ${browserInfo.name}. Please use Chrome, Firefox, Safari, or Edge.` 
        };
      }

      // **Handle already granted permission with robust verification**
      if (permission === 'granted') {
        if (debug) console.info(`[OneSignal] Permission already granted, ensuring WebPush subscription exists`);
        
        const subscriptionCreated = await ensureSubscription(15000);
        if (subscriptionCreated) {
          // **Phase 3: Enhanced backend sync and verification**
          try {
            await ensureOneSignalUser();
            const verification = await verifySubscription();
            
            if (verification.local) {
              // Update database status
              await updateUserSubscriptionStatus(true, os.User?.PushSubscription?.id);
              return { 
                success: true, 
                details: { 
                  alreadyGranted: true, 
                  subscriptionCreated, 
                  verification,
                  playerId: os.User?.PushSubscription?.id
                } 
              };
            } else {
              console.warn('[OneSignal] Verification failed but local subscription exists');
              return { success: true, details: { alreadyGranted: true, verificationWarning: true } };
            }
          } catch (syncError) {
            console.warn('[OneSignal] Backend sync failed but subscription exists:', syncError);
            return { success: true, details: { alreadyGranted: true, syncWarning: true } };
          }
        } else {
          return { 
            success: false, 
            error: "Notification permission is granted but WebPush subscription failed. Please try again or check browser settings." 
          };
        }
      }

      // **Phase 3: Enhanced subscription flow with comprehensive error handling**
      try {
        if (debug) console.info(`[OneSignal] Creating WebPush subscription for ${browserInfo.name}`);
        
        const subscriptionResult = await ensureSubscription(browserConfig.subscriptionTimeout);
        
        if (!subscriptionResult) {
          const errorDetails = {
            browser: browserInfo.name,
            version: browserInfo.version,
            permission: typeof Notification !== 'undefined' ? Notification.permission : 'unknown',
            oneSignalReady: !!(window as any).OneSignal,
            pushSubscriptionAPI: !!os?.User?.PushSubscription,
            isSecureContext: typeof window !== 'undefined' ? window.isSecureContext : false
          };
          
          // **Enhanced user-friendly error messages**
          let userMessage = `WebPush subscription failed in ${browserInfo.name}.`;
          if (errorDetails.permission === 'denied') {
            userMessage = `Notifications are blocked in ${browserInfo.name}. Please enable them in browser settings and try again.`;
          } else if (!errorDetails.isSecureContext) {
            userMessage = 'Push notifications require a secure connection (HTTPS). Please access the site via HTTPS.';
          } else if (browserInfo.name === 'Safari') {
            userMessage = 'Safari requires explicit permission. Please allow notifications when prompted and try again.';
          }
          
          return { 
            success: false, 
            error: userMessage, 
            details: errorDetails 
          };
        }

        // **Update permission state and get player_id**
        if (typeof Notification !== 'undefined') {
          setPermission(Notification.permission);
        }
        
        const playerId = os.User?.PushSubscription?.id;
        if (debug && playerId) {
          console.info(`[OneSignal] WebPush subscription successful - Player ID: ${playerId}`);
        }

        // **Phase 3: Robust backend synchronization with graceful degradation**
        let syncSuccess = false;
        let verificationResult = null;
        
        try {
          // Try user sync first
          if (playerId) {
            syncSuccess = await ensureOneSignalUserWithPlayerId(playerId);
          } else {
            syncSuccess = await ensureOneSignalUser();
          }
          
          // Try verification (don't fail if this fails)
          verificationResult = await verifySubscription();
          
          // Update database subscription status
          await updateUserSubscriptionStatus(true, playerId);
          
        } catch (backendError) {
          console.warn('[OneSignal] Backend sync failed but WebPush subscription successful:', backendError);
          // Don't fail the entire flow - local subscription is what matters most
        }

        return { 
          success: true, 
          details: { 
            browser: browserInfo.name,
            playerId,
            syncSuccess,
            verification: verificationResult,
            subscriptionResult: true
          }
        };

      } catch (subscriptionError) {
        console.error(`[OneSignal] WebPush subscription error for ${browserInfo.name}:`, subscriptionError);
        
        // **Enhanced user-friendly error messages**
        let userMessage = `Failed to enable notifications in ${browserInfo.name}. Please try again.`;
        if (subscriptionError.message?.includes('denied')) {
          userMessage = `You denied notification permission. Please enable notifications in ${browserInfo.name} settings and try again.`;
        } else if (subscriptionError.message?.includes('timeout')) {
          userMessage = `Request timed out. Please check your internet connection and try again.`;
        }
        
        return { 
          success: false, 
          error: userMessage,
          details: { 
            browser: browserInfo.name, 
            originalError: subscriptionError.message,
            errorType: 'subscription_failed'
          }
        };
      }

    } catch (error) {
      console.error(`[OneSignal] Critical permission request error:`, error);
      return { 
        success: false, 
        error: "An unexpected error occurred. Please refresh the page and try again.",
        details: { 
          originalError: error.message,
          errorType: 'critical_error'
        }
      };
    }
  };

  // Function to update user subscription status in database
  const updateUserSubscriptionStatus = async (isSubscribed: boolean, playerId?: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          push_subscription_active: isSubscribed,
          onesignal_subscription_status: isSubscribed ? 'subscribed' : 'unsubscribed',
          onesignal_last_verified_at: new Date().toISOString(),
          onesignal_player_id: playerId || null
        })
        .eq('id', user.id);

      if (error) {
        console.error('[OneSignal] Error updating subscription status:', error);
      } else {
        console.log('[OneSignal] User subscription status updated in database');
      }
    } catch (error) {
      console.error('[OneSignal] Database update failed:', error);
    }
  };

  return { 
    initialized, 
    requestPermission, 
    permission, 
    isGranted: permission === 'granted' && hasSubscription, 
    hasSubscription, 
    isIframeBlocked,
    browserInfo,
    browserInstructions: getBrowserInstructions(browserInfo)
  };
}
