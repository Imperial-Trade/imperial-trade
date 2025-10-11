-- Phase 1.D: Database Security Hardening
-- Fix SECURITY DEFINER view + Add search_path to vulnerable functions

-- ============================================
-- Phase 1.D.1: Fix get_alerts_with_profiles
-- Change from SECURITY DEFINER to SECURITY INVOKER
-- ============================================
CREATE OR REPLACE FUNCTION public.get_alerts_with_profiles()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  asset_name text,
  tradermade_symbol text,
  trade_type text,
  entry_price numeric,
  stop_loss numeric,
  status text,
  tp1 numeric,
  tp2 numeric,
  tp3 numeric,
  tp4 numeric,
  tp5 numeric,
  tp_hits integer[],
  notes text,
  close_reason text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  profile_id uuid,
  display_name text,
  role text,
  avatar_url text,
  user_type user_type_enum,
  access_level access_level_enum
)
LANGUAGE sql
SECURITY INVOKER  -- Changed from DEFINER to INVOKER
SET search_path = public
AS $$
  SELECT 
    ta.id,
    ta.user_id,
    ta.asset_name,
    ta.tradermade_symbol,
    ta.trade_type,
    ta.entry_price,
    ta.stop_loss,
    ta.status,
    ta.tp1,
    ta.tp2,
    ta.tp3,
    ta.tp4,
    ta.tp5,
    ta.tp_hits,
    ta.notes,
    ta.close_reason,
    ta.created_at,
    ta.updated_at,
    p.id as profile_id,
    p.display_name,
    p.role,
    p.avatar_url,
    p.user_type,
    p.access_level
  FROM trade_alerts ta
  LEFT JOIN profiles p ON ta.user_id = p.id
  ORDER BY ta.created_at DESC;
$$;

-- ============================================
-- Phase 1.D.2: Add search_path to 7 vulnerable functions
-- ============================================

-- 1. cleanup_webhook_debounce
CREATE OR REPLACE FUNCTION public.cleanup_webhook_debounce()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    DELETE FROM public.webhook_debounce 
    WHERE last_triggered_at < now() - interval '2 minutes';
END;
$function$;

-- 2. get_active_notification_triggers
CREATE OR REPLACE FUNCTION public.get_active_notification_triggers()
RETURNS TABLE(trigger_name text, table_name text, function_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 3. upsert_market_price_enhanced_midonly
CREATE OR REPLACE FUNCTION public.upsert_market_price_enhanced_midonly(
  p_symbol text, 
  p_bid numeric DEFAULT NULL::numeric, 
  p_ask numeric DEFAULT NULL::numeric, 
  p_mid numeric DEFAULT NULL::numeric, 
  p_timestamp timestamp with time zone DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    INSERT INTO public.market_prices (symbol, bid, ask, mid, timestamp, updated_at)
    VALUES (p_symbol, p_bid, p_ask, p_mid, p_timestamp, now())
    ON CONFLICT (symbol) 
    DO UPDATE SET 
        bid = COALESCE(EXCLUDED.bid, market_prices.bid),
        ask = COALESCE(EXCLUDED.ask, market_prices.ask), 
        mid = COALESCE(EXCLUDED.mid, market_prices.mid),
        timestamp = EXCLUDED.timestamp,
        updated_at = now()
    WHERE 
        market_prices.bid IS DISTINCT FROM EXCLUDED.bid OR
        market_prices.ask IS DISTINCT FROM EXCLUDED.ask OR
        market_prices.mid IS DISTINCT FROM EXCLUDED.mid OR
        market_prices.timestamp < EXCLUDED.timestamp - INTERVAL '1 second';
END;
$function$;

-- 4. cleanup_expired_coach_cache
CREATE OR REPLACE FUNCTION public.cleanup_expired_coach_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.coach_message_cache 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$function$;

-- 5. verify_signal_triggers
CREATE OR REPLACE FUNCTION public.verify_signal_triggers()
RETURNS TABLE(trigger_name text, table_name text, enabled boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
SELECT 
  t.tgname::text as trigger_name,
  c.relname::text as table_name,
  t.tgenabled = 'O' as enabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'trade_alerts' 
AND t.tgname LIKE '%enhanced_signal%'
ORDER BY t.tgname;
$function$;

-- 6. enable_course_module_webhook
CREATE OR REPLACE FUNCTION public.enable_course_module_webhook()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  ALTER TABLE course_modules ENABLE TRIGGER course_module_ai_analysis_trigger;
  
  INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES ('webhook_management', NOW(), 1, 'success', 'Course module AI webhook enabled');
  
  RETURN 'Course module AI analysis webhook enabled successfully';
END;
$function$;

-- 7. disable_course_module_webhook
CREATE OR REPLACE FUNCTION public.disable_course_module_webhook()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  ALTER TABLE course_modules DISABLE TRIGGER course_module_ai_analysis_trigger;
  
  INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES ('webhook_management', NOW(), 1, 'success', 'Course module AI webhook disabled');
  
  RETURN 'Course module AI analysis webhook disabled successfully';
END;
$function$;

-- ============================================
-- Phase 1.D.3: Document RLS Tables Without Policies
-- ============================================
-- Tables with RLS enabled but no policies (informational only):
-- These tables are intentionally managed by system/service role only:
-- 1. webhook_debounce - system managed
-- 2. price_broadcast_lock - system managed  
-- 3. ui_price_listeners - system managed
-- No action needed - these are correctly configured

-- Log migration completion
INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
  'phase_1d_security_hardening', 
  NOW(), 
  8, 
  'success',
  'Phase 1.D Complete: Fixed get_alerts_with_profiles (SECURITY INVOKER) + Added search_path to 7 functions'
);