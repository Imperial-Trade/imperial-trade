-- Create priority alert monitoring system for zero-delay TP/SL alerts

-- Create alert monitoring table to track active signals
CREATE TABLE public.alert_monitoring (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    signal_id UUID NOT NULL REFERENCES public.trade_alerts(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('stop_loss', 'take_profit_1', 'take_profit_2', 'take_profit_3', 'take_profit_4', 'take_profit_5', 'entry')),
    target_price DECIMAL(20,8) NOT NULL,
    current_price DECIMAL(20,8),
    last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    priority_level INTEGER DEFAULT 1 CHECK (priority_level BETWEEN 1 AND 3), -- 1=highest (SL), 2=high (TP), 3=normal (entry)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on alert monitoring table
ALTER TABLE public.alert_monitoring ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for alert monitoring
CREATE POLICY "Users can view their own alert monitoring" 
ON public.alert_monitoring 
FOR SELECT 
USING (auth.uid() IN (
    SELECT user_id FROM public.trade_alerts WHERE id = signal_id
));

CREATE POLICY "System can manage all alert monitoring" 
ON public.alert_monitoring 
FOR ALL 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_alert_monitoring_symbol ON public.alert_monitoring(symbol);
CREATE INDEX idx_alert_monitoring_active ON public.alert_monitoring(is_active) WHERE is_active = true;
CREATE INDEX idx_alert_monitoring_priority ON public.alert_monitoring(priority_level, target_price);
CREATE INDEX idx_alert_monitoring_signal_id ON public.alert_monitoring(signal_id);

-- Create alert notifications table for tracking sent alerts
CREATE TABLE public.alert_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    alert_monitoring_id UUID NOT NULL REFERENCES public.alert_monitoring(id) ON DELETE CASCADE,
    signal_id UUID NOT NULL REFERENCES public.trade_alerts(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('stop_loss_hit', 'take_profit_hit', 'entry_triggered', 'price_approaching')),
    target_price DECIMAL(20,8) NOT NULL,
    triggered_price DECIMAL(20,8) NOT NULL,
    delivery_channels TEXT[] DEFAULT '{}', -- realtime, discord, telegram, push
    delivery_status JSONB DEFAULT '{}',
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on alert notifications
ALTER TABLE public.alert_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for alert notifications
CREATE POLICY "Users can view their own alert notifications" 
ON public.alert_notifications 
FOR SELECT 
USING (auth.uid() IN (
    SELECT user_id FROM public.trade_alerts WHERE id = signal_id
));

-- Create function to automatically create alert monitoring entries when signals are created
CREATE OR REPLACE FUNCTION public.create_alert_monitoring_entries()
RETURNS TRIGGER AS $$
BEGIN
    -- Create stop loss monitoring
    INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level)
    VALUES (NEW.id, NEW.finnhub_symbol, 'stop_loss', NEW.stop_loss, 1);
    
    -- Create take profit monitoring entries
    IF NEW.tp1 IS NOT NULL THEN
        INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level)
        VALUES (NEW.id, NEW.finnhub_symbol, 'take_profit_1', NEW.tp1, 2);
    END IF;
    
    IF NEW.tp2 IS NOT NULL THEN
        INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level)
        VALUES (NEW.id, NEW.finnhub_symbol, 'take_profit_2', NEW.tp2, 2);
    END IF;
    
    IF NEW.tp3 IS NOT NULL THEN
        INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level)
        VALUES (NEW.id, NEW.finnhub_symbol, 'take_profit_3', NEW.tp3, 2);
    END IF;
    
    IF NEW.tp4 IS NOT NULL THEN
        INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level)
        VALUES (NEW.id, NEW.finnhub_symbol, 'take_profit_4', NEW.tp4, 2);
    END IF;
    
    IF NEW.tp5 IS NOT NULL THEN
        INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level)
        VALUES (NEW.id, NEW.finnhub_symbol, 'take_profit_5', NEW.tp5, 2);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create monitoring entries
CREATE TRIGGER trigger_create_alert_monitoring
    AFTER INSERT ON public.trade_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.create_alert_monitoring_entries();

-- Create function to deactivate alerts when signal is closed
CREATE OR REPLACE FUNCTION public.deactivate_alert_monitoring()
RETURNS TRIGGER AS $$
BEGIN
    -- Deactivate all monitoring for closed signals
    IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
        UPDATE public.alert_monitoring 
        SET is_active = false, updated_at = now()
        WHERE signal_id = NEW.id;
    END IF;
    
    -- Deactivate specific TP monitoring when TP is hit
    IF NEW.tp_hits IS DISTINCT FROM OLD.tp_hits THEN
        -- Check which TPs were newly hit
        IF array_length(NEW.tp_hits, 1) > COALESCE(array_length(OLD.tp_hits, 1), 0) THEN
            -- Get the newly hit TPs
            DECLARE
                new_tp_hits INTEGER[];
                tp_num INTEGER;
            BEGIN
                new_tp_hits := ARRAY(SELECT unnest(NEW.tp_hits) EXCEPT SELECT unnest(COALESCE(OLD.tp_hits, '{}'::INTEGER[])));
                
                FOREACH tp_num IN ARRAY new_tp_hits
                LOOP
                    UPDATE public.alert_monitoring 
                    SET is_active = false, updated_at = now()
                    WHERE signal_id = NEW.id 
                    AND alert_type = 'take_profit_' || tp_num;
                END LOOP;
            END;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to deactivate monitoring
CREATE TRIGGER trigger_deactivate_alert_monitoring
    AFTER UPDATE ON public.trade_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.deactivate_alert_monitoring();

-- Create function to process price alerts
CREATE OR REPLACE FUNCTION public.process_price_alerts(
    p_symbol TEXT,
    p_current_price DECIMAL(20,8)
)
RETURNS TABLE (
    alert_id UUID,
    signal_id UUID,
    alert_type TEXT,
    target_price DECIMAL(20,8),
    triggered BOOLEAN
) AS $$
BEGIN
    -- Update current price for all active alerts of this symbol
    UPDATE public.alert_monitoring 
    SET current_price = p_current_price, 
        last_checked_at = now()
    WHERE symbol = p_symbol AND is_active = true;
    
    -- Return alerts that should trigger
    RETURN QUERY
    SELECT 
        am.id as alert_id,
        am.signal_id,
        am.alert_type,
        am.target_price,
        CASE 
            WHEN am.alert_type = 'stop_loss' THEN
                CASE 
                    WHEN ta.trade_type IN ('buy', 'buy_limit') THEN p_current_price <= am.target_price
                    ELSE p_current_price >= am.target_price
                END
            WHEN am.alert_type LIKE 'take_profit_%' THEN
                CASE 
                    WHEN ta.trade_type IN ('buy', 'buy_limit') THEN p_current_price >= am.target_price
                    ELSE p_current_price <= am.target_price
                END
            ELSE false
        END as triggered
    FROM public.alert_monitoring am
    JOIN public.trade_alerts ta ON am.signal_id = ta.id
    WHERE am.symbol = p_symbol 
    AND am.is_active = true
    AND ta.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create updated_at trigger for alert_monitoring
CREATE TRIGGER update_alert_monitoring_updated_at
    BEFORE UPDATE ON public.alert_monitoring
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add realtime for instant notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.alert_monitoring;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alert_notifications;