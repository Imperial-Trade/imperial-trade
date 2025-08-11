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
              // Only login/identify after we know a subscription exists to avoid origin errors
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
                try { console.info('[OneSignal] User logged in but no push subscription yet; will login after subscription is created.'); } catch {}
              }
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
    // Fast path: attempt subscribe() immediately, then finalize identity/tags
    try {
      if (isIframeBlocked) {
        console.warn("Notifications permission cannot be requested within an iframe preview. Open in a new tab.");
        return;
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
          const id = ps?.id ?? null;
          setSubscriptionId(id);
          setHasSubscription(true);
        } catch {}
        return;
      }

      let subscribed = alreadySub;

      // 1) Try OneSignal subscribe() which both prompts and subscribes
      if (!subscribed && os?.Notifications?.subscribe) {
        try {
          await withTimeout(os.Notifications.subscribe(), 10000).catch(() => {});
        } catch {}
        try {
          const id = os?.User?.PushSubscription?.id ?? null;
          const optedIn = !!os?.User?.PushSubscription?.optedIn;
          setSubscriptionId(id);
          setHasSubscription(!!(id || optedIn));
          subscribed = !!(id || optedIn);
        } catch {}
      }

      // 2) Fallback to requestPermission() then ensureSubscription
      if (!subscribed && os?.Notifications?.requestPermission) {
        try {
          await withTimeout(os.Notifications.requestPermission(), 8000).catch(() => {});
        } catch {}
        subscribed = await ensureSubscription(12000);
      }

      // 3) Final fallback: native Notification API
      if (!subscribed && typeof Notification !== 'undefined' && Notification.permission === 'default' && Notification.requestPermission) {
        try {
          const res = await withTimeout(Promise.resolve(Notification.requestPermission()), 8000).catch(() => 'default');
          if (res === 'granted') {
            subscribed = await ensureSubscription(12000);
          }
        } catch {}
      }

      // Link identity and tags in parallel (non-blocking for UX)
      if (subscribed && user?.id) {
        try {
          const ops: Promise<any>[] = [];
          ops.push(withTimeout(Promise.resolve(os?.login?.(user.id)), 3000).catch(() => {}));
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
        } catch {}
      }
    } catch (_) {
      // Swallow errors; we'll update state below
    } finally {
      try { if (typeof Notification !== 'undefined') setPermission(Notification.permission); } catch {}
      try {
        const ps = (window as any).OneSignal?.User?.PushSubscription;
        const id = ps?.id ?? null;
        setSubscriptionId(id);
        setHasSubscription(!!(ps?.optedIn ?? id));
        if (!id && !ps?.optedIn) {
          console.warn('[OneSignal] No subscription detected after permission flow. Verify Web Push configuration for origin:', location.origin);
        }
      } catch {}
    }
  };

  return { initialized, requestPermission, permission, isGranted: permission === 'granted' && hasSubscription, isIframeBlocked };
}
