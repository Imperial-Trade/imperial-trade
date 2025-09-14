-- Phase 1 Completion: Remove all duplicate notification triggers only

-- Drop all old notification triggers that are causing conflicts
DROP TRIGGER IF EXISTS auto_notify_signal_creation ON public.trade_alerts;
DROP TRIGGER IF EXISTS auto_notify_signal_updates ON public.trade_alerts;
DROP TRIGGER IF EXISTS notify_signal_creation_enhanced ON public.trade_alerts;
DROP TRIGGER IF EXISTS notify_signal_updates_enhanced ON public.trade_alerts;
DROP TRIGGER IF EXISTS optimized_signal_notifications_trigger ON public.trade_alerts;
DROP TRIGGER IF EXISTS trigger_auto_notify_signal_creation ON public.trade_alerts;
DROP TRIGGER IF EXISTS trigger_auto_notify_signal_updates ON public.trade_alerts;

-- Drop old notification functions that are no longer needed
DROP FUNCTION IF EXISTS auto_notify_signal_creation() CASCADE;
DROP FUNCTION IF EXISTS auto_notify_signal_updates() CASCADE;
DROP FUNCTION IF EXISTS optimized_signal_notifications() CASCADE;

-- Clean up any orphaned alert monitoring triggers
DROP TRIGGER IF EXISTS notify_price_alerts ON public.alert_monitoring;
DROP TRIGGER IF EXISTS trigger_auto_notify_price_alerts ON public.alert_monitoring;
DROP TRIGGER IF EXISTS after_alert_monitoring_update ON public.alert_monitoring;

-- Drop old price alert notification functions
DROP FUNCTION IF EXISTS auto_notify_price_alerts() CASCADE;

-- Create function to get active notification triggers (for monitoring)
CREATE OR REPLACE FUNCTION public.get_active_notification_triggers()
RETURNS TABLE(trigger_name TEXT, table_name TEXT, function_name TEXT) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log the cleanup operation
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
  'notification_system_cleanup', 
  NOW(), 
  1, 
  'success',
  'Phase 1 cleanup: Removed duplicate triggers, enhanced notification pipeline is now the sole notification system'
);