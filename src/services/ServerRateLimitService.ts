
import { supabase } from '@/integrations/supabase/client';

interface ServerRateLimitCheck {
  identifier: string;
  limitType: 'ip' | 'email';
  consume?: boolean;
}

interface ServerRateLimitResult {
  allowed: boolean;
  attemptsRemaining: number;
  resetTime: string;
  blockedUntil?: string;
}

class ServerRateLimitService {
  private static instance: ServerRateLimitService;

  static getInstance(): ServerRateLimitService {
    if (!ServerRateLimitService.instance) {
      ServerRateLimitService.instance = new ServerRateLimitService();
    }
    return ServerRateLimitService.instance;
  }

  async checkRateLimit(params: ServerRateLimitCheck): Promise<ServerRateLimitResult> {
    try {
      console.log(`${params.consume ? 'Consuming' : 'Checking'} server-side rate limit:`, {
        limitType: params.limitType,
        consume: params.consume
      });
      
      const { data, error } = await supabase.functions.invoke(
        'account-request-rate-limit',
        {
          body: {
            identifier: params.identifier,
            limitType: params.limitType,
            consume: params.consume || false,
            // Note: maxAttempts and windowMs are now server-controlled
            maxAttempts: 0, // Ignored by edge function
            windowMs: 0     // Ignored by edge function
          },
        }
      );

      if (error) {
        console.error('Server rate limit check error:', error);
        // Fail open - allow request if server check fails
        return {
          allowed: true,
          attemptsRemaining: 1,
          resetTime: new Date(Date.now() + 3600000).toISOString(),
        };
      }

      return data as ServerRateLimitResult;
    } catch (error) {
      console.error('Rate limit service error:', error);
      // Fail open for better UX
      return {
        allowed: true,
        attemptsRemaining: 1,
        resetTime: new Date(Date.now() + 3600000).toISOString(),
      };
    }
  }

  async checkEmailRateLimit(email: string, consume: boolean = false): Promise<ServerRateLimitResult> {
    return this.checkRateLimit({
      identifier: email.toLowerCase(),
      limitType: 'email',
      consume,
    });
  }

  async checkIPRateLimit(consume: boolean = false): Promise<ServerRateLimitResult> {
    // IP detection now handled server-side in the edge function
    return this.checkRateLimit({
      identifier: 'auto-detected', // Placeholder - real IP extracted server-side
      limitType: 'ip',
      consume,
    });
  }

  // Deprecated - IP detection now handled server-side
  getClientIP(): string {
    return 'auto-detected';
  }
}

export const serverRateLimitService = ServerRateLimitService.getInstance();
