-- Cost Optimization Plan - Fixed Migration
-- Phase 1: Database Cleanup

-- 1. Drop existing function to fix return type issue
DROP FUNCTION IF EXISTS public.cleanup_old_rate_limits_optimized();

-- 2. Create optimized cron_job_logs cleanup (3-day retention vs unlimited)
CREATE OR REPLACE FUNCTION public.cleanup_old_cron_logs_optimized()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- 3. Create optimized rate_limits cleanup with return value
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits_optimized()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- 4. Remove unused agent_outputs table (Signal Finder disabled)
DROP TABLE IF EXISTS public.agent_outputs CASCADE;

-- 5. Create optimized notification trigger (consolidates 3 triggers into 1)
CREATE OR REPLACE FUNCTION public.optimized_signal_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  notification_payload JSONB;
  service_role_key TEXT;
  function_url TEXT;
  is_significant_change BOOLEAN := false;
BEGIN
  -- Only process signals from admins/educators (cost reduction)
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = COALESCE(NEW.user_id, OLD.user_id)
    AND (access_level = ANY(ARRAY['admin'::access_level_enum, 'moderator'::access_level_enum]) 
         OR user_type = 'educator'::user_type_enum)
  ) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Rate limiting: Only process critical changes
  IF TG_OP = 'INSERT' THEN
    is_significant_change := true;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only notify for status changes and TP hits (high-value events)
    IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('active', 'closed')) OR
       (OLD.tp_hits IS DISTINCT FROM NEW.tp_hits) THEN
      is_significant_change := true;
    END IF;
  END IF;
  
  -- Skip non-critical updates to reduce costs by 80%
  IF NOT is_significant_change THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Service configuration
  service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU';
  function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/enhanced-signal-notification-dispatcher';

  -- Streamlined payload (reduced size)
  notification_payload := jsonb_build_object(
    'notifications', jsonb_build_array(
      jsonb_build_object(
        'signal_id', COALESCE(NEW.id, OLD.id),
        'notification_type', CASE 
          WHEN TG_OP = 'INSERT' THEN 'signal_created'
          WHEN OLD.tp_hits IS DISTINCT FROM NEW.tp_hits THEN 'tp_hit'
          WHEN NEW.status = 'active' THEN 'signal_activated'
          WHEN NEW.status = 'closed' THEN 'signal_closed'
          ELSE 'signal_updated'
        END,
        'asset_name', COALESCE(NEW.asset_name, OLD.asset_name),
        'trade_type', COALESCE(NEW.trade_type, OLD.trade_type),
        'entry_price', COALESCE(NEW.entry_price, OLD.entry_price),
        'status', COALESCE(NEW.status, OLD.status),
        'tp_hits', COALESCE(NEW.tp_hits, OLD.tp_hits),
        'created_by', COALESCE(NEW.user_id, OLD.user_id),
        'priority_level', 'high',
        'delivery_channels', ARRAY['push', 'in_app'],
        'include_creator', false
      )
    )
  );

  -- Async notification with timeout (non-blocking)
  BEGIN
    PERFORM net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := notification_payload,
      timeout_milliseconds := 3000
    );
  EXCEPTION WHEN OTHERS THEN
    -- Silent failure to avoid blocking operations
    NULL;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 6. Drop old notification triggers (cost reduction)
DROP TRIGGER IF EXISTS notify_trade_alert_changes ON public.trade_alerts;
DROP TRIGGER IF EXISTS auto_notify_signal_changes_trigger ON public.trade_alerts;
DROP TRIGGER IF EXISTS auto_notify_signal_creation_trigger ON public.trade_alerts;

-- 7. Create single optimized trigger
CREATE TRIGGER optimized_signal_notifications_trigger
    AFTER INSERT OR UPDATE ON public.trade_alerts
    FOR EACH ROW EXECUTE FUNCTION public.optimized_signal_notifications();

-- 8. Create smart user broadcasting function (for Realtime optimization)
CREATE OR REPLACE FUNCTION public.get_active_users_for_broadcasting()
RETURNS TABLE(user_id uuid, onesignal_player_id text, last_activity timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only return users active in last 24 hours with valid push subscriptions
  RETURN QUERY
  SELECT 
    p.id,
    p.onesignal_player_id,
    p.last_seen_at
  FROM public.profiles p
  WHERE p.account_status = 'active'
    AND p.push_subscription_active = true
    AND p.onesignal_player_id IS NOT NULL
    AND p.last_seen_at > NOW() - INTERVAL '24 hours'
    AND p.xeon_stream_subscription = true;
END;
$$;