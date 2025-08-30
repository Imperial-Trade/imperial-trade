
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RateLimitCheck {
  identifier: string;
  limitType: 'ip' | 'email';
  maxAttempts: number;
  windowMs: number;
  consume?: boolean; // If true, increment attempt count; if false, just check
}

interface RateLimitResult {
  allowed: boolean;
  attemptsRemaining: number;
  resetTime: string;
  blockedUntil?: string;
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

    const { identifier, limitType, maxAttempts, windowMs, consume = false }: RateLimitCheck = await req.json();
    
    // Use server-side limits instead of client-provided values for security
    const serverLimits = {
      email: { maxAttempts: 1, windowMs: 24 * 60 * 60 * 1000 }, // 1/day
      ip: { maxAttempts: 10, windowMs: 60 * 60 * 1000 } // 10/hour
    };
    
    const actualLimits = serverLimits[limitType] || { maxAttempts, windowMs };
    
    console.log(`Rate limit ${consume ? 'consume' : 'check'} for ${limitType}: ${identifier}`);
    
    const now = new Date();
    const windowStart = new Date(now.getTime() - actualLimits.windowMs);

    // Get existing rate limit record
    const { data: existingRecord, error: fetchError } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', identifier)
      .eq('limit_type', limitType)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    let result: RateLimitResult;

    if (!existingRecord) {
      if (consume) {
        // First attempt - create new record
        const { error: insertError } = await supabase
          .from('rate_limits')
          .insert({
            identifier,
            limit_type: limitType,
            attempt_count: 1,
            window_start: now.toISOString(),
            last_attempt: now.toISOString(),
          });

        if (insertError) throw insertError;
      }

      result = {
        allowed: true,
        attemptsRemaining: actualLimits.maxAttempts - (consume ? 1 : 0),
        resetTime: new Date(now.getTime() + actualLimits.windowMs).toISOString(),
      };
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

          if (updateError) throw updateError;
        }

        result = {
          allowed: true,
          attemptsRemaining: actualLimits.maxAttempts - (consume ? 1 : 0),
          resetTime: new Date(now.getTime() + actualLimits.windowMs).toISOString(),
        };
      }
      // Within window - check if limit exceeded
      else if (existingRecord.attempt_count >= actualLimits.maxAttempts) {
        const resetTime = new Date(recordWindowStart.getTime() + actualLimits.windowMs);
        
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
        const shouldBlock = newCount >= actualLimits.maxAttempts;
        const blockUntil = shouldBlock ? new Date(now.getTime() + actualLimits.windowMs) : null;

        if (consume) {
          const { error: updateError } = await supabase
            .from('rate_limits')
            .update({
              attempt_count: newCount,
              last_attempt: now.toISOString(),
              blocked_until: blockUntil?.toISOString() || null,
            })
            .eq('id', existingRecord.id);

          if (updateError) throw updateError;
        }

        result = {
          allowed: !shouldBlock,
          attemptsRemaining: Math.max(0, actualLimits.maxAttempts - newCount),
          resetTime: new Date(recordWindowStart.getTime() + actualLimits.windowMs).toISOString(),
          blockedUntil: blockUntil?.toISOString(),
        };
      }
    }

    console.log(`Rate limit result:`, result);

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
