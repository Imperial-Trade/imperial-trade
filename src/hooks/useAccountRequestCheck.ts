import { useState, useCallback } from "react";
import {
  AccountRequest,
  AccountRequestData,
} from "@/api/entities/AccountRequest";

interface UseAccountRequestCheckReturn {
  existingRequest: AccountRequestData | null;
  isChecking: boolean;
  error: string | null;
  checkForExistingRequest: (
    email: string
  ) => Promise<AccountRequestData | null>;
  clearCheck: () => void;
}

export const useAccountRequestCheck = (): UseAccountRequestCheckReturn => {
  const [existingRequest, setExistingRequest] =
    useState<AccountRequestData | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkForExistingRequest = useCallback(
    async (email: string): Promise<AccountRequestData | null> => {
      if (!email.trim()) return null;

      setIsChecking(true);
      setError(null);

      try {
        const request = await AccountRequest.getByEmail(
          email.toLowerCase().trim()
        );
        setExistingRequest(request);
        return request;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to check existing request";
        setError(errorMessage);
        logger.error("Error checking for existing request:", err);
        return null;
      } finally {
        setIsChecking(false);
      }
    },
    []
  );

  const clearCheck = useCallback(() => {
    setExistingRequest(null);
    setError(null);
  }, []);

  return {
    existingRequest,
    isChecking,
    error,
    checkForExistingRequest,
    clearCheck,
  };
};
