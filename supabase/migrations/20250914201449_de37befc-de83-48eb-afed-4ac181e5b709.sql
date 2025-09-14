-- Phase 1 Completion: Remove all duplicate notification triggers and clean up the database

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

-- Verify the enhanced notification pipeline triggers are the only ones remaining
-- These should be the ONLY notification triggers on trade_alerts table:
-- 1. enhanced_signal_notification_pipeline_insert (for INSERT operations)  
-- 2. enhanced_signal_notification_pipeline_update (for UPDATE operations)

-- Also clean up any orphaned alert monitoring triggers
DROP TRIGGER IF EXISTS notify_price_alerts ON public.alert_monitoring;
DROP TRIGGER IF EXISTS trigger_auto_notify_price_alerts ON public.alert_monitoring;
DROP TRIGGER IF EXISTS after_alert_monitoring_update ON public.alert_monitoring;

-- Drop old price alert notification functions
DROP FUNCTION IF EXISTS auto_notify_price_alerts() CASCADE;

-- Add missing notification settings table for system configuration
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on notification settings (admin only)
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for notification settings (admin access only)
CREATE POLICY "Admins can manage notification settings" 
ON public.notification_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default system notification settings
INSERT INTO public.notification_settings (setting_key, setting_value, description)
VALUES 
  ('rate_limit_per_user_per_minute', '{"limit": 10, "window_minutes": 1}'::jsonb, 'Rate limit for notifications per user per minute'),
  ('batch_window_seconds', '{"seconds": 300}'::jsonb, 'Batching window for similar notifications'),
  ('max_retry_attempts', '{"attempts": 3, "backoff_multiplier": 2}'::jsonb, 'Maximum retry attempts for failed notifications'),
  ('delivery_timeout_seconds', '{"timeout": 15}'::jsonb, 'Timeout for notification delivery attempts'),
  ('quiet_hours_default', '{"start": "22:00", "end": "08:00", "timezone": "UTC"}'::jsonb, 'Default quiet hours for users')
ON CONFLICT (setting_key) DO NOTHING;

-- Add performance indexes for the notification system
CREATE INDEX IF NOT EXISTS idx_notification_preferences_active ON public.notification_preferences(user_id) WHERE signal_created = true OR signal_updated = true;
CREATE INDEX IF NOT EXISTS idx_notification_audit_trail_status ON public.notification_audit_trail(status, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_rate_limits_window ON public.notification_rate_limits(user_id, notification_type, window_start);

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
  'Phase 1 completed: Removed duplicate triggers, cleaned up old functions, enhanced notification pipeline is now the sole notification system'
);