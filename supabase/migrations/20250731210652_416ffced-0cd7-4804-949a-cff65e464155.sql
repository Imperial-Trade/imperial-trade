-- Fix trigger function to use tradermade_symbol instead of finnhub_symbol
CREATE OR REPLACE FUNCTION public.create_alert_monitoring_entries()
RETURNS TRIGGER AS $$
BEGIN
    -- Create stop loss monitoring
    INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level)
    VALUES (NEW.id, NEW.tradermade_symbol, 'stop_loss', NEW.stop_loss, 1);
    
    -- Create take profit monitoring entries
    IF NEW.tp1 IS NOT NULL THEN
        INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level)
        VALUES (NEW.id, NEW.tradermade_symbol, 'take_profit_1', NEW.tp1, 2);
    END IF;
    
    IF NEW.tp2 IS NOT NULL THEN
        INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level)
        VALUES (NEW.id, NEW.tradermade_symbol, 'take_profit_2', NEW.tp2, 2);
    END IF;
    
    IF NEW.tp3 IS NOT NULL THEN
        INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level)
        VALUES (NEW.id, NEW.tradermade_symbol, 'take_profit_3', NEW.tp3, 2);
    END IF;
    
    IF NEW.tp4 IS NOT NULL THEN
        INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level)
        VALUES (NEW.id, NEW.tradermade_symbol, 'take_profit_4', NEW.tp4, 2);
    END IF;
    
    IF NEW.tp5 IS NOT NULL THEN
        INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level)
        VALUES (NEW.id, NEW.tradermade_symbol, 'take_profit_5', NEW.tp5, 2);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;