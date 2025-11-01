
import { supabase } from '@/integrations/supabase/client';
import { RequestConfig } from '../types';
import { withTimeout } from '../utils/timeout';
import { withRetry } from '../utils/retry';

export class AuthOperations {
  private defaultTimeout = 10000;

  async getCurrentUser(config: RequestConfig = {}) {
    try {
      return await withRetry(async () => {
        const authPromise = supabase.auth.getUser();
        const response = await withTimeout(
          authPromise,
          config.timeout || this.defaultTimeout,
          config.abortSignal
        ) as { data: { user: any }; error: any };
        
        if (response.error) {
          throw new Error(response.error.message);
        }

        return {
          success: true,
          data: response.data.user,
          error: undefined
        };
      }, {
        maxAttempts: config.retries || 3
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: undefined
      };
    }
  }
}
