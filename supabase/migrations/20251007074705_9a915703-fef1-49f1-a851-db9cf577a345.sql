-- ============================================
-- EMERGENCY FIX: Drop ALL triggers and recreate ONLY Phoenix Plan triggers
-- Current State: 13 triggers (massive duplication)
-- Target State: 4 triggers (Phoenix Plan only)
-- ============================================

-- DROP ALL EXISTING TRIGGERS (both old and Phoenix)
DROP TRIGGER IF EXISTS create_alert_monitoring_on_insert ON public.trade_alerts;
DROP TRIGGER IF EXISTS create_alert_monitoring_trigger ON public.trade_alerts;
DROP TRIGGER IF EXISTS trigger_create_alert_monitoring ON public.trade_alerts;
DROP TRIGGER IF EXISTS set_activation_timestamp_trigger ON public.trade_alerts;
DROP TRIGGER IF EXISTS trigger_set_activation_timestamp ON public.trade_alerts;
DROP TRIGGER IF EXISTS smart_updated_at_trigger ON public.trade_alerts;
DROP TRIGGER IF EXISTS update_trade_alerts_updated_at ON public.trade_alerts;
DROP TRIGGER IF EXISTS deactivate_alert_monitoring_trigger ON public.trade_alerts;
DROP TRIGGER IF EXISTS trigger_deactivate_alert_monitoring ON public.trade_alerts;
DROP TRIGGER IF EXISTS enhanced_notification_pipeline_v2_trigger ON public.trade_alerts;
DROP TRIGGER IF EXISTS log_notification_trigger_v2 ON public.trade_alerts;
DROP TRIGGER IF EXISTS prevent_active_trade_modifications_trigger ON public.trade_alerts;
DROP TRIGGER IF EXISTS trg_set_trade_alert_user_id ON public.trade_alerts;

-- CREATE ONLY THE 4 PHOENIX PLAN TRIGGERS
CREATE TRIGGER enhanced_notification_pipeline_v2_trigger
  AFTER INSERT OR UPDATE ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.enhanced_notification_pipeline_v2();

CREATE TRIGGER smart_updated_at_trigger
  BEFORE UPDATE ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.smart_updated_at();

CREATE TRIGGER create_alert_monitoring_trigger
  AFTER INSERT ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_alert_monitoring_entries();

CREATE TRIGGER set_activation_timestamp_trigger
  BEFORE UPDATE ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_activation_timestamp();

-- Log recovery
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
  'phoenix_trigger_cleanup_final',
  NOW(),
  4,
  'success',
  '✅ CLEANED 13 duplicate triggers → Created 4 Phoenix Plan triggers. System restored.'
);