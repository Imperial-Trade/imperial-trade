-- PHASE 1: Fix Database Notification Triggers
-- The triggers exist but are DISABLED (enabled: O). Re-enable them to trigger notifications.

-- Enable the INSERT trigger for signal notifications
ALTER TABLE trade_alerts ENABLE TRIGGER enhanced_signal_notification_pipeline_insert;

-- Enable the UPDATE trigger for signal notifications  
ALTER TABLE trade_alerts ENABLE TRIGGER enhanced_signal_notification_pipeline_update;

-- Add comprehensive logging for debugging
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES ('enable_signal_triggers', NOW(), 2, 'success', 'PHASE 1 COMPLETE: Enabled enhanced_signal_notification_pipeline_insert and enhanced_signal_notification_pipeline_update triggers for immediate signal notifications');

-- Verify triggers are now enabled
CREATE OR REPLACE FUNCTION public.verify_signal_triggers()
RETURNS TABLE(trigger_name text, table_name text, enabled boolean)
LANGUAGE sql
SECURITY DEFINER
AS $$
SELECT 
  t.tgname::text as trigger_name,
  c.relname::text as table_name,
  t.tgenabled = 'O' as enabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'trade_alerts' 
AND t.tgname LIKE '%enhanced_signal%'
ORDER BY t.tgname;
$$;