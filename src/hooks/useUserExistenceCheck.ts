import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { testUserExistenceFunction } from "@/utils/testUserExistence";

interface UseUserExistenceCheckReturn {
  checkUserExists: (email: string) => Promise<boolean>;
  isChecking: boolean;
  error: string | null;
  clearError: () => void;
}

interface UseUserExistenceCheckOptions {
  accountRequest?: any;
}

export const useUserExistenceCheck = (
  options: UseUserExistenceCheckOptions = {}
): UseUserExistenceCheckReturn => {
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const checkUserExists = useCallback(
    async (email: string): Promise<boolean> => {
      setIsChecking(true);
      setError(null);

      try {
        logger.log("=== STARTING USER EXISTENCE CHECK ===");
        logger.log("Email:", email);
        logger.log("Account request status:", options.accountRequest?.status);
        logger.log("Supabase client ready:", !!supabase);
        logger.log("Functions available:", !!supabase.functions);

        logger.log("Calling edge function check-user-existence...");
        const startTime = Date.now();

        // First run diagnostic test
        logger.log("Running diagnostic test...");
        await testUserExistenceFunction(email.toLowerCase().trim());

        const { data, error } = await supabase.functions.invoke(
          "check-user-existence",
          {
            body: { email: email.toLowerCase().trim() },
          }
        );

        const endTime = Date.now();
        logger.log(
          "Edge function call completed in:",
          endTime - startTime,
          "ms"
        );
        logger.log("Raw response data:", data);
        logger.log("Raw response error:", error);

        if (error) {
          logger.error("=== EDGE FUNCTION ERROR ===");
          logger.error("Error object:", error);
          logger.error("Error message:", error.message);
          logger.error("Error details:", error.details);
          logger.error("Error hint:", error.hint);
          logger.error("Error code:", error.code);

          // NO FALLBACK - Surface the real error
          setError(`Edge function failed: ${error.message || "Unknown error"}`);
          return false;
        }

        logger.log("=== EDGE FUNCTION SUCCESS ===");
        logger.log("Data received:", data);
        logger.log("User exists value:", data?.userExists);

        const userExists = data?.userExists || false;
        logger.log("Final result - User exists:", userExists);
        logger.log("=== USER EXISTENCE CHECK COMPLETE ===");

        return userExists;
      } catch (error) {
        logger.error("=== NETWORK/UNEXPECTED ERROR ===");
        logger.error("Error type:", typeof error);
        logger.error("Error constructor:", error?.constructor?.name);
        logger.error(
          "Error message:",
          error instanceof Error ? error.message : String(error)
        );
        logger.error(
          "Error stack:",
          error instanceof Error ? error.stack : "No stack trace"
        );

        // NO FALLBACK - Surface the real error
        setError(
          `Network error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        return false;
      } finally {
        setIsChecking(false);
      }
    },
    [options.accountRequest]
  );

  return {
    checkUserExists,
    isChecking,
    error,
    clearError,
  };
};
