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
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported"
  );

  const [hasSubscription, setHasSubscription] = useState(false);
  const isIframeBlocked =
    typeof window !== "undefined" && window.self !== window.top;
  const debug = (() => {
    try {
      return localStorage.getItem("onesignal_debug") === "1";
    } catch {
      return false;
    }
  })();
  useEffect(() => {
    let cancelled = false;

    const setupOneSignal = async () => {
      try {
        // Get public config (appId) from secure Edge Function
        const { data, error } = await supabase.functions.invoke(
          "onesignal-config",
          {
            method: "GET",
          }
        );
        if (error || !data?.appId) {
          logger.warn("OneSignal config not available:", error || data);
          return;
        }

        // Inject OneSignal SDK script
        await new Promise<void>((resolve, reject) => {
          if (document.getElementById("onesignal-sdk")) return resolve();
          const script = document.createElement("script");
          script.id = "onesignal-sdk";
          script.src =
            "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () =>
            reject(new Error("Failed to load OneSignal SDK"));
          document.head.appendChild(script);
        });

        if (cancelled) return;

        // Ensure OneSignal queue exists
        window.OneSignal = window.OneSignal || ([] as any[]);
        // Mark SDK as initialized once loaded
        window.OneSignal.push(function () {
          try {
            (window as any).OneSignal.SDK_INITIALIZED = true;
          } catch {}
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
                try {
                  if (typeof Notification !== "undefined")
                    setPermission(Notification.permission);
                } catch {}
              }
            );

            // Track push subscription state
            const ps = (window as any).OneSignal?.User?.PushSubscription;
            if (ps) {
              try {
                const id = ps.id;

                setHasSubscription(!!(ps.optedIn ?? id));
                ps.addEventListener?.("change", () => {
                  try {
                    const nid = ps.id;

                    setHasSubscription(!!(ps.optedIn ?? nid));
                  } catch {}
                });
              } catch {}
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
                        try {
                          if (debug)
                            logger.info(
                              "[OneSignal] Email identity attached:",
                              user.email
                            );
                        } catch {}
                      }
                      // Also add email as a tag for easy segmentation/search
                      const emailTag = { email: user.email } as Record<
                        string,
                        string
                      >;
                      if (osUser?.addTags) {
                        await osUser.addTags(emailTag);
                      } else if ((window as any).OneSignal?.sendTags) {
                        await (window as any).OneSignal.sendTags(emailTag);
                      }
                    }
                    const tags: Record<string, string> = {};
                    if (profile?.role) tags["role"] = String(profile.role);
                    if (profile?.user_type)
                      tags["user_type"] = String(profile.user_type);
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
                try {
                  if (debug)
                    logger.info(
                      "[OneSignal] User logged in but no push subscription yet; will login after subscription is created."
                    );
                } catch {}
              }
            } else {
              (window as any).OneSignal.logout?.();
            }

            // Mark initialized only after SDK is ready and setup completed
            setInitialized(true);
            try {
              if (typeof Notification !== "undefined")
                setPermission(Notification.permission);
            } catch {}
            if (debug)
              logger.info("[OneSignal] SDK initialized and listeners attached");
            // Ensure a real subscription exists if permission is already granted
            try {
              const os = (window as any).OneSignal;
              const ps = os?.User?.PushSubscription;
              const currentPerm =
                typeof Notification !== "undefined"
                  ? Notification.permission
                  : "default";
              const hasSub = !!(ps?.optedIn || ps?.id);
              if (currentPerm === "granted" && !hasSub) {
                if (debug)
                  logger.info(
                    "[OneSignal] Permission granted but no subscription found. Ensuring subscription..."
                  );
                ensureSubscription(20000)
                  .then((ok) => {
                    if (ok) {
                      if (debug)
                        logger.info("[OneSignal] Auto-subscribe completed.");
                      try {
                        if (user?.id) os?.login?.(user.id);
                      } catch {}
                    } else {
                      logger.warn(
                        "[OneSignal] Auto-subscribe timed out. Verify OneSignal Web Push Site URL matches origin:",
                        location.origin
                      );
                    }
                  })
                  .catch((err) => {
                    logger.warn("[OneSignal] Auto-subscribe error:", err);
                  });
              }
            } catch {}
          } catch (_) {}
        });
      } catch (e) {
        logger.warn("OneSignal init failed", e);
      }
    };

    setupOneSignal();
    return () => {
      cancelled = true;
    };
  }, [user?.id, profile?.role, profile?.user_type]);

  // Ensure the OneSignal User exists and has email subscription on server
  const ensureOneSignalUser = async (): Promise<boolean> => {
    try {
      if (!user?.id) return false;
      const tags: Record<string, string> = {};
      if (profile?.role) tags.role = String(profile.role);
      if (profile?.user_type) tags.user_type = String(profile.user_type);

      const { data, error } = await supabase.functions.invoke(
        "onesignal-upsert-user",
        {
          body: {
            user_id: user.id,
            email: user.email,
            tags,
          },
        }
      );

      if (error) {
        logger.warn("[OneSignal] User creation/update failed:", error);
        return false;
      }

      if (debug)
        logger.info("[OneSignal] User created/updated successfully:", data);
      return data?.success || false;
    } catch (err) {
      logger.warn("[OneSignal] ensureOneSignalUser error:", err);
      return false;
    }
  };

  // Verify subscription helper - both locally and server-side
  const verifySubscription = async (): Promise<{
    local: boolean;
    remote?: any;
    error?: string;
  }> => {
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
          const { data: remoteData } = await supabase.functions.invoke(
            "onesignal-verify-subscription",
            {
              body: { user_id: user.id },
            }
          );
          remoteVerification = remoteData;
        } catch (err) {
          logger.warn("[OneSignal] Remote verification failed:", err);
        }
      }

      return {
        local: localSubscribed,
        remote: remoteVerification,
        error:
          !localSubscribed && !remoteVerification?.subscribed
            ? "Not subscribed"
            : undefined,
      };
    } catch (err) {
      return { local: false, error: `Verification failed: ${err.message}` };
    }
  };

  // Ensure a OneSignal web push subscription exists; retries for up to maxWaitMs
  const ensureSubscription = async (
    maxWaitMs: number = 20000
  ): Promise<boolean> => {
    try {
      const os = (window as any).OneSignal;
      if (!os?.Notifications || !os?.User?.PushSubscription) {
        logger.warn("[OneSignal] SDK not ready for subscription.");
        return false;
      }

      const ps = os.User.PushSubscription;
      const already = !!(ps?.optedIn || ps?.id);
      if (already) {
        setHasSubscription(true);
        return true;
      }

      const start = Date.now();
      let attempt = 0;
      while (Date.now() - start < maxWaitMs) {
        attempt += 1;
        try {
          if (debug) logger.info(`[OneSignal] subscribe() attempt ${attempt}`);
          await withTimeout(
            os.Notifications.subscribe(),
            Math.min(10000, maxWaitMs)
          );
        } catch (e) {
          logger.warn(
            "[OneSignal] subscribe() attempt failed:",
            (e as any)?.message || e
          );
        }

        // Poll for subscription state for a short window between attempts
        const pollStart = Date.now();
        while (Date.now() - pollStart < 2000) {
          try {
            const id = os?.User?.PushSubscription?.id ?? null;
            const optedIn = !!os?.User?.PushSubscription?.optedIn;
            setHasSubscription(!!(id || optedIn));
            if (id || optedIn) {
              if (debug)
                logger.info("[OneSignal] Subscription confirmed:", {
                  id,
                  optedIn,
                });
              return true;
            }
          } catch {}
          await new Promise((r) => setTimeout(r, 200));
        }

        // Backoff between attempts
        const backoff = Math.min(2000 * attempt, 4000);
        await new Promise((r) => setTimeout(r, backoff));
      }

      logger.warn(
        "[OneSignal] ensureSubscription timeout after",
        maxWaitMs,
        "ms"
      );
      return false;
    } catch (err) {
      logger.warn("[OneSignal] ensureSubscription error:", err);
      return false;
    }
  };

  const requestPermission = async (): Promise<{
    success: boolean;
    error?: string;
    details?: any;
  }> => {
    try {
      if (isIframeBlocked) {
        const error =
          "Notifications permission cannot be requested within an iframe preview. Open in a new tab.";
        logger.warn(error);
        return { success: false, error };
      }

      if (debug) logger.info("[OneSignal] Starting permission request flow...");

      // STEP 1: FIRST ensure OneSignal user exists to prevent duplication
      const userCreated = await ensureOneSignalUser();
      if (!userCreated) {
        logger.warn(
          "[OneSignal] Failed to create OneSignal user. Continuing with subscription attempt..."
        );
        return {
          success: false,
          error: "Failed to create OneSignal user",
          details: { step: "user_creation" },
        };
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
      const currentPerm =
        typeof Notification !== "undefined"
          ? Notification.permission
          : "default";
      const ps = os?.User?.PushSubscription;
      const alreadySub = !!(ps?.optedIn || ps?.id);

      if (currentPerm === "granted" && alreadySub) {
        try {
          setHasSubscription(true);
          // Ensure user is logged in even if already subscribed
          if (user?.id) {
            await withTimeout(
              Promise.resolve(os?.login?.(user.id)),
              3000
            ).catch(() => {});
            if (debug)
              logger.info("[OneSignal] User already subscribed and logged in");
          }
        } catch {}
        return { success: true };
      }

      let subscribed = alreadySub;

      // STEP 2: Try OneSignal subscribe() which both prompts and subscribes
      if (!subscribed && os?.Notifications?.subscribe) {
        try {
          if (debug)
            logger.info("[OneSignal] Attempting OneSignal subscribe()...");
          await withTimeout(os.Notifications.subscribe(), 10000).catch(
            () => {}
          );
        } catch {}
        try {
          const sid = os?.User?.PushSubscription?.id ?? null;
          const opted = !!os?.User?.PushSubscription?.optedIn;
          setHasSubscription(!!(sid || opted));
          subscribed = !!(sid || opted);
          if (subscribed && debug)
            logger.info("[OneSignal] Subscribe successful:", {
              id: sid,
              optedIn: opted,
            });
        } catch {}
      }

      // STEP 3: Fallback to requestPermission() then ensureSubscription
      if (!subscribed && os?.Notifications?.requestPermission) {
        try {
          if (debug)
            logger.info("[OneSignal] Attempting requestPermission()...");
          await withTimeout(os.Notifications.requestPermission(), 8000).catch(
            () => {}
          );
        } catch {}
        subscribed = await ensureSubscription(12000);
      }

      // STEP 4: Final fallback: native Notification API
      if (
        !subscribed &&
        typeof Notification !== "undefined" &&
        Notification.permission === "default" &&
        Notification.requestPermission
      ) {
        try {
          if (debug)
            logger.info(
              "[OneSignal] Attempting native Notification.requestPermission()..."
            );
          const res = await withTimeout(
            Promise.resolve(Notification.requestPermission()),
            8000
          ).catch(() => "default");
          if (res === "granted") {
            subscribed = await ensureSubscription(12000);
          }
        } catch {}
      }

      // STEP 5: ALWAYS login user immediately after successful subscription
      if (subscribed && user?.id) {
        try {
          if (debug)
            logger.info(
              "[OneSignal] Logging in user and setting up identity..."
            );

          // Login FIRST - this is critical for proper user linking
          await withTimeout(Promise.resolve(os?.login?.(user.id)), 3000).catch(
            () => {}
          );

          // Then set up identity and tags in parallel
          const ops: Promise<any>[] = [];
          if (user?.email) {
            const osUser = os?.User;
            if (osUser?.addEmail)
              ops.push(
                withTimeout(osUser.addEmail(user.email), 3000).catch(() => {})
              );
            const emailTag = { email: user.email } as Record<string, string>;
            if (osUser?.addTags)
              ops.push(
                withTimeout(osUser.addTags(emailTag), 3000).catch(() => {})
              );
            else if (os?.sendTags)
              ops.push(
                withTimeout(os.sendTags(emailTag), 3000).catch(() => {})
              );
          }
          const tags: Record<string, string> = {};
          if (profile?.role) tags["role"] = String(profile.role);
          if (profile?.user_type) tags["user_type"] = String(profile.user_type);
          if (Object.keys(tags).length) {
            if (os?.User?.addTags)
              ops.push(
                withTimeout(os.User.addTags(tags), 3000).catch(() => {})
              );
            else if (os?.sendTags)
              ops.push(withTimeout(os.sendTags(tags), 3000).catch(() => {}));
          }
          await Promise.allSettled(ops);

          // Verify the subscription worked
          const verification = await verifySubscription();
          if (verification.local && debug) {
            logger.info(
              "[OneSignal] Complete setup successful - user subscribed and logged in",
              verification
            );
          } else if (!verification.local) {
            logger.warn(
              "[OneSignal] Subscription verification failed",
              verification
            );
          }
        } catch (err) {
          logger.warn(
            "[OneSignal] Error during user login/identity setup:",
            err
          );
        }
      }
      // STEP 5: Final verification
      const verification = await verifySubscription();
      const success = verification.local || verification.remote?.subscribed;

      if (debug)
        logger.info("[OneSignal] Permission request completed:", {
          subscribed,
          verification,
          success,
        });

      return {
        success,
        error: success
          ? undefined
          : verification.error || "Subscription verification failed",
        details: { verification, subscribed },
      };
    } catch (err) {
      logger.error("[OneSignal] requestPermission error:", err);
      return {
        success: false,
        error: `Permission request failed: ${err.message}`,
        details: { originalError: err },
      };
    } finally {
      try {
        if (typeof Notification !== "undefined")
          setPermission(Notification.permission);
      } catch {}
      try {
        const ps = (window as any).OneSignal?.User?.PushSubscription;
        const sid = ps?.id ?? null;
        setHasSubscription(!!(ps?.optedIn ?? sid));
        if (!sid && !ps?.optedIn) {
          logger.warn(
            "[OneSignal] No subscription detected after permission flow. Verify Web Push configuration for origin:",
            location.origin
          );
        }
      } catch {}
    }
  };

  return {
    initialized,
    requestPermission,
    permission,
    isGranted: permission === "granted" && hasSubscription,
    hasSubscription,
    isIframeBlocked,
  };
}
