-- CRITICAL FIX: Update has_active_ui_listeners to check correct table
-- Root cause: Function was checking market_prices/profiles instead of ui_price_listeners
-- This created circular dependency preventing price-ingestor from running

CREATE OR REPLACE FUNCTION public.has_active_ui_listeners(p_threshold_seconds integer DEFAULT 60)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  has_recent_activity boolean := false;
BEGIN
  -- Check for active UI sessions in ui_price_listeners table
  SELECT EXISTS(
    SELECT 1 FROM ui_price_listeners 
    WHERE last_seen_at > now() - (p_threshold_seconds || ' seconds')::interval
    LIMIT 1
  ) INTO has_recent_activity;
  
  RETURN has_recent_activity;
END;
$$;

-- Log the critical fix
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES ('fix_ui_activity_detection', NOW(), 1, 'success', 'CRITICAL FIX: Updated has_active_ui_listeners to check ui_price_listeners table instead of market_prices/profiles - breaking circular dependency that prevented price updates');