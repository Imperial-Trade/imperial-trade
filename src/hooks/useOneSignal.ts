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

            if (user?.id) {
              (window as any).OneSignal.login(user.id);
              const tags: Record<string, string> = {};
              if (profile?.role) tags["role"] = String(profile.role);
              if (profile?.user_type) tags["user_type"] = String(profile.user_type);
              if (Object.keys(tags).length > 0) {
                const applyTags = async () => {
                  if ((window as any).OneSignal.User?.addTags) {
                    await (window as any).OneSignal.User.addTags(tags);
                  } else if ((window as any).OneSignal.sendTags) {
                    await (window as any).OneSignal.sendTags(tags);
                  }
                };
                applyTags().catch(() => {});
              }
            } else {
              (window as any).OneSignal.logout?.();
            }

            // Mark initialized only after SDK is ready and setup completed
            setInitialized(true);
            try { if (typeof Notification !== 'undefined') setPermission(Notification.permission); } catch {}
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

  const requestPermission = async () => {
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
              if (os && (os.Notifications || typeof os.push === 'function')) return resolve();
            } catch {}
            setTimeout(check, 50);
          };
          check();
        }),
        10000
      ).catch(() => {});

      // Request permission using available API
      if ((window as any).OneSignal?.Notifications?.requestPermission) {
        await withTimeout((window as any).OneSignal.Notifications.requestPermission(), 10000).catch(() => {});
      } else if (typeof (window as any).OneSignal?.push === 'function') {
        await withTimeout(
          new Promise<void>((resolve) => {
            (window as any).OneSignal!.push(async function () {
              try {
                const regFn = (window as any).OneSignal.registerForPushNotifications?.();
                await withTimeout(Promise.resolve(regFn), 10000).catch(() => {});
              } finally {
                resolve();
              }
            });
          }),
          10000
        ).catch(() => {});
      }
    } catch (_) {
      // Swallow errors; we'll update state below
    } finally {
      try { if (typeof Notification !== 'undefined') setPermission(Notification.permission); } catch {}

      // Ensure user is linked and tags are applied after permission flow
      try {
        if (user?.id) {
          await withTimeout(Promise.resolve((window as any).OneSignal?.login?.(user.id)), 5000).catch(() => {});
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
    }
  };
  return { initialized, requestPermission, permission, isGranted: permission === 'granted', isIframeBlocked };
}

