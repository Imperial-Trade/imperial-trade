
-- Step 1: Add the critical email unique constraint to enforce "one email, one request"
ALTER TABLE public.account_requests ADD CONSTRAINT account_requests_email_unique UNIQUE (email);

-- Step 2: Add server-side rate limiting function for account requests
CREATE OR REPLACE FUNCTION public.check_account_request_rate_limit(
  p_email TEXT,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  email_limit_window INTERVAL := '24 hours';
  email_max_attempts INTEGER := 3;
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
      ))
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
      ))
    );
    RETURN result;
  END IF;

  -- Update or insert rate limit records
  INSERT INTO public.rate_limits (identifier, limit_type, attempt_count, window_start, last_attempt)
  VALUES (p_email, 'email', 1, now(), now())
  ON CONFLICT (identifier, limit_type) 
  DO UPDATE SET 
    attempt_count = CASE 
      WHEN rate_limits.window_start < now() - email_limit_window THEN 1
      ELSE rate_limits.attempt_count + 1
    END,
    window_start = CASE 
      WHEN rate_limits.window_start < now() - email_limit_window THEN now()
      ELSE rate_limits.window_start
    END,
    last_attempt = now();

  IF p_ip_address IS NOT NULL THEN
    INSERT INTO public.rate_limits (identifier, limit_type, attempt_count, window_start, last_attempt)
    VALUES (p_ip_address, 'ip', 1, now(), now())
    ON CONFLICT (identifier, limit_type) 
    DO UPDATE SET 
      attempt_count = CASE 
        WHEN rate_limits.window_start < now() - ip_limit_window THEN 1
        ELSE rate_limits.attempt_count + 1
      END,
      window_start = CASE 
        WHEN rate_limits.window_start < now() - ip_limit_window THEN now()
        ELSE rate_limits.window_start
      END,
      last_attempt = now();
  END IF;

  result := jsonb_build_object('allowed', true);
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
