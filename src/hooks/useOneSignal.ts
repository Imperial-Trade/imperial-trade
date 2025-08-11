import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

declare global {
  interface Window {
    OneSignal?: any;
  }
}

export function useOneSignal() {
  const { user, profile } = useAuth();
  const [initialized, setInitialized] = useState(false);

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
          script.src = "https://cdn.onesignal.com/sdks/OneSignalSDK.js";
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

        // Link/unlink user
        window.OneSignal.push(function () {
          try {
            if (user?.id) {
              (window as any).OneSignal.login(user.id);
              const tags: Record<string, string> = {};
              if (profile?.role) tags["role"] = String(profile.role);
              if (profile?.user_type) tags["user_type"] = String(profile.user_type);
              if (Object.keys(tags).length > 0) {
                (window as any).OneSignal.sendTags(tags).catch(() => {});
              }
            } else {
              (window as any).OneSignal.logout?.();
            }
          } catch (_) {}
        });

        setInitialized(true);
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
      if (window.OneSignal?.Notifications?.requestPermission) {
        await window.OneSignal.Notifications.requestPermission();
      } else if (typeof window.OneSignal?.push === 'function') {
        await new Promise<void>((resolve) => {
          window.OneSignal!.push(async function () {
            try {
              await (window as any).OneSignal.registerForPushNotifications?.();
            } finally {
              resolve();
            }
          });
        });
      }
    } catch (_) {}
  };
  return { initialized, requestPermission };
}
