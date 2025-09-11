-- Phase 1: Database Security Hardening - Fix Security Definer View and Function Security
-- Fix Critical Security Definer View issue
DROP VIEW IF EXISTS public.xeon_subscribers_public;
CREATE VIEW public.xeon_subscribers_public 
WITH (security_invoker = true)
AS 
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

-- Fix Function Search Path Security Issues - Add SET search_path = '' to critical functions
CREATE OR REPLACE FUNCTION public.cleanup_old_economic_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.economic_events 
  WHERE event_date < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status)
  VALUES ('cleanup_old_economic_events', NOW(), deleted_count, 'success');
  
  RETURN deleted_count;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES ('cleanup_old_economic_events', NOW(), 0, 'error', SQLERRM);
  
  RAISE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_old_cron_logs_optimized()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Keep only last 3 days instead of unlimited retention
  DELETE FROM public.cron_job_logs 
  WHERE created_at < NOW() - INTERVAL '3 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Only log if significant cleanup occurred (reduce log bloat)
  IF deleted_count > 10 THEN
    INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status)
    VALUES ('cleanup_old_cron_logs_optimized', NOW(), deleted_count, 'success');
  END IF;
  
  RETURN deleted_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits_optimized()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Clean email rate limits older than 24 hours
  DELETE FROM public.rate_limits 
  WHERE limit_type = 'email' 
    AND window_start < NOW() - INTERVAL '24 hours';
    
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Clean IP rate limits older than 1 hour  
  DELETE FROM public.rate_limits 
  WHERE limit_type = 'ip' 
    AND window_start < NOW() - INTERVAL '1 hour';
  
  RETURN deleted_count;
END;
$function$;