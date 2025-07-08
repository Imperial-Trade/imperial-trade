
import { useCallback, useState } from 'react';

export const useErrorBoundary = () => {
  const [error, setError] = useState<Error | null>(null);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const captureError = useCallback((error: Error) => {
    setError(error);
    // Re-throw the error to trigger the error boundary
    throw error;
  }, []);

  return {
    error,
    resetError,
    captureError,
  };
};
