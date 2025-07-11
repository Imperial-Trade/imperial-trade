
import { supabase } from '@/integrations/supabase/client';

interface ServerRateLimitCheck {
  identifier: string;
  limitType: 'ip' | 'email';
  maxAttempts: number;
  windowMs: number;
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
      console.log('Checking server-side rate limit:', params);
      
      const { data, error } = await supabase.functions.invoke(
        'account-request-rate-limit',
        {
          body: params,
        }
      );

      if (error) {
        console.error('Server rate limit check error:', error);
        // Fail open - allow request if server check fails
        return {
          allowed: true,
          attemptsRemaining: 1,
          resetTime: new Date(Date.now() + params.windowMs).toISOString(),
        };
      }

      return data as ServerRateLimitResult;
    } catch (error) {
      console.error('Rate limit service error:', error);
      // Fail open for better UX
      return {
        allowed: true,
        attemptsRemaining: 1,
        resetTime: new Date(Date.now() + params.windowMs).toISOString(),
      };
    }
  }

  async checkEmailRateLimit(email: string): Promise<ServerRateLimitResult> {
    return this.checkRateLimit({
      identifier: email.toLowerCase(),
      limitType: 'email',
      maxAttempts: 1, // 1 request per email per day
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
    });
  }

  async checkIPRateLimit(ip: string): Promise<ServerRateLimitResult> {
    return this.checkRateLimit({
      identifier: ip,
      limitType: 'ip',
      maxAttempts: 10, // 10 requests per IP per hour
      windowMs: 60 * 60 * 1000, // 1 hour
    });
  }

  // Get client IP (best effort)
  getClientIP(): string {
    try {
      // Try various methods to get client IP
      const headers = [
        'x-forwarded-for',
        'x-real-ip',
        'x-client-ip',
        'cf-connecting-ip',
      ];

      for (const header of headers) {
        const value = document.querySelector(`meta[name="${header}"]`)?.getAttribute('content');
        if (value) {
          return value.split(',')[0].trim();
        }
      }

      // Fallback to a generic identifier
      return 'unknown-client';
    } catch {
      return 'unknown-client';
    }
  }
}

export const serverRateLimitService = ServerRateLimitService.getInstance();
