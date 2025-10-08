-- ============================================
-- PHASE 2 COMPLETION: Database Security Fixes (CORRECTED)
-- Fix all remaining function search_path and view security issues
-- ============================================

-- ============================================
-- PART 1: Drop functions that might have different signatures
-- ============================================

DROP FUNCTION IF EXISTS public.auto_cleanup_stale_sessions();
DROP FUNCTION IF EXISTS public.check_alert_cooldown(text, text, integer);
DROP FUNCTION IF EXISTS public.cleanup_old_cron_logs();
DROP FUNCTION IF EXISTS public.cleanup_old_notification_logs();
DROP FUNCTION IF EXISTS public.disable_economic_events_processing();
DROP FUNCTION IF EXISTS public.get_active_alert_symbols();
DROP FUNCTION IF EXISTS public.get_active_users_for_broadcasting();
DROP FUNCTION IF EXISTS public.get_cron_job_status();
DROP FUNCTION IF EXISTS public.handle_triggered_alert_enhanced(uuid, uuid, text, numeric);
DROP FUNCTION IF EXISTS public.log_deprecated_function_usage(text, uuid, jsonb);
DROP FUNCTION IF EXISTS public.populate_alert_monitoring_for_existing_signals();
DROP FUNCTION IF EXISTS public.check_account_request_rate_limit(text);
DROP FUNCTION IF EXISTS public.cleanup_old_cron_logs_optimized();
DROP FUNCTION IF EXISTS public.cleanup_old_economic_events();
DROP FUNCTION IF EXISTS public.cleanup_old_rate_limits_optimized();
DROP FUNCTION IF EXISTS public.cleanup_stale_market_prices();
DROP FUNCTION IF EXISTS public.expire_limit_orders();
DROP FUNCTION IF EXISTS public.system_update_trade_alert(uuid, jsonb);
DROP FUNCTION IF EXISTS public.update_expired_sessions();

-- ============================================
-- PART 2: Recreate 11 functions with proper search_path
-- ============================================

CREATE FUNCTION public.auto_cleanup_stale_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.ui_activity_sessions 
  WHERE last_activity_at < now() - interval '30 minutes';
END;
$$;

