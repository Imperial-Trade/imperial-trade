
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RateLimitCheck {
  identifier: string;
  limitType: 'ip' | 'email';
  maxAttempts: number; // Client-provided but ignored (server-side parameters used)
  windowMs: number;    // Client-provided but ignored (server-side parameters used)
  consume?: boolean;   // If true, increment attempt count; if false, just check
}

interface RateLimitResult {
  allowed: boolean;
  attemptsRemaining: number;
  resetTime: string;
  blockedUntil?: string;
}

interface RateLimitSettings {
  email_max_attempts: number;
  email_window_seconds: number;
  ip_max_attempts: number;
  ip_window_seconds: number;
  allowlist_cidrs: string[];
}

// Real IP detection with fallback chain and logging
function extractRealIP(req: Request): { ip: string; source: string } {
  // 1. Cloudflare CF-Connecting-IP (highest priority)
  const cfConnectingIP = req.headers.get('CF-Connecting-IP');
  if (cfConnectingIP && isValidIP(cfConnectingIP)) {
    return { ip: cfConnectingIP, source: 'cf-connecting-ip' };
  }

  // 2. X-Forwarded-For (take first IP, strip port if present)
  const xForwardedFor = req.headers.get('X-Forwarded-For');
  if (xForwardedFor) {
    const firstIP = xForwardedFor.split(',')[0].trim().split(':')[0]; // Remove port
    if (isValidIP(firstIP)) {
      return { ip: firstIP, source: 'x-forwarded-for' };
    }
  }

  // 3. Session-based fallback (deterministic but unique per hour)
  const userAgent = req.headers.get('User-Agent') || 'unknown';
  const timestamp = Date.now();
  const hourWindow = Math.floor(timestamp / (1000 * 60 * 60)); // 1-hour windows
  const sessionId = btoa(`${userAgent}-${hourWindow}`).substring(0, 16);
  return { ip: `session-${sessionId}`, source: 'session-fallback' };
}

function isValidIP(ip: string): boolean {
  // Basic IP validation (IPv4 and IPv6)
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

function hashIdentifier(identifier: string): string {
  // Simple hash for logging (no crypto needed, just obfuscation)
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    const char = identifier.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36).substring(0, 8);
}

