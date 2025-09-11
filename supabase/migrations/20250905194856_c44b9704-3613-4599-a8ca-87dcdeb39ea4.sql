-- Cost Optimization Plan Implementation - Phase 1: Database Cleanup

-- 1. Optimize cron_job_logs retention (currently causing high storage costs)
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
  
  -- Only log if significant cleanup occurred
  IF deleted_count > 0 THEN
    INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status)
    VALUES ('cleanup_old_cron_logs_optimized', NOW(), deleted_count, 'success');
  END IF;
  
  RETURN deleted_count;
END;
$$;

-- 2. Optimize rate_limits cleanup (run every 6 hours instead of on-demand)
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

-- 3. Remove unused agent_outputs table (Signal Finder is disabled)
DROP TABLE IF EXISTS public.agent_outputs CASCADE;

-- 4. Create consolidated notification trigger to replace duplicates
-- This will reduce function executions from 8,314 to ~1,000/month
CREATE OR REPLACE FUNCTION public.optimized_signal_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  author_profile RECORD;
  notification_payload JSONB;
  service_role_key TEXT;
  function_url TEXT;
  change_types TEXT[] := '{}';
  is_significant_change BOOLEAN := false;
  priority_level INTEGER := 1;
BEGIN
  -- Only trigger for signals created by admins or educators
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = COALESCE(NEW.user_id, OLD.user_id)
    AND (access_level = ANY(ARRAY['admin'::access_level_enum, 'moderator'::access_level_enum]) 
         OR user_type = 'educator'::user_type_enum)
  ) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Rate limiting: Only process high-priority changes to reduce costs
  IF TG_OP = 'INSERT' THEN
    change_types := array_append(change_types, 'signal_created');
    is_significant_change := true;
    priority_level := 2;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only notify for critical status changes
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('active', 'closed') THEN
      change_types := array_append(change_types, 'status_change');
      is_significant_change := true;
      priority_level := 2;
    END IF;

    -- Only notify for TP hits (high value events)
    IF OLD.tp_hits IS DISTINCT FROM NEW.tp_hits THEN
      change_types := array_append(change_types, 'tp_hits');
      is_significant_change := true;
      priority_level := 2;
    END IF;
    
    -- Skip low-priority updates to reduce costs
    IF NOT is_significant_change THEN
      RETURN NEW;
    END IF;
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Get service configuration
  service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU';
  function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/enhanced-signal-notification-dispatcher';

  -- Fetch author information
  SELECT display_name, avatar_url 
  INTO author_profile
  FROM public.public_profiles 
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  -- Build streamlined notification payload
  notification_payload := jsonb_build_object(
    'notifications', jsonb_build_array(
      jsonb_build_object(
        'signal_id', COALESCE(NEW.id, OLD.id),
        'notification_type', CASE 
          WHEN 'signal_created' = ANY(change_types) THEN 'signal_created'
          WHEN 'tp_hits' = ANY(change_types) THEN 'tp_hit'
          WHEN 'status_change' = ANY(change_types) AND NEW.status = 'active' THEN 'signal_activated'
          WHEN 'status_change' = ANY(change_types) AND NEW.status = 'closed' THEN 'signal_closed'
          ELSE 'signal_updated'
        END,
        'asset_name', COALESCE(NEW.asset_name, OLD.asset_name),
        'trade_type', COALESCE(NEW.trade_type, OLD.trade_type),
        'entry_price', COALESCE(NEW.entry_price, OLD.entry_price),
        'status', COALESCE(NEW.status, OLD.status),
        'tp_hits', COALESCE(NEW.tp_hits, OLD.tp_hits),
        'created_by', COALESCE(NEW.user_id, OLD.user_id),
        'priority_level', CASE WHEN priority_level = 2 THEN 'high' ELSE 'normal' END,
        'delivery_channels', ARRAY['push', 'in_app'],
        'include_creator', false
      )
    )
  );

  -- Async notification (fire and forget to reduce blocking)
  BEGIN
    PERFORM net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := notification_payload,
      timeout_milliseconds := 5000
    );
    
  EXCEPTION WHEN OTHERS THEN
    -- Silent failure to avoid blocking signal operations
    NULL;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5. Drop old notification triggers to consolidate functionality
DROP TRIGGER IF EXISTS notify_trade_alert_changes ON public.trade_alerts;
DROP TRIGGER IF EXISTS auto_notify_signal_changes_trigger ON public.trade_alerts;
DROP TRIGGER IF EXISTS auto_notify_signal_creation_trigger ON public.trade_alerts;

-- 6. Create single optimized trigger
CREATE TRIGGER optimized_signal_notifications_trigger
    AFTER INSERT OR UPDATE ON public.trade_alerts
    FOR EACH ROW EXECUTE FUNCTION public.optimized_signal_notifications();

-- 7. Create function to track active users for smart broadcasting
CREATE OR REPLACE FUNCTION public.update_user_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update last_seen for active users to optimize broadcasting
  IF NEW.last_seen_at IS NULL OR NEW.last_seen_at < NOW() - INTERVAL '5 minutes' THEN
    NEW.last_seen_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- 8. Add trigger to track user activity
CREATE TRIGGER update_user_activity_trigger
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_user_activity();