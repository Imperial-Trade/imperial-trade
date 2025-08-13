
import { RetryConfig } from '../types';

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function isNonRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('invalid') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('not found') ||
    message.includes('bad request')
  );
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig>
): Promise<T> {
  const defaultConfig: RetryConfig = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2
  };
  
  const retryConfig = { ...defaultConfig, ...config };
  let lastError: Error;

  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === retryConfig.maxAttempts) {
        throw lastError;
      }

      if (isNonRetryableError(lastError)) {
        throw lastError;
      }

      const delayMs = Math.min(
        retryConfig.initialDelay * Math.pow(retryConfig.backoffFactor, attempt - 1),
        retryConfig.maxDelay
      );

      console.log(`Attempt ${attempt} failed, retrying in ${delayMs}ms:`, lastError.message);
      await delay(delayMs);
    }
  }

  throw lastError!;
}
