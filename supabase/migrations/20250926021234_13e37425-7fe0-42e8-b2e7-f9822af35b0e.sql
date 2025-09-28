-- Emergency Phase 1.5: Disable Duplicate Triggers
-- This migration disables old notification triggers to prevent duplicates

-- Drop old conflicting triggers if they exist
DROP TRIGGER IF EXISTS enhanced_signal_notification_trigger ON public.trade_alerts;
DROP TRIGGER IF EXISTS signal_notification_trigger ON public.trade_alerts;
DROP TRIGGER IF EXISTS trade_alert_notification_trigger ON public.trade_alerts;

-- Ensure only the v2 trigger remains active
-- Verify the v2 trigger exists and is properly configured
DO $$
BEGIN
    -- Check if the v2 trigger exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'enhanced_signal_notification_trigger_v2'
        AND tgrelid = 'public.trade_alerts'::regclass
    ) THEN
        -- Create the v2 trigger if it doesn't exist
        CREATE TRIGGER enhanced_signal_notification_trigger_v2
            AFTER INSERT OR UPDATE ON public.trade_alerts
            FOR EACH ROW
            EXECUTE FUNCTION public.enhanced_notification_pipeline();
    END IF;
END $$;

-- Log the cleanup action
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
    'emergency_trigger_cleanup', 
    NOW(), 
    3, 
    'success',
    'Emergency cleanup: Disabled 3 duplicate notification triggers, kept only v2 trigger active'
);