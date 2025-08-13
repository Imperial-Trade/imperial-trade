import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AccountStatusData {
  id: string;
  email: string;
  status: string;
  full_name: string;
  account_type: string;
  created_at: string;
  rejection_reason?: string;
}

interface StatusError {
  type: "not_found" | "network_error" | "system_error";
  message: string;
}

interface UseAccountStatusProps {
  email?: string;
}

// Simple cache to prevent duplicate requests
const statusCache = new Map<
  string,
  { data: AccountStatusData | null; timestamp: number; error?: StatusError }
>();
const CACHE_DURATION = 30 * 1000; // 30 seconds

export const useAccountStatus = ({ email }: UseAccountStatusProps = {}) => {
  const [status, setStatus] = useState<AccountStatusData | null>(null);
  const [error, setError] = useState<StatusError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const lastCheckedEmailRef = useRef<string>("");
  const isCheckingRef = useRef(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const checkStatus = useCallback(async (emailToCheck: string) => {
    // Prevent duplicate requests
    if (isCheckingRef.current && lastCheckedEmailRef.current === emailToCheck) {
      logger.log("Skipping duplicate request for:", emailToCheck);
      return;
    }

    const normalizedEmail = emailToCheck.toLowerCase().trim();

    // Check cache first
    const cached = statusCache.get(normalizedEmail);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      logger.log("Using cached result for:", normalizedEmail);
      if (cached.error) {
        setError(cached.error);
        setStatus(null);
      } else {
        setStatus(cached.data);
        setError(null);
      }
      return;
    }

    try {
      isCheckingRef.current = true;
      lastCheckedEmailRef.current = normalizedEmail;
      setIsLoading(true);
      setError(null);

      logger.log("Checking account status for:", normalizedEmail);

      const { data, error: fnError } = await supabase.functions.invoke(
        "check-account-request-status",
        {
          body: { email: normalizedEmail },
        }
      );

      if (fnError) {
        logger.error("Edge function error:", fnError);
        const errorObj = {
          type: "system_error" as const,
          message: "Unable to check account status. Please try again.",
        };
        setError(errorObj);
        setStatus(null);
        statusCache.set(normalizedEmail, {
          data: null,
          timestamp: Date.now(),
          error: errorObj,
        });
        return;
      }

      const result = (data as any)?.request ?? null;
      if (!result) {
        const errorObj = {
          type: "not_found" as const,
          message: "No account request found for this email address.",
        };
        setError(errorObj);
        setStatus(null);
        statusCache.set(normalizedEmail, {
          data: null,
          timestamp: Date.now(),
          error: errorObj,
        });
      } else {
        setStatus(result as AccountStatusData);
        setError(null);
        statusCache.set(normalizedEmail, {
          data: result as AccountStatusData,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      logger.error("Network error:", error);
      const errorObj = {
        type: "network_error" as const,
        message:
          "Connection failed. Please check your internet connection and try again.",
      };
      setError(errorObj);
      setStatus(null);

      // Cache the network error
      statusCache.set(normalizedEmail, {
        data: null,
        timestamp: Date.now(),
        error: errorObj,
      });
    } finally {
      setIsLoading(false);
      // Clear the checking flag after a short delay
      setTimeout(() => {
        isCheckingRef.current = false;
      }, 1000);
    }
  }, []);

  const retryCheck = useCallback(() => {
    if (lastCheckedEmailRef.current) {
      // Clear cache for this email to force a fresh request
      statusCache.delete(lastCheckedEmailRef.current);
      checkStatus(lastCheckedEmailRef.current);
    }
  }, [checkStatus]);

  const resetState = useCallback(() => {
    logger.log("Resetting account status state");
    setStatus(null);
    setError(null);
    setIsLoading(false);
    lastCheckedEmailRef.current = "";
    isCheckingRef.current = false;
  }, []);

  return {
    status,
    error,
    isLoading,
    checkStatus,
    retryCheck,
    clearError,
    resetState,
  };
};
