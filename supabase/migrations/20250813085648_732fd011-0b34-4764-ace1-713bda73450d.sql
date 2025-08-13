-- Update account request rate limit function to allow 5 attempts per day
CREATE OR REPLACE FUNCTION public.check_account_request_rate_limit(p_email text, p_ip_address text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$