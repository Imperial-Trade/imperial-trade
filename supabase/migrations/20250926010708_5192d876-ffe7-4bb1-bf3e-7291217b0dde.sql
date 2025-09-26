-- Add cleanup function for phantom notifications
CREATE OR REPLACE FUNCTION public.cleanup_phantom_notifications()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER := 0;
  phantom_count INTEGER := 0;
BEGIN
  -- Clean phantom notification logs (successful logs with empty or invalid change types)
  DELETE FROM public.cron_job_logs 
  WHERE job_name = 'enhanced_notification_pipeline' 
    AND status = 'success' 
    AND (
      error_message LIKE '%Changes: ,%' OR 
      error_message LIKE '%Changes: notes_updated%' OR
      error_message LIKE '%Change types: none%' OR
      error_message LIKE '%No significant changes%'
    )
    AND created_at < now() - interval '10 minutes';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Clean old false positive reports (older than 7 days)
  DELETE FROM public.notification_audit_false_positives 
  WHERE false_positive_detected_at < now() - interval '7 days';
  
  GET DIAGNOSTICS phantom_count = ROW_COUNT;
  
  -- Log cleanup results
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES (
    'notification_cleanup', 
    NOW(), 
    deleted_count + phantom_count, 
    'success',
    'Cleanup completed - Phantom logs removed: ' || deleted_count::text || 
    ' - False positives cleaned: ' || phantom_count::text
  );
  
  RETURN deleted_count + phantom_count;
END;
$function$;

-- Add notification rate limiting function
CREATE OR REPLACE FUNCTION public.check_notification_rate_limit(
  p_signal_id UUID, 
  p_max_per_minute INTEGER DEFAULT 3
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  recent_count INTEGER;
BEGIN
  -- Count recent successful notifications for this signal
  SELECT COUNT(*) INTO recent_count
  FROM public.cron_job_logs
  WHERE job_name = 'enhanced_notification_pipeline'
    AND status = 'success'
    AND error_message LIKE '%Signal ID: ' || p_signal_id::text || '%'
    AND created_at > now() - interval '1 minute';
  
  -- Return true if under rate limit, false if over limit
  RETURN recent_count < p_max_per_minute;
END;
$function$;

-- Add notification health monitoring function
CREATE OR REPLACE FUNCTION public.get_notification_health_metrics(p_hours INTEGER DEFAULT 24)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
  total_sent INTEGER;
  successful_sent INTEGER;
  failed_sent INTEGER;
  false_positive_count INTEGER;
  success_rate NUMERIC;
  false_positive_rate NUMERIC;
  last_error_message TEXT;
BEGIN
  -- Calculate metrics for the specified time period
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'success') as successful,
    COUNT(*) FILTER (WHERE status IN ('error', 'critical_error')) as failed
  INTO total_sent, successful_sent, failed_sent
  FROM public.cron_job_logs
  WHERE job_name = 'enhanced_notification_pipeline'
    AND created_at > now() - (p_hours || ' hours')::interval;
  
  -- Get false positive count
  SELECT COUNT(*) INTO false_positive_count
  FROM public.notification_audit_false_positives
  WHERE false_positive_detected_at > now() - (p_hours || ' hours')::interval;
  
  -- Calculate rates
  success_rate := CASE 
    WHEN total_sent > 0 THEN (successful_sent::NUMERIC / total_sent::NUMERIC) * 100 
    ELSE 100 
  END;
  
  false_positive_rate := CASE 
    WHEN successful_sent > 0 THEN (false_positive_count::NUMERIC / successful_sent::NUMERIC) * 100 
    ELSE 0 
  END;
  
  -- Get last error message
  SELECT error_message INTO last_error_message
  FROM public.cron_job_logs
  WHERE job_name = 'enhanced_notification_pipeline'
    AND status IN ('error', 'critical_error')
    AND created_at > now() - (p_hours || ' hours')::interval
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Build result JSON
  result := jsonb_build_object(
    'period_hours', p_hours,
    'total_notifications', total_sent,
    'successful_notifications', successful_sent,
    'failed_notifications', failed_sent,
    'false_positives', false_positive_count,
    'success_rate', ROUND(success_rate, 2),
    'false_positive_rate', ROUND(false_positive_rate, 2),
    'health_status', CASE 
      WHEN success_rate >= 98 AND false_positive_rate <= 2 THEN 'healthy'
      WHEN success_rate >= 90 AND false_positive_rate <= 5 THEN 'warning'
      ELSE 'critical'
    END,
    'last_error', last_error_message,
    'calculated_at', now()
  );
  
  RETURN result;
END;
$function$;