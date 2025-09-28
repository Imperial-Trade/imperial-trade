-- 🚨 EMERGENCY: Restore Signal Notification Triggers (v2)
-- Check and create triggers only if they don't exist

DO $$
BEGIN
    -- Check if INSERT trigger exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'enhanced_signal_notification_pipeline_insert' 
        AND event_object_table = 'trade_alerts'
    ) THEN
        CREATE TRIGGER enhanced_signal_notification_pipeline_insert
            AFTER INSERT ON public.trade_alerts
            FOR EACH ROW
            EXECUTE FUNCTION public.enhanced_notification_pipeline();
        RAISE NOTICE 'Created INSERT trigger for trade_alerts';
    ELSE
        RAISE NOTICE 'INSERT trigger already exists';
    END IF;

    -- Check if UPDATE trigger exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'enhanced_signal_notification_pipeline_update' 
        AND event_object_table = 'trade_alerts'
    ) THEN
        CREATE TRIGGER enhanced_signal_notification_pipeline_update
            AFTER UPDATE ON public.trade_alerts
            FOR EACH ROW
            EXECUTE FUNCTION public.enhanced_notification_pipeline();
        RAISE NOTICE 'Created UPDATE trigger for trade_alerts';
    ELSE
        RAISE NOTICE 'UPDATE trigger already exists';
    END IF;
END $$;