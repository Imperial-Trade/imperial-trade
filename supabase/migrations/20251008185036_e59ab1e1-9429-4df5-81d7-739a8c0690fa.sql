-- ============================================
-- PHASE 2 (REVISED): CRITICAL SECURITY FIX (BUG #23)
-- Add SET search_path = 'public' to 13 database functions
-- This prevents potential schema injection attacks
-- ============================================

-- Function 1: cleanup_webhook_debounce
CREATE OR REPLACE FUNCTION public.cleanup_webhook_debounce()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
    DELETE FROM public.webhook_debounce 
    WHERE last_triggered_at < now() - interval '2 minutes';
END;
$function$;

-- Function 2: cleanup_old_rate_limits
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  DELETE FROM public.rate_limits 
  WHERE limit_type = 'email' 
    AND window_start < now() - interval '24 hours';
  
  DELETE FROM public.rate_limits 
  WHERE limit_type = 'ip' 
    AND window_start < now() - interval '1 hour';
END;
$function$;

-- Function 3: cleanup_old_ui_listeners
CREATE OR REPLACE FUNCTION public.cleanup_old_ui_listeners()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.ui_price_listeners 
  WHERE last_seen_at < now() - interval '5 minutes';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

-- Function 4: cleanup_notification_cache
CREATE OR REPLACE FUNCTION public.cleanup_notification_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    deleted_count integer := 0;
BEGIN
    DELETE FROM notification_request_cache WHERE expires_at < now();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    DELETE FROM notification_circuit_breaker 
    WHERE last_notification_at < now() - interval '24 hours';
    
    DELETE FROM cron_job_logs 
    WHERE job_name = 'enhanced_notification_pipeline'
    AND status = 'success'
    AND error_message LIKE '%Change types: []%'
    AND created_at < now() - interval '1 hour';
    
    RETURN deleted_count;
END;
$function$;

-- Function 5: cleanup_phantom_notifications
CREATE OR REPLACE FUNCTION public.cleanup_phantom_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  deleted_count INTEGER := 0;
  phantom_count INTEGER := 0;
BEGIN
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
  
  DELETE FROM public.notification_audit_false_positives 
  WHERE false_positive_detected_at < now() - interval '7 days';
  
  GET DIAGNOSTICS phantom_count = ROW_COUNT;
  
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

-- Function 6: check_request_deduplication
CREATE OR REPLACE FUNCTION public.check_request_deduplication(p_request_hash text, p_signal_id uuid, p_notification_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    existing_request_id uuid;
BEGIN
    SELECT id INTO existing_request_id
    FROM notification_request_cache
    WHERE request_hash = p_request_hash
    AND expires_at > now();
    
    IF existing_request_id IS NOT NULL THEN
        INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
        VALUES (
            'request_deduplication', 
            now(), 
            0, 
            'blocked',
            format('Blocked duplicate request - Hash: %s, Signal: %s, Type: %s', 
                p_request_hash, p_signal_id, p_notification_type)
        );
        
        RETURN false;
    END IF;
    
    INSERT INTO notification_request_cache (request_hash, signal_id, notification_type, expires_at)
    VALUES (p_request_hash, p_signal_id, p_notification_type, now() + interval '10 minutes')
    ON CONFLICT (request_hash) DO UPDATE SET
        processed_at = now(),
        expires_at = now() + interval '10 minutes';
        
    RETURN true;
END;
$function$;

-- Function 7: check_notification_rate_limit
CREATE OR REPLACE FUNCTION public.check_notification_rate_limit(p_signal_id uuid, p_max_per_minute integer DEFAULT 3)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.cron_job_logs
  WHERE job_name = 'enhanced_notification_pipeline'
    AND status = 'success'
    AND error_message LIKE '%Signal ID: ' || p_signal_id::text || '%'
    AND created_at > now() - interval '1 minute';
  
  RETURN recent_count < p_max_per_minute;
END;
$function$;

-- Function 8: get_notification_health_metrics
CREATE OR REPLACE FUNCTION public.get_notification_health_metrics(p_hours integer DEFAULT 24)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'success') as successful,
    COUNT(*) FILTER (WHERE status IN ('error', 'critical_error')) as failed
  INTO total_sent, successful_sent, failed_sent
  FROM public.cron_job_logs
  WHERE job_name = 'enhanced_notification_pipeline'
    AND created_at > now() - (p_hours || ' hours')::interval;
  
  SELECT COUNT(*) INTO false_positive_count
  FROM public.notification_audit_false_positives
  WHERE false_positive_detected_at > now() - (p_hours || ' hours')::interval;
  
  success_rate := CASE 
    WHEN total_sent > 0 THEN (successful_sent::NUMERIC / total_sent::NUMERIC) * 100 
    ELSE 100 
  END;
  
  false_positive_rate := CASE 
    WHEN successful_sent > 0 THEN (false_positive_count::NUMERIC / successful_sent::NUMERIC) * 100 
    ELSE 0 
  END;
  
  SELECT error_message INTO last_error_message
  FROM public.cron_job_logs
  WHERE job_name = 'enhanced_notification_pipeline'
    AND status IN ('error', 'critical_error')
    AND created_at > now() - (p_hours || ' hours')::interval
  ORDER BY created_at DESC
  LIMIT 1;
  
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

-- Function 9: get_active_notification_triggers
CREATE OR REPLACE FUNCTION public.get_active_notification_triggers()
RETURNS TABLE(trigger_name text, table_name text, function_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    t.tgname::TEXT as trigger_name,
    c.relname::TEXT as table_name,
    p.proname::TEXT as function_name
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_proc p ON t.tgfoid = p.oid
  WHERE c.relname IN ('trade_alerts', 'alert_monitoring')
  AND t.tgname LIKE '%notify%'
  ORDER BY c.relname, t.tgname;
END;
$function$;

-- Function 10: should_user_receive_notification (already has search_path, but recreating for consistency)
CREATE OR REPLACE FUNCTION public.should_user_receive_notification(p_user_id uuid, p_creator_id uuid, p_notification_type text, p_priority_level integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN (
    p_user_id != p_creator_id AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = p_user_id 
      AND account_status = 'active'
      AND push_subscription_active = true
    )
  );
END;
$function$;

-- Function 11: acquire_broadcast_lock
CREATE OR REPLACE FUNCTION public.acquire_broadcast_lock(p_holder_id text, p_duration_seconds integer DEFAULT 30)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  lock_acquired boolean := false;
BEGIN
  INSERT INTO price_broadcast_lock (id, holder_id, expires_at, updated_at)
  VALUES ('singleton', p_holder_id, now() + (p_duration_seconds || ' seconds')::interval, now())
  ON CONFLICT (id) DO UPDATE SET
    holder_id = EXCLUDED.holder_id,
    expires_at = EXCLUDED.expires_at,
    updated_at = now()
  WHERE price_broadcast_lock.expires_at < now() OR price_broadcast_lock.holder_id = p_holder_id;
  
  SELECT (holder_id = p_holder_id AND expires_at > now()) INTO lock_acquired
  FROM price_broadcast_lock
  WHERE id = 'singleton';
  
  RETURN COALESCE(lock_acquired, false);
END;
$function$;

-- Function 12: get_market_data_freshness
CREATE OR REPLACE FUNCTION public.get_market_data_freshness()
RETURNS TABLE(symbol text, hours_old numeric, is_stale boolean, last_update timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    mp.symbol,
    EXTRACT(EPOCH FROM (NOW() - mp.updated_at)) / 3600 as hours_old,
    (mp.updated_at < NOW() - INTERVAL '1 hour') as is_stale,
    mp.updated_at as last_update
  FROM public.market_prices mp
  ORDER BY mp.updated_at DESC;
END;
$function$;

-- Function 13: get_xeon_stream_subscribers
CREATE OR REPLACE FUNCTION public.get_xeon_stream_subscribers()
RETURNS TABLE(user_id uuid, onesignal_player_id text, display_name text, notification_preferences jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.onesignal_player_id,
        p.display_name,
        p.notification_preferences
    FROM public.profiles p
    WHERE p.account_status = 'active'
    AND p.xeon_stream_subscription = true
    AND p.push_subscription_active = true
    AND p.onesignal_player_id IS NOT NULL
    AND p.onesignal_subscription_status = 'subscribed';
END;
$function$;

-- ============================================
-- VERIFICATION: Log migration completion
-- ============================================
DO $$
BEGIN
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES (
    'phase2_security_migration',
    NOW(),
    13,
    'success',
    'Phase 2 Security Fix: Added SET search_path to 13 functions for BUG #23'
  );
END $$;