import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { withTimeout } from "@/api/client/utils/timeout";

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
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const isIframeBlocked = typeof window !== 'undefined' && window.self !== window.top;

  useEffect(() => {
    let cancelled = false;

    const setupOneSignal = async () => {
      try {
        // Get public config (appId) from secure Edge Function
        const { data, error } = await supabase.functions.invoke("onesignal-config", {
          method: "GET",
        });
        if (error || !data?.appId) {
          console.warn("OneSignal config not available:", error || data);
          return;
        }

        // Inject OneSignal SDK script
        await new Promise<void>((resolve, reject) => {
          if (document.getElementById("onesignal-sdk")) return resolve();
          const script = document.createElement("script");
          script.id = "onesignal-sdk";
          script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load OneSignal SDK"));
          document.head.appendChild(script);
        });

        if (cancelled) return;

        // Ensure OneSignal queue exists
        window.OneSignal = window.OneSignal || ([] as any[]);
        // Mark SDK as initialized once loaded
        window.OneSignal.push(function () {
          try { (window as any).OneSignal.SDK_INITIALIZED = true; } catch {}
        });

        // Initialize only once
        if (!(window as any).OneSignal?.__INIT_DONE__) {
          window.OneSignal.push(function () {
            try {
              (window as any).OneSignal.init({
                appId: data.appId,
                allowLocalhostAsSecureOrigin: true,
                notifyButton: { enable: false },
                safari_web_id: data.safariWebId,
              });
              (window as any).OneSignal.__INIT_DONE__ = true;
            } catch (_) {}
          });
        }

        // Link/unlink user and observe permissions
        window.OneSignal.push(function () {
          try {
            // Keep permission state in sync
            (window as any).OneSignal.Notifications?.addEventListener?.(
              "permissionChange",
              () => {
                try { if (typeof Notification !== 'undefined') setPermission(Notification.permission); } catch {}
              }
            );

            // Track push subscription state
            const ps = (window as any).OneSignal?.User?.PushSubscription;
            if (ps) {
              try {
                const id = ps.id;
                setSubscriptionId(id ?? null);
                setHasSubscription(!!(ps.optedIn ?? id));
                ps.addEventListener?.('change', () => {
                  try {
                    const nid = ps.id;
                    setSubscriptionId(nid ?? null);
                    setHasSubscription(!!(ps.optedIn ?? nid));
                  } catch {}
                });
              } catch {}
            }

            if (user?.id) {
              (window as any).OneSignal.login(user.id);
              // Attach email identity and tags
              const applyIdentity = async () => {
                try {
                  if (user?.email) {
                    const osUser = (window as any).OneSignal?.User;
                    if (osUser?.addEmail) {
                      await osUser.addEmail(user.email);
                      try { console.info('[OneSignal] Email identity attached:', user.email); } catch {}
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
              (window as any).OneSignal.logout?.();
            }

            // Mark initialized only after SDK is ready and setup completed
            setInitialized(true);
            try { if (typeof Notification !== 'undefined') setPermission(Notification.permission); } catch {}
            console.info('[OneSignal] SDK initialized and listeners attached');
            // Ensure a real subscription exists if permission is already granted
            try {
              const os = (window as any).OneSignal;
              const ps = os?.User?.PushSubscription;
              const currentPerm = typeof Notification !== 'undefined' ? Notification.permission : 'default';
              const hasSub = !!(ps?.optedIn || ps?.id);
              if (currentPerm === 'granted' && !hasSub) {
                console.info('[OneSignal] Permission granted but no subscription found. Ensuring subscription...');
                ensureSubscription(20000)
                  .then((ok) => {
                    if (ok) {
                      console.info('[OneSignal] Auto-subscribe completed.');
                      try { if (user?.id) os?.login?.(user.id); } catch {}
                    } else {
                      console.warn('[OneSignal] Auto-subscribe timed out. Verify OneSignal Web Push Site URL matches origin:', location.origin);
                    }
                  })
                  .catch((err) => {
                    console.warn('[OneSignal] Auto-subscribe error:', err);
                  });
                // Optional diagnostic: check service worker registrations
                try {
                  navigator.serviceWorker?.getRegistrations?.().then((regs) => {
                    const hasOSW = regs?.some(r => r.active?.scriptURL?.includes('OneSignalSDKWorker')); 
                    console.info('[OneSignal] SW registered:', { count: regs?.length || 0, hasOneSignalWorker: !!hasOSW });
                  }).catch(() => {});
                } catch {}
              }
            } catch {}
          } catch (_) {}
        });

      } catch (e) {
        console.warn("OneSignal init failed", e);
      }
    };

    setupOneSignal();
    return () => {
      cancelled = true;
    };
  }, [user?.id, profile?.role, profile?.user_type]);
  
  // Ensure a OneSignal web push subscription exists; retries for up to maxWaitMs
  const ensureSubscription = async (maxWaitMs: number = 20000): Promise<boolean> => {
    try {
      const os = (window as any).OneSignal;
      if (!os?.Notifications || !os?.User?.PushSubscription) {
        console.warn('[OneSignal] SDK not ready for subscription.');
        return false;
      }

      const ps = os.User.PushSubscription;
      const already = !!(ps?.optedIn || ps?.id);
      if (already) {
        setSubscriptionId(ps.id ?? null);
        setHasSubscription(true);
        return true;
      }

      const start = Date.now();
      let attempt = 0;
      while (Date.now() - start < maxWaitMs) {
        attempt += 1;
        try {
          console.info(`[OneSignal] subscribe() attempt ${attempt}`);
          await withTimeout(os.Notifications.subscribe(), Math.min(10000, maxWaitMs));
        } catch (e) {
          console.warn('[OneSignal] subscribe() attempt failed:', (e as any)?.message || e);
        }

        // Poll for subscription state for a short window between attempts
        const pollStart = Date.now();
        while (Date.now() - pollStart < 2000) {
          try {
            const id = os?.User?.PushSubscription?.id ?? null;
            const optedIn = !!os?.User?.PushSubscription?.optedIn;
            setSubscriptionId(id);
            setHasSubscription(!!(id || optedIn));
            if (id || optedIn) {
              console.info('[OneSignal] Subscription confirmed:', { id, optedIn });
              return true;
            }
          } catch {}
          await new Promise((r) => setTimeout(r, 200));
        }

        // Backoff between attempts
        const backoff = Math.min(2000 * attempt, 4000);
        await new Promise((r) => setTimeout(r, backoff));
      }

      console.warn('[OneSignal] ensureSubscription timeout after', maxWaitMs, 'ms');
      return false;
    } catch (err) {
      console.warn('[OneSignal] ensureSubscription error:', err);
      return false;
    }
  };

  const requestPermission = async () => {
    // Using ensureSubscription() for confirmation after permission is granted
    try {
      if (isIframeBlocked) {
        console.warn("Notifications permission cannot be requested within an iframe preview. Open in a new tab.");
        return;
      }

      // Wait for OneSignal to be ready (up to 10s)
      await withTimeout(
        new Promise<void>((resolve) => {
          const check = () => {
            try {
              const os = (window as any).OneSignal;
              if (os?.Notifications) return resolve();
            } catch {}
            setTimeout(check, 50);
          };
          check();
        }),
        10000
      ).catch(() => {});

      let permResult: NotificationPermission | undefined;
      if ((window as any).OneSignal?.Notifications?.requestPermission) {
        // v16 API
        try {
          permResult = (await withTimeout((window as any).OneSignal.Notifications.requestPermission(), 10000).catch(() => undefined)) as NotificationPermission | undefined;
        } catch {
          permResult = undefined;
        }
      }

      // Subscribe after permission is granted
      const currentPermission = typeof Notification !== 'undefined' ? Notification.permission : permResult;
      if (currentPermission === 'granted') {
        const ok = await ensureSubscription(20000);
        if (!ok) {
          console.warn('[OneSignal] Subscription did not finalize after permission grant. Verify Site URL matches origin:', location.origin);
        } else if (user?.id) {
          await withTimeout(Promise.resolve((window as any).OneSignal?.login?.(user.id)), 5000).catch(() => {});
        }
      }

      // If no prompt showed (still 'default'), try native prompt then ensure subscription
      if ((typeof Notification !== 'undefined' ? Notification.permission : 'default') === 'default') {
        try {
          const nativeRes = await withTimeout(Promise.resolve(Notification.requestPermission()), 10000).catch(() => 'default');
          if (nativeRes === 'granted') {
            const ok = await ensureSubscription(20000);
            if (!ok) {
              console.warn('[OneSignal] Subscription did not finalize after native grant. Check configuration for', location.origin);
            }
          }
        } catch {}
      }
    } catch (_) {
      // Swallow errors; we'll update state below
    } finally {
      try { if (typeof Notification !== 'undefined') setPermission(Notification.permission); } catch {}

      // Link user and apply tags after the permission/subscribe flow
      try {
        if (user?.id) {
          await withTimeout(Promise.resolve((window as any).OneSignal?.login?.(user.id)), 5000).catch(() => {});
          // Attach email to user profile in OneSignal (discoverable by email)
          if (user?.email) {
            const osUser = (window as any).OneSignal?.User;
            if (osUser?.addEmail) {
              await withTimeout(osUser.addEmail(user.email), 5000).catch(() => {});
              try { console.info('[OneSignal] Email identity attached:', user.email); } catch {}
            }
            const emailTag = { email: user.email } as Record<string, string>;
            if (osUser?.addTags) {
              await withTimeout(osUser.addTags(emailTag), 5000).catch(() => {});
            } else if ((window as any).OneSignal?.sendTags) {
              await withTimeout((window as any).OneSignal.sendTags(emailTag), 5000).catch(() => {});
            }
          }
          const tags: Record<string, string> = {};
          if (profile?.role) tags["role"] = String(profile.role);
          if (profile?.user_type) tags["user_type"] = String(profile.user_type);
          if (Object.keys(tags).length > 0) {
            if ((window as any).OneSignal?.User?.addTags) {
              await withTimeout((window as any).OneSignal.User.addTags(tags), 5000).catch(() => {});
            } else if ((window as any).OneSignal?.sendTags) {
              await withTimeout((window as any).OneSignal.sendTags(tags), 5000).catch(() => {});
            }
          }
        }
      } catch (_) {}

      // Refresh subscription state (final check)
      try {
        const ps = (window as any).OneSignal?.User?.PushSubscription;
        const id = ps?.id ?? null;
        setSubscriptionId(id);
        setHasSubscription(!!(ps?.optedIn ?? id));
        if (!id && !ps?.optedIn) {
          console.warn('[OneSignal] No subscription detected after permission flow. Verify OneSignal Web Push configuration for origin:', location.origin);
        }
      } catch (_) {}
    }
  };

  return { initialized, requestPermission, permission, isGranted: permission === 'granted' && hasSubscription, isIframeBlocked };
}
