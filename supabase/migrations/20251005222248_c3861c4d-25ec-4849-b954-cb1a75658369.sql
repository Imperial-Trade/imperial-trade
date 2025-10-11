-- ============================================================================
-- PHASE 3: EMERGENCY FIX - Remove Triple Trigger Firing
-- ============================================================================
-- This migration removes duplicate notification triggers that cause 3x notifications
-- Only enhanced_signal_notification_trigger_v2 will remain active

-- Drop OLD duplicate triggers that fire on trade_alerts
DROP TRIGGER IF EXISTS enhanced_signal_notification_pipeline_insert ON public.trade_alerts;
DROP TRIGGER IF EXISTS enhanced_signal_notification_pipeline_update ON public.trade_alerts;

-- Verify: Only V2 trigger should remain active
-- enhanced_signal_notification_trigger_v2 is the ONLY notification trigger

-- ============================================================================
-- Add trigger execution monitoring for debugging
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trigger_execution_log (
  id BIGSERIAL PRIMARY KEY,
  trigger_name TEXT NOT NULL,
  signal_id UUID NOT NULL,
  execution_time TIMESTAMPTZ DEFAULT NOW(),
  trigger_operation TEXT NOT NULL, -- INSERT or UPDATE
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_trigger_execution_log_signal_id ON public.trigger_execution_log(signal_id);
CREATE INDEX IF NOT EXISTS idx_trigger_execution_log_execution_time ON public.trigger_execution_log(execution_time DESC);

-- Enable RLS on trigger_execution_log
ALTER TABLE public.trigger_execution_log ENABLE ROW LEVEL SECURITY;

-- Admins can view trigger execution logs
CREATE POLICY "Admins can view trigger logs" ON public.trigger_execution_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.access_level = 'admin'::access_level_enum
    )
  );

-- System can insert trigger execution logs
CREATE POLICY "System can insert trigger logs" ON public.trigger_execution_log
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- Logging function to track every trigger execution
-- ============================================================================

CREATE OR REPLACE FUNCTION log_trigger_execution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.trigger_execution_log (trigger_name, signal_id, trigger_operation)
  VALUES (TG_NAME, NEW.id, TG_OP);
  RETURN NEW;
END;
$$;

-- Add logging to V2 trigger (runs BEFORE the notification trigger)
DROP TRIGGER IF EXISTS log_notification_trigger_v2 ON public.trade_alerts;
CREATE TRIGGER log_notification_trigger_v2
  BEFORE INSERT OR UPDATE ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION log_trigger_execution();

-- ============================================================================
-- Verification Query (for admins to run after migration)
-- ============================================================================
-- To verify only one notification trigger is active, run:
-- 
-- SELECT tgname, tgenabled 
-- FROM pg_trigger t
-- JOIN pg_class c ON t.tgrelid = c.oid
-- WHERE c.relname = 'trade_alerts'
-- AND tgname LIKE '%notification%'
-- ORDER BY tgname;
--
-- Expected result: Only 'enhanced_signal_notification_trigger_v2' with tgenabled = 'O'
-- ============================================================================

-- Log migration completion
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
  'phase3_migration',
  NOW(),
  2,
  'success',
  'Phase 3: Removed duplicate notification triggers (enhanced_signal_notification_pipeline_insert, enhanced_signal_notification_pipeline_update). Only V2 trigger remains.'
);