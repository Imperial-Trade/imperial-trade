import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

declare global {
  interface Window {
    OneSignal?: any[] & { push: (fn: () => void) => void };
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

        window.OneSignal = window.OneSignal || [] as any[];
        window.OneSignal.push(function () {
          window.OneSignal!.SDK_INITIALIZED = true;
        });

        // Initialize
        window.OneSignal.push(function () {
          window.OneSignal!.init({
            appId: data.appId,
            allowLocalhostAsSecureOrigin: true,
            notifyButton: { enable: false },
            safari_web_id: data.safariWebId,
          });
        });

        // Link user if logged in
        if (user?.id) {
          window.OneSignal.push(function () {
            try {
              window.OneSignal!.login(user.id);
              // Optional: set tags for segmentation
              const tags: Record<string, string> = {};
              if (profile?.role) tags["role"] = String(profile.role);
              if (profile?.user_type) tags["user_type"] = String(profile.user_type);
              if (Object.keys(tags).length > 0) {
                window.OneSignal!.sendTags(tags).catch(() => {});
              }
            } catch (_) {}
          });
        }

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
      await window.OneSignal?.Notifications?.requestPermission();
    } catch (_) {}
  };

  return { initialized, requestPermission };
}
