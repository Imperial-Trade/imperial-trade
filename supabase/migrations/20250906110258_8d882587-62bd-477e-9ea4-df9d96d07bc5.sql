-- Continue fixing remaining critical function search_path security issues
CREATE OR REPLACE FUNCTION public.check_account_request_rate_limit(p_email text, p_ip_address text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  email_limit_window INTERVAL := '24 hours';
  email_max_attempts INTEGER := 5; -- Increased from 3 to 5
  ip_limit_window INTERVAL := '1 hour';
  ip_max_attempts INTEGER := 10;
  email_attempts INTEGER := 0;
  ip_attempts INTEGER := 0;
  result JSONB;
BEGIN
  -- Check email-based rate limiting
  SELECT COALESCE(attempt_count, 0) INTO email_attempts
  FROM public.rate_limits
  WHERE identifier = p_email 
    AND limit_type = 'email'
    AND window_start > now() - email_limit_window;

  -- Check IP-based rate limiting if IP provided
  IF p_ip_address IS NOT NULL THEN
    SELECT COALESCE(attempt_count, 0) INTO ip_attempts
    FROM public.rate_limits
    WHERE identifier = p_ip_address 
      AND limit_type = 'ip'
      AND window_start > now() - ip_limit_window;
  END IF;

  -- Check if limits exceeded
  IF email_attempts >= email_max_attempts THEN
    result := jsonb_build_object(
      'allowed', false,
      'reason', 'email_rate_limit',
      'retry_after', extract(epoch from (
        (SELECT window_start FROM public.rate_limits 
         WHERE identifier = p_email AND limit_type = 'email' 
         ORDER BY window_start DESC LIMIT 1) + email_limit_window - now()
      )),
      'attempts_used', email_attempts,
      'max_attempts', email_max_attempts
    );
    RETURN result;
  END IF;

  IF p_ip_address IS NOT NULL AND ip_attempts >= ip_max_attempts THEN
    result := jsonb_build_object(
      'allowed', false,
      'reason', 'ip_rate_limit',
      'retry_after', extract(epoch from (
        (SELECT window_start FROM public.rate_limits 
         WHERE identifier = p_ip_address AND limit_type = 'ip' 
         ORDER BY window_start DESC LIMIT 1) + ip_limit_window - now()
      )),
      'attempts_used', ip_attempts,
      'max_attempts', ip_max_attempts
    );
    RETURN result;
  END IF;

  result := jsonb_build_object(
    'allowed', true, 
    'email_attempts_remaining', email_max_attempts - email_attempts,
    'ip_attempts_remaining', CASE WHEN p_ip_address IS NOT NULL THEN ip_max_attempts - ip_attempts ELSE NULL END
  );
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.should_user_receive_notification(
  p_user_id uuid, 
  p_creator_id uuid, 
  p_notification_type text, 
  p_priority_level integer DEFAULT 1
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Basic notification eligibility check
  RETURN (
    p_user_id != p_creator_id AND -- Don't notify creator
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = p_user_id 
      AND account_status = 'active'
      AND push_subscription_active = true
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_community_tier_info(tier_level integer)
RETURNS json
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  RETURN CASE tier_level
    WHEN 0 THEN '{"name": "Insider", "icon": "📱", "description": "Building your presence", "color": "gray"}'::json
    WHEN 1 THEN '{"name": "Rising Star", "icon": "⭐", "description": "Consistency earns recognition", "color": "blue"}'::json
    WHEN 2 THEN '{"name": "All-Star", "icon": "👑", "description": "Verified elite trader", "color": "gold"}'::json
    ELSE '{"name": "Insider", "icon": "📱", "description": "Building your presence", "color": "gray"}'::json
  END;
END;
$function$;

-- Setup automated scheduling for our optimization functions
-- Schedule stale market data cleanup every hour
SELECT cron.schedule(
  'cleanup-stale-market-data',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT public.cleanup_stale_market_prices();
  $$
);

-- Schedule general database cleanup every 6 hours
SELECT cron.schedule(
  'cleanup-old-logs-and-limits',
  '0 */6 * * *', -- Every 6 hours
  $$
  SELECT public.cleanup_old_cron_logs_optimized();
  SELECT public.cleanup_old_rate_limits_optimized();
  $$
);

-- Schedule data freshness monitoring report every 30 minutes
SELECT cron.schedule(
  'data-freshness-monitoring',
  '*/30 * * * *', -- Every 30 minutes
  $$
  SELECT 
    net.http_post(
      url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/enhanced-websocket-streaming/performance',
      headers := '{"Content-Type": "application/json"}'::jsonb
    ) as performance_check;
  $$
);