CREATE FUNCTION public.check_alert_cooldown(
  p_asset_symbol text,
  p_alert_type text,
  p_cooldown_seconds integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  last_triggered timestamp with time zone;
BEGIN
  SELECT last_triggered_at INTO last_triggered
  FROM public.alert_cooldowns
  WHERE asset_symbol = p_asset_symbol
    AND alert_type = p_alert_type;
  
  IF last_triggered IS NULL OR 
     last_triggered < now() - (p_cooldown_seconds || ' seconds')::interval THEN
    INSERT INTO public.alert_cooldowns (asset_symbol, alert_type, last_triggered_at)
    VALUES (p_asset_symbol, p_alert_type, now())
    ON CONFLICT (asset_symbol, alert_type) 
    DO UPDATE SET last_triggered_at = now();
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

CREATE FUNCTION public.cleanup_old_cron_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.cron_job_logs
  WHERE created_at < now() - interval '7 days';
END;
$$;

CREATE FUNCTION public.cleanup_old_notification_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.notification_audit_trail
  WHERE created_at < now() - interval '30 days';
END;
$$;

CREATE FUNCTION public.disable_economic_events_processing()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN;
END;
$$;

CREATE FUNCTION public.get_active_alert_symbols()
RETURNS TABLE(symbol text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT tradermade_symbol as symbol
  FROM public.trade_alerts
  WHERE status = 'active';
END;
$$;

CREATE FUNCTION public.get_active_users_for_broadcasting()
RETURNS TABLE(
  user_id uuid,
  onesignal_player_id text,
  display_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.onesignal_player_id,
    p.display_name
  FROM public.profiles p
  WHERE p.account_status = 'active'
    AND p.push_subscription_active = true
    AND p.onesignal_player_id IS NOT NULL;
END;
$$;

CREATE FUNCTION public.get_cron_job_status()
RETURNS TABLE(
  job_name text,
  last_run timestamp with time zone,
  status text,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cj.job_name,
    cj.execution_time as last_run,
    cj.status,
    cj.error_message
  FROM public.cron_job_logs cj
  WHERE cj.execution_time = (
    SELECT MAX(execution_time)
    FROM public.cron_job_logs
    WHERE job_name = cj.job_name
  )
  ORDER BY cj.execution_time DESC;
END;
$$;

CREATE FUNCTION public.handle_triggered_alert_enhanced(
  p_alert_id uuid,
  p_signal_id uuid,
  p_alert_type text,
  p_triggered_price numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
  tp_level integer;
BEGIN
  UPDATE public.alert_monitoring 
  SET is_active = false, updated_at = now()
  WHERE id = p_alert_id;
  
  IF p_alert_type = 'stop_loss' THEN
    UPDATE public.trade_alerts 
    SET status = 'closed', close_reason = 'stop_loss', updated_at = now()
    WHERE id = p_signal_id;
    
    result := jsonb_build_object(
      'action', 'signal_closed',
      'reason', 'stop_loss_hit'
    );
    
  ELSIF p_alert_type LIKE 'take_profit_%' THEN
    tp_level := CAST(substring(p_alert_type from 'take_profit_(\d+)') AS integer);
    
    UPDATE public.trade_alerts 
    SET tp_hits = COALESCE(tp_hits, '{}') || tp_level,
        updated_at = now()
    WHERE id = p_signal_id;
    
    result := jsonb_build_object(
      'action', 'tp_hit',
      'tp_level', tp_level
    );
    
  ELSE
    result := jsonb_build_object(
      'action', 'alert_processed',
      'alert_type', p_alert_type
    );
  END IF;
  
  RETURN result;
END;
$$;

CREATE FUNCTION public.log_deprecated_function_usage(
  p_function_name text,
  p_user_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.function_deprecation_hits 
    (function_name, user_id, metadata, created_at)
  VALUES 
    (p_function_name, p_user_id, p_metadata, now());
END;
$$;

CREATE FUNCTION public.populate_alert_monitoring_for_existing_signals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level)
  SELECT 
    id,
    tradermade_symbol,
    'stop_loss',
    stop_loss,
    1
  FROM public.trade_alerts
  WHERE status = 'active'
    AND stop_loss IS NOT NULL
  ON CONFLICT (signal_id, alert_type) DO NOTHING;
END;
$$;

-- ============================================
-- PART 3: Recreate 8 functions with proper search_path (from empty)
-- ============================================

CREATE FUNCTION public.check_account_request_rate_limit(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  request_count integer;
BEGIN
  SELECT COUNT(*) INTO request_count
  FROM public.account_requests
  WHERE lower(email) = lower(p_email)
    AND created_at > now() - interval '24 hours';
  
  RETURN request_count < 5;
END;
$$;

CREATE FUNCTION public.cleanup_old_cron_logs_optimized()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.cron_job_logs
  WHERE created_at < now() - interval '7 days'
    AND status != 'error';
END;
$$;

CREATE FUNCTION public.cleanup_old_economic_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.economic_events
  WHERE event_date < now() - interval '90 days';
END;
$$;

CREATE FUNCTION public.cleanup_old_rate_limits_optimized()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE created_at < now() - interval '1 hour';
END;
$$;

CREATE FUNCTION public.cleanup_stale_market_prices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.market_prices
  WHERE updated_at < now() - interval '1 day';
END;
$$;

CREATE FUNCTION public.expire_limit_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.trade_alerts
  SET status = 'closed',
      close_reason = 'expired',
      updated_at = now()
  WHERE status = 'pending'
    AND trade_type IN ('buy_limit', 'sell_limit')
    AND created_at < now() - interval '7 days';
END;
$$;

CREATE FUNCTION public.system_update_trade_alert(
  p_signal_id uuid,
  p_updates jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM set_config('app.is_system_operation', 'true', true);
  
  UPDATE public.trade_alerts
  SET 
    status = COALESCE((p_updates->>'status')::text, status),
    close_reason = COALESCE((p_updates->>'close_reason')::text, close_reason),
    tp_hits = COALESCE((p_updates->>'tp_hits')::integer[], tp_hits),
    updated_at = now()
  WHERE id = p_signal_id;
  
  PERFORM set_config('app.is_system_operation', 'false', true);
END;
$$;

CREATE FUNCTION public.update_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.ui_activity_sessions
  SET is_active = false
  WHERE last_activity_at < now() - interval '10 minutes'
    AND is_active = true;
END;
$$;

-- ============================================
-- PART 4: Fix Security Definer View
-- ============================================

DROP VIEW IF EXISTS public.module_youtube_ids_v1;

CREATE VIEW public.module_youtube_ids_v1
WITH (security_invoker = true)
AS
SELECT 
  mv.module_id,
  v.youtube_id
FROM public.module_videos mv
JOIN public.videos v ON v.id = mv.video_id
WHERE v.youtube_id IS NOT NULL;

-- ============================================
-- PART 5: Add RLS policies for user_roles table
-- ============================================

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- VERIFICATION & AUDIT LOG
-- ============================================

INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
  'phase_2_database_security_completion',
  NOW(),
  19,
  'success',
  'PHASE 2 COMPLETE: Fixed 19 database security issues - 11 functions with missing search_path, 8 functions with empty search_path, 1 security definer view, and added 2 RLS policies for user_roles table'
);