function isIPAllowlisted(ip: string, allowlistCidrs: string[]): boolean {
  // Simple exact match for now (CIDR matching can be added later)
  return allowlistCidrs.includes(ip);
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { identifier, limitType, consume = false }: RateLimitCheck = await req.json();
    
    // Extract real IP with fallback chain
    const { ip: realIP, source: ipSource } = extractRealIP(req);
    const effectiveIdentifier = limitType === 'ip' ? realIP : identifier;
    
    // Fetch server-side rate limit settings
    const { data: settings, error: settingsError } = await supabase
      .from('rate_limit_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (settingsError || !settings) {
      console.error('Failed to fetch rate limit settings:', settingsError);
      // Fallback to hardcoded values
      var rateLimitSettings: RateLimitSettings = {
        email_max_attempts: 1,
        email_window_seconds: 86400,
        ip_max_attempts: 10,
        ip_window_seconds: 3600,
        allowlist_cidrs: []
      };
    } else {
      var rateLimitSettings = settings as RateLimitSettings;
    }

    // Check if IP is allowlisted (bypass rate limiting)
    if (limitType === 'ip' && isIPAllowlisted(realIP, rateLimitSettings.allowlist_cidrs)) {
      console.log(`🟢 Rate limit bypassed for allowlisted IP: ${realIP}`);
      return new Response(JSON.stringify({
        allowed: true,
        attemptsRemaining: 999,
        resetTime: new Date(Date.now() + 3600000).toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Use server-side parameters
    const maxAttempts = limitType === 'email' 
      ? rateLimitSettings.email_max_attempts 
      : rateLimitSettings.ip_max_attempts;
    const windowMs = (limitType === 'email' 
      ? rateLimitSettings.email_window_seconds 
      : rateLimitSettings.ip_window_seconds) * 1000;
    
    const identifierHash = hashIdentifier(effectiveIdentifier);
    console.log(`${consume ? 'Consuming' : 'Checking'} rate limit - Type: ${limitType}, Hash: ${identifierHash}, IP Source: ${ipSource}`);
    
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    // Get existing rate limit record (using UNIQUE constraint)
    const { data: existingRecord, error: fetchError } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', effectiveIdentifier)
      .eq('limit_type', limitType)
      .maybeSingle(); // Use maybeSingle to handle no results gracefully

    if (fetchError) {
      console.error('Database fetch error:', fetchError);
      throw fetchError;
    }

    let result: RateLimitResult;

    if (!existingRecord) {
      // First attempt - create new record if consuming
      if (consume) {
        const { error: insertError } = await supabase
          .from('rate_limits')
          .insert({
            identifier: effectiveIdentifier,
            limit_type: limitType,
            attempt_count: 1,
            window_start: now.toISOString(),
            last_attempt: now.toISOString(),
          });

        if (insertError) {
          console.error('Database insert error:', insertError);
          throw insertError;
        }
      }

      result = {
        allowed: true,
        attemptsRemaining: maxAttempts - (consume ? 1 : 0),
        resetTime: new Date(now.getTime() + windowMs).toISOString(),
      };

      // Log rate limit event (no PII)
      console.log(`🟢 Rate limit event - Hash: ${identifierHash}, Type: ${limitType}, Allowed: true, Remaining: ${result.attemptsRemaining}, Reset: ${result.resetTime}, IP Source: ${ipSource}`);

    } else {
      const recordWindowStart = new Date(existingRecord.window_start);
      const blockedUntil = existingRecord.blocked_until ? new Date(existingRecord.blocked_until) : null;

      // Check if currently blocked
      if (blockedUntil && now < blockedUntil) {
        result = {
          allowed: false,
          attemptsRemaining: 0,
          resetTime: blockedUntil.toISOString(),
          blockedUntil: blockedUntil.toISOString(),
        };
      }
      // Check if window has expired - reset counter
      else if (recordWindowStart < windowStart) {
        if (consume) {
          const { error: updateError } = await supabase
            .from('rate_limits')
            .update({
              attempt_count: 1,
              window_start: now.toISOString(),
              last_attempt: now.toISOString(),
              blocked_until: null,
            })
            .eq('id', existingRecord.id);

          if (updateError) {
            console.error('Database update error:', updateError);
            throw updateError;
          }
        }

        result = {
          allowed: true,
          attemptsRemaining: maxAttempts - (consume ? 1 : 0),
          resetTime: new Date(now.getTime() + windowMs).toISOString(),
        };
      }
      // Within window - check if limit exceeded
      else if (existingRecord.attempt_count >= maxAttempts) {
        const resetTime = new Date(recordWindowStart.getTime() + windowMs);
        
        result = {
          allowed: false,
          attemptsRemaining: 0,
          resetTime: resetTime.toISOString(),
        };
      }
      // Within window and under limit
      else {
        const currentCount = existingRecord.attempt_count;
        const newCount = consume ? currentCount + 1 : currentCount;
        const shouldBlock = newCount >= maxAttempts;
        const blockUntil = shouldBlock ? new Date(now.getTime() + windowMs) : null;

        if (consume) {
          const { error: updateError } = await supabase
            .from('rate_limits')
            .update({
              attempt_count: newCount,
              last_attempt: now.toISOString(),
              blocked_until: blockUntil?.toISOString() || null,
            })
            .eq('id', existingRecord.id);

          if (updateError) {
            console.error('Database update error:', updateError);
            throw updateError;
          }
        }

        result = {
          allowed: !shouldBlock,
          attemptsRemaining: Math.max(0, maxAttempts - newCount),
          resetTime: new Date(recordWindowStart.getTime() + windowMs).toISOString(),
          blockedUntil: blockUntil?.toISOString(),
        };
      }

      // Log rate limit event (no PII)
      const logEmoji = result.allowed ? '🟢' : '🔴';
      console.log(`${logEmoji} Rate limit event - Hash: ${identifierHash}, Type: ${limitType}, Allowed: ${result.allowed}, Remaining: ${result.attemptsRemaining}, Reset: ${result.resetTime}, IP Source: ${ipSource}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Rate limit check error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Rate limit check failed',
        allowed: true, // Fail open for better UX
        attemptsRemaining: 1,
        resetTime: new Date(Date.now() + 3600000).toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
