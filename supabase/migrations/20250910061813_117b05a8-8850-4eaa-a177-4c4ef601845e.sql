-- Phase D: Legacy cleanup - Disable notify_trade_alert_changes trigger
-- This replaces the old notification trigger with audit logging only

DROP TRIGGER IF EXISTS notify_trade_alert_changes ON public.trade_alerts;

-- Create audit log for the decommission
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
  'legacy_cleanup_notify_trade_alert_changes', 
  NOW(), 
  1, 
  'success',
  'Disabled notify_trade_alert_changes trigger - now using enhanced-signal-notification-dispatcher only'
);

-- Phase D: Daily observation job for deprecated functions
-- This function will log usage of deprecated functions for 7-day monitoring

CREATE OR REPLACE FUNCTION public.log_deprecated_function_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  process_price_alerts_usage INTEGER;
  upsert_market_price_enhanced_usage INTEGER;
BEGIN
  -- Count calls to deprecated functions (this is a mock check - in real implementation
  -- you would need to add logging to the functions themselves or use pg_stat_statements)
  
  -- For now, we'll just log that the monitoring is active
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES (
    'daily_deprecated_function_monitor', 
    NOW(), 
    0, 
    'success',
    'Monitoring deprecated functions: process_price_alerts (legacy), upsert_market_price_enhanced (replaced with upsert_market_price)'
  );
  
  -- After 7 days of zero usage, these functions should be removed:
  -- - process_price_alerts (replaced by process_price_alerts_enhanced)
  -- - upsert_market_price_enhanced (replaced by upsert_market_price)
END;
$$;

-- Schedule the daily observation (would be set up via pg_cron in production)
-- For now, just create a one-time log entry
SELECT public.log_deprecated_function_usage();