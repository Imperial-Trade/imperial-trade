-- Check if notification triggers exist with different query
SELECT tgname as trigger_name, 
       tgtype,
       tgenabled,
       pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger 
WHERE tgrelid = 'public.trade_alerts'::regclass 
AND NOT tgisinternal
ORDER BY tgname;

-- If no triggers found, create them
DO $$
BEGIN
    -- Check if triggers exist, if not create them
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'enhanced_signal_notification_pipeline_insert' 
        AND tgrelid = 'public.trade_alerts'::regclass
    ) THEN
        CREATE TRIGGER enhanced_signal_notification_pipeline_insert
          AFTER INSERT ON public.trade_alerts
          FOR EACH ROW
          EXECUTE FUNCTION public.enhanced_notification_pipeline();
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'enhanced_signal_notification_pipeline_update' 
        AND tgrelid = 'public.trade_alerts'::regclass
    ) THEN
        CREATE TRIGGER enhanced_signal_notification_pipeline_update
          AFTER UPDATE ON public.trade_alerts
          FOR EACH ROW
          EXECUTE FUNCTION public.enhanced_notification_pipeline();
    END IF;
END $$;