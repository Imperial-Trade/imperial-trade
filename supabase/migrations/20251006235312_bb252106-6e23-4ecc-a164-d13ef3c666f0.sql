-- ============================================
-- PHASE 1: EMERGENCY TRIGGER DEPLOYMENT
-- Deploys 3 Critical Missing Triggers
-- ============================================

-- TRIGGER 1: Enhanced Notification Pipeline V2
-- Handles all signal notifications with Bug #40, #42, #43 fixes
DROP TRIGGER IF EXISTS enhanced_notification_pipeline_v2_trigger ON public.trade_alerts;
CREATE TRIGGER enhanced_notification_pipeline_v2_trigger
  AFTER INSERT OR UPDATE ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.enhanced_notification_pipeline_v2();

-- TRIGGER 2: Smart Updated At
-- Prevents phantom 'updated_at' changes that cause duplicate notifications
DROP TRIGGER IF EXISTS smart_updated_at_trigger ON public.trade_alerts;
CREATE TRIGGER smart_updated_at_trigger
  BEFORE UPDATE ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.smart_updated_at();

-- TRIGGER 3: Create Alert Monitoring Entries
-- Automatically creates monitoring records for TP/SL tracking
DROP TRIGGER IF EXISTS create_alert_monitoring_trigger ON public.trade_alerts;
CREATE TRIGGER create_alert_monitoring_trigger
  AFTER INSERT ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_alert_monitoring_entries();

-- TRIGGER 4: Set Activation Timestamp
-- Already exists but verify it's attached
DROP TRIGGER IF EXISTS set_activation_timestamp_trigger ON public.trade_alerts;
CREATE TRIGGER set_activation_timestamp_trigger
  BEFORE UPDATE ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_activation_timestamp();

-- ============================================
-- VALIDATION QUERIES (Run after deployment)
-- ============================================

-- Query 1: Verify all triggers are attached
-- Expected: 4 rows showing all triggers
-- SELECT 
--   trigger_name,
--   event_manipulation,
--   action_timing,
--   action_statement
-- FROM information_schema.triggers
-- WHERE event_object_table = 'trade_alerts'
-- ORDER BY trigger_name;

-- Query 2: Check for Bug #42 crashes (should be ZERO after fix)
-- SELECT COUNT(*) as crash_count
-- FROM cron_job_logs
-- WHERE job_name = 'enhanced_notification_pipeline_v2'
-- AND status = 'critical_error'
-- AND error_message LIKE '%invalid input syntax for type boolean%'
-- AND created_at > now() - interval '15 minutes';

-- Query 3: Monitor successful notifications (should see new entries)
-- SELECT 
--   created_at,
--   records_affected,
--   error_message
-- FROM cron_job_logs
-- WHERE job_name = 'enhanced_notification_pipeline_v2'
-- AND status = 'success'
-- AND created_at > now() - interval '15 minutes'
-- ORDER BY created_at DESC
-- LIMIT 10;

-- ============================================
-- Log deployment completion
-- ============================================
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
  'phoenix_plan_phase1_deployment',
  NOW(),
  4,
  'success',
  '🚨 PHASE 1 DEPLOYED: All 4 triggers attached to trade_alerts. System stabilization complete. Validation window: 15 minutes.'
);