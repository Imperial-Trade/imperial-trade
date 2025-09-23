-- CRITICAL FIX: Restore missing signal notification triggers
-- These triggers are essential for real-time signal notifications

-- Create the INSERT trigger for new signals (skip if exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'enhanced_signal_notification_pipeline_insert'
    ) THEN
        CREATE TRIGGER enhanced_signal_notification_pipeline_insert
        AFTER INSERT ON public.trade_alerts
        FOR EACH ROW EXECUTE FUNCTION public.enhanced_notification_pipeline();
    END IF;
END $$;

-- Create the UPDATE trigger for signal changes (skip if exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'enhanced_signal_notification_pipeline_update'
    ) THEN
        CREATE TRIGGER enhanced_signal_notification_pipeline_update  
        AFTER UPDATE ON public.trade_alerts
        FOR EACH ROW EXECUTE FUNCTION public.enhanced_notification_pipeline();
    END IF;
END $$;

-- Log the restoration
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES ('restore_signal_notifications_final', NOW(), 2, 'success', 'Successfully restored critical signal notification triggers: INSERT and UPDATE triggers created on trade_alerts table');