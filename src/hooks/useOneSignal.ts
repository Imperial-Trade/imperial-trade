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

        // Get public config (appId) from secure Edge Function
        const { data, error } = await supabase.functions.invoke("onesignal-config", {
          method: "GET",
        });
        if (error || !data?.appId) {
          console.warn("OneSignal config not available:", error || data);
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

        // Enhanced OneSignal initialization with singleton pattern
        if (typeof window !== 'undefined') {
          window.OneSignal = window.OneSignal || ([] as any[]);
          
          // Prevent multiple initializations
          if ((window as any).OneSignal?.__IMPERIAL_INIT_DONE__) {
            if (debug) console.info('[OneSignal] Already initialized, skipping');
            setInitialized(true);
            return;
          }

          // Wait for SDK to be fully ready with browser-specific timeout
          await new Promise<void>((resolve) => {
            const timeout = browserConfig.subscriptionTimeout;
            const startTime = Date.now();
            
            const checkReady = () => {
              try {
                if ((window as any).OneSignal?.init) {
                  resolve();
                  return;
                }
              } catch {}
              
              if (Date.now() - startTime < timeout) {
                setTimeout(checkReady, 100);
              } else {
                console.warn('[OneSignal] SDK readiness timeout');
                resolve();
              }
            };
            checkReady();
          });

          // Initialize with browser-specific configuration
          window.OneSignal.push(function () {
            try {
              const initConfig = {
                appId: data.appId,
                allowLocalhostAsSecureOrigin: true,
                notifyButton: { enable: false },
                ...(data.safariWebId && { safari_web_id: data.safariWebId }),
                // Browser-specific optimizations
                ...(browserInfo.name === 'Safari' && {
                  autoRegister: false, // Manual registration for Safari
                  autoResubscribe: true
                }),
                ...(browserInfo.name === 'Firefox' && {
                  persistNotification: true // Better for Firefox
                })
              };
              
              (window as any).OneSignal.init(initConfig);
              (window as any).OneSignal.__IMPERIAL_INIT_DONE__ = true;
              
              if (debug) console.info('[OneSignal] SDK initialized with config:', initConfig);
            } catch (error) {
              console.error('[OneSignal] Initialization error:', error);
            }
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
  
  // Ensure the OneSignal User exists and has email subscription on server
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

  // Verify subscription helper - both locally and server-side
  const verifySubscription = async (): Promise<{ local: boolean; remote?: any; error?: string }> => {
    try {
      const os = (window as any).OneSignal;
      if (!os) return { local: false, error: "OneSignal not loaded" };
      
      const ps = os?.User?.PushSubscription;
      const subscriptionId = ps?.id;
      const optedIn = ps?.optedIn;
      const localSubscribed = !!(subscriptionId && optedIn);
      
      // Also verify server-side if user is available
      let remoteVerification = null;
      if (user?.id) {
        try {
          const { data: remoteData } = await supabase.functions.invoke('onesignal-verify-subscription', {
            body: { user_id: user.id }
          });
          remoteVerification = remoteData;
        } catch (err) {
          console.warn('[OneSignal] Remote verification failed:', err);
        }
      }
      
      return { 
        local: localSubscribed, 
        remote: remoteVerification,
        error: !localSubscribed && !remoteVerification?.subscribed ? "Not subscribed" : undefined
      };
    } catch (err) {
      return { local: false, error: `Verification failed: ${err.message}` };
    }
  };

  // Enhanced subscription creation with browser-specific handling
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
        if (debug) console.info(`[OneSignal] Subscription already exists (${browserInfo.name})`);
        return true;
      }

      // Use browser-specific timeout and retry configuration
      const actualTimeout = Math.min(maxWaitMs, browserConfig.subscriptionTimeout);
      const start = Date.now();
      let attempt = 0;
      
      if (debug) console.info(`[OneSignal] Starting subscription for ${browserInfo.name} (timeout: ${actualTimeout}ms)`);

      while (Date.now() - start < actualTimeout) {
        attempt += 1;
        try {
          if (debug) console.info(`[OneSignal] subscribe() attempt ${attempt}/${browserConfig.maxRetries} (${browserInfo.name})`);
          
          // Browser-specific subscription approach
          if (browserInfo.name === 'Safari') {
            // Safari needs special handling
            await withTimeout(os.Notifications.requestPermission(), browserConfig.permissionTimeout);
            await new Promise(r => setTimeout(r, 500)); // Small delay for Safari
            await withTimeout(os.Notifications.subscribe(), browserConfig.subscriptionTimeout);
          } else {
            // Standard approach for other browsers
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

const requestPermission = async (): Promise<{ success: boolean; error?: string; details?: any }> => {
    try {
      if (isIframeBlocked) {
        const error = "Notifications permission cannot be requested within an iframe preview. Open in a new tab.";
        console.warn(error);
        return { success: false, error };
      }

      // Browser compatibility check
      if (!browserInfo.isSupported) {
        const error = `Browser ${browserInfo.name} ${browserInfo.version} is not supported for push notifications`;
        console.warn(error);
        return { 
          success: false, 
          error, 
          details: { 
            browser: browserInfo.name, 
            version: browserInfo.version,
            instructions: getBrowserInstructions(browserInfo)
          }
        };
      }

      if (debug) console.info(`[OneSignal] Starting permission request flow for ${browserInfo.name} ${browserInfo.version}...`);
      
      // STEP 1: FIRST ensure OneSignal user exists to prevent duplication
      const userCreated = await ensureOneSignalUser();
      if (!userCreated) {
        console.warn('[OneSignal] Failed to create OneSignal user. Continuing with subscription attempt...');
        return { success: false, error: "Failed to create OneSignal user", details: { step: "user_creation" } };
      }
      
      // Wait briefly for OneSignal SDK readiness (Notifications available)
      await withTimeout(
        new Promise<void>((resolve) => {
          const start = Date.now();
          const check = () => {
            try {
              const os = (window as any).OneSignal;
              if (os?.Notifications) return resolve();
            } catch {}
            if (Date.now() - start > 7000) return resolve();
            setTimeout(check, 50);
          };
          check();
        }),
        7000
      ).catch(() => {});

      const os = (window as any).OneSignal;
      const currentPerm = typeof Notification !== 'undefined' ? Notification.permission : 'default';
      const ps = os?.User?.PushSubscription;
      const alreadySub = !!(ps?.optedIn || ps?.id);
      
      if (currentPerm === 'granted' && alreadySub) {
        try {
          setHasSubscription(true);
          // Ensure user is logged in even if already subscribed
          if (user?.id) {
            await withTimeout(Promise.resolve(os?.login?.(user.id)), 3000).catch(() => {});
            if (debug) console.info('[OneSignal] User already subscribed and logged in');
          }
        } catch {}
        return { success: true };
      }

      let subscribed = alreadySub;

      // STEP 2: Browser-specific subscription approach
      if (!subscribed && os?.Notifications) {
        try {
          if (debug) console.info(`[OneSignal] Attempting ${browserInfo.name} subscription...`);
          
          if (browserInfo.name === 'Safari') {
            // Safari requires explicit permission request first
            if (os.Notifications.requestPermission) {
              await withTimeout(os.Notifications.requestPermission(), browserConfig.permissionTimeout).catch(() => {});
              await new Promise(r => setTimeout(r, 1000)); // Give Safari time to process
            }
            if (os.Notifications.subscribe) {
              await withTimeout(os.Notifications.subscribe(), browserConfig.subscriptionTimeout).catch(() => {});
            }
          } else if (browserInfo.name === 'Firefox') {
            // Firefox works better with longer timeouts
            if (os.Notifications.subscribe) {
              await withTimeout(os.Notifications.subscribe(), browserConfig.subscriptionTimeout).catch(() => {});
            }
          } else {
            // Chrome/Edge standard approach
            if (os.Notifications.subscribe) {
              await withTimeout(os.Notifications.subscribe(), browserConfig.subscriptionTimeout).catch(() => {});
            }
          }
          
          // Check subscription state
          const sid = os?.User?.PushSubscription?.id ?? null;
          const opted = !!os?.User?.PushSubscription?.optedIn;
          setHasSubscription(!!(sid || opted));
          subscribed = !!(sid || opted);
          
          if (subscribed && debug) {
            console.info(`[OneSignal] ${browserInfo.name} subscription successful:`, { id: sid, optedIn: opted });
          }
        } catch (e) {
          console.warn(`[OneSignal] ${browserInfo.name} subscription failed:`, e);
        }
      }

      // STEP 3: Fallback to requestPermission() then ensureSubscription for failed attempts
      if (!subscribed && os?.Notifications?.requestPermission) {
        try {
          if (debug) console.info(`[OneSignal] Fallback: requesting permission for ${browserInfo.name}...`);
          await withTimeout(os.Notifications.requestPermission(), browserConfig.permissionTimeout).catch(() => {});
          subscribed = await ensureSubscription(browserConfig.subscriptionTimeout);
        } catch (e) {
          console.warn(`[OneSignal] Permission request fallback failed for ${browserInfo.name}:`, e);
        }
      }

      // STEP 4: Final fallback: native Notification API (for browsers that support it)
      if (!subscribed && typeof Notification !== 'undefined' && Notification.permission === 'default' && Notification.requestPermission) {
        try {
          if (debug) console.info(`[OneSignal] Final fallback: native API for ${browserInfo.name}...`);
          const res = await withTimeout(Promise.resolve(Notification.requestPermission()), browserConfig.permissionTimeout).catch(() => 'default');
          if (res === 'granted') {
            subscribed = await ensureSubscription(browserConfig.subscriptionTimeout);
          }
        } catch (e) {
          console.warn(`[OneSignal] Native API fallback failed for ${browserInfo.name}:`, e);
        }
      }

      // STEP 5: ALWAYS login user immediately after successful subscription
      if (subscribed && user?.id) {
        try {
          if (debug) console.info('[OneSignal] Logging in user and setting up identity...');
          
          // Login FIRST - this is critical for proper user linking
          await withTimeout(Promise.resolve(os?.login?.(user.id)), 3000).catch(() => {});
          
          // Then set up identity and tags in parallel
          const ops: Promise<any>[] = [];
          if (user?.email) {
            const osUser = os?.User;
            if (osUser?.addEmail) ops.push(withTimeout(osUser.addEmail(user.email), 3000).catch(() => {}));
            const emailTag = { email: user.email } as Record<string, string>;
            if (osUser?.addTags) ops.push(withTimeout(osUser.addTags(emailTag), 3000).catch(() => {}));
            else if (os?.sendTags) ops.push(withTimeout(os.sendTags(emailTag), 3000).catch(() => {}));
          }
          const tags: Record<string, string> = {};
          if (profile?.role) tags["role"] = String(profile.role);
          if (profile?.user_type) tags["user_type"] = String(profile.user_type);
          if (Object.keys(tags).length) {
            if (os?.User?.addTags) ops.push(withTimeout(os.User.addTags(tags), 3000).catch(() => {}));
            else if (os?.sendTags) ops.push(withTimeout(os.sendTags(tags), 3000).catch(() => {}));
          }
          await Promise.allSettled(ops);
          
          // Verify the subscription worked
          const verification = await verifySubscription();
          if (verification.local && debug) {
            console.info('[OneSignal] Complete setup successful - user subscribed and logged in', verification);
          } else if (!verification.local) {
            console.warn('[OneSignal] Subscription verification failed', verification);
          }

        } catch (err) {
          console.warn('[OneSignal] Error during user login/identity setup:', err);
        }
      }
      // STEP 5: Final verification
      const verification = await verifySubscription();
      const success = verification.local || verification.remote?.subscribed;
      
      if (debug) console.info('[OneSignal] Permission request completed:', { 
        subscribed, 
        verification,
        success 
      });

      return { 
        success, 
        error: success ? undefined : verification.error || "Subscription verification failed",
        details: { verification, subscribed }
      };
    } catch (err) {
      console.error('[OneSignal] requestPermission error:', err);
      return { success: false, error: `Permission request failed: ${err.message}`, details: { originalError: err } };
    } finally {
      try { if (typeof Notification !== 'undefined') setPermission(Notification.permission); } catch {}
      try {
        const ps = (window as any).OneSignal?.User?.PushSubscription;
        const sid = ps?.id ?? null;
        setHasSubscription(!!(ps?.optedIn ?? sid));
        if (!sid && !ps?.optedIn) {
          console.warn('[OneSignal] No subscription detected after permission flow. Verify Web Push configuration for origin:', location.origin);
        }
      } catch {}
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
