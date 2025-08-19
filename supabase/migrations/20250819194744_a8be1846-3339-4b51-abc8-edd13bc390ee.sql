-- Fix the create_alert_monitoring_entries function to prevent duplicates
CREATE OR REPLACE FUNCTION public.create_alert_monitoring_entries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Create stop loss monitoring (use ON CONFLICT DO NOTHING to prevent duplicates)
    INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level)
    VALUES (NEW.id, NEW.tradermade_symbol, 'stop_loss', NEW.stop_loss, 1)
    ON CONFLICT (signal_id, alert_type) DO NOTHING;
    
    -- Create take profit monitoring entries
    IF NEW.tp1 IS NOT NULL THEN
        INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level)
        VALUES (NEW.id, NEW.tradermade_symbol, 'take_profit_1', NEW.tp1, 2)
        ON CONFLICT (signal_id, alert_type) DO NOTHING;
    END IF;
    
    IF NEW.tp2 IS NOT NULL THEN
        INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level)
        VALUES (NEW.id, NEW.tradermade_symbol, 'take_profit_2', NEW.tp2, 2)
        ON CONFLICT (signal_id, alert_type) DO NOTHING;
    END IF;
    
    IF NEW.tp3 IS NOT NULL THEN
        INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level)
        VALUES (NEW.id, NEW.tradermade_symbol, 'take_profit_3', NEW.tp3, 2)
        ON CONFLICT (signal_id, alert_type) DO NOTHING;
    END IF;
    
    IF NEW.tp4 IS NOT NULL THEN
        INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level)
        VALUES (NEW.id, NEW.tradermade_symbol, 'take_profit_4', NEW.tp4, 2)
        ON CONFLICT (signal_id, alert_type) DO NOTHING;
    END IF;
    
    IF NEW.tp5 IS NOT NULL THEN
        INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level)
        VALUES (NEW.id, NEW.tradermade_symbol, 'take_profit_5', NEW.tp5, 2)
        ON CONFLICT (signal_id, alert_type) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Remove any duplicate triggers and ensure only one exists
DROP TRIGGER IF EXISTS create_alert_monitoring_on_insert ON public.trade_alerts;
DROP TRIGGER IF EXISTS alert_monitoring_trigger ON public.trade_alerts;
DROP TRIGGER IF EXISTS create_monitoring_entries ON public.trade_alerts;

-- Create the single trigger
CREATE TRIGGER create_alert_monitoring_on_insert
    AFTER INSERT ON public.trade_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.create_alert_monitoring_entries();

-- Clean up any orphaned alert monitoring entries
DELETE FROM public.alert_monitoring 
WHERE signal_id NOT IN (SELECT id FROM public.trade_alerts);

-- Log the cleanup
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
    'fix_alert_monitoring_duplicates', 
    NOW(), 
    (SELECT COUNT(*) FROM public.alert_monitoring), 
    'success',
    'Fixed duplicate alert monitoring creation and cleaned up orphaned entries'
);