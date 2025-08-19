-- Clean up duplicate alert_monitoring entries (keeping only the most recent one per signal_id + alert_type)
DELETE FROM public.alert_monitoring a1
WHERE EXISTS (
    SELECT 1 FROM public.alert_monitoring a2 
    WHERE a2.signal_id = a1.signal_id 
    AND a2.alert_type = a1.alert_type 
    AND a2.created_at > a1.created_at
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE public.alert_monitoring 
ADD CONSTRAINT unique_signal_alert_type 
UNIQUE (signal_id, alert_type);

-- Add index for efficient price monitoring queries
CREATE INDEX IF NOT EXISTS idx_alert_monitoring_active_priority 
ON public.alert_monitoring (is_active, priority_level, symbol) 
WHERE is_active = true;

-- Enhanced process_price_alerts function with proper BUY/SELL logic
CREATE OR REPLACE FUNCTION public.process_price_alerts(p_symbol text, p_current_price numeric)
RETURNS TABLE(
    alert_id uuid, 
    signal_id uuid, 
    alert_type text, 
    target_price numeric, 
    triggered boolean,
    trade_direction text,
    signal_status text
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $function$
BEGIN
    -- Update current price for all active alerts of this symbol
    UPDATE public.alert_monitoring 
    SET 
        current_price = p_current_price, 
        last_checked_at = now()
    WHERE symbol = p_symbol AND is_active = true;
    
    -- Return triggered alerts with proper BUY/SELL logic
    RETURN QUERY
    SELECT 
        am.id as alert_id,
        am.signal_id,
        am.alert_type,
        am.target_price,
        CASE 
            -- Stop Loss Logic
            WHEN am.alert_type = 'stop_loss' THEN
                CASE 
                    WHEN ta.trade_type IN ('buy', 'buy_limit') THEN 
                        p_current_price <= am.target_price  -- BUY: SL hit when price drops to/below SL
                    WHEN ta.trade_type IN ('sell', 'sell_limit') THEN 
                        p_current_price >= am.target_price  -- SELL: SL hit when price rises to/above SL
                    ELSE false
                END
            -- Take Profit Logic  
            WHEN am.alert_type LIKE 'take_profit_%' THEN
                CASE 
                    WHEN ta.trade_type IN ('buy', 'buy_limit') THEN 
                        p_current_price >= am.target_price  -- BUY: TP hit when price rises to/above TP
                    WHEN ta.trade_type IN ('sell', 'sell_limit') THEN 
                        p_current_price <= am.target_price  -- SELL: TP hit when price drops to/below TP
                    ELSE false
                END
            ELSE false
        END as triggered,
        ta.trade_type as trade_direction,
        ta.status as signal_status
    FROM public.alert_monitoring am
    JOIN public.trade_alerts ta ON am.signal_id = ta.id
    WHERE am.symbol = p_symbol 
    AND am.is_active = true
    AND ta.status = 'active';
END;
$function$;

-- Function to handle triggered alerts and update signal status
CREATE OR REPLACE FUNCTION public.handle_triggered_alert(
    p_alert_id uuid,
    p_signal_id uuid, 
    p_alert_type text,
    p_triggered_price numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    tp_number integer;
    current_tp_hits integer[];
    result jsonb;
BEGIN
    -- Deactivate the triggered alert
    UPDATE public.alert_monitoring 
    SET is_active = false, updated_at = now()
    WHERE id = p_alert_id;
    
    -- Handle different alert types
    IF p_alert_type = 'stop_loss' THEN
        -- Close signal due to stop loss
        UPDATE public.trade_alerts
        SET 
            status = 'closed',
            close_reason = 'stop_loss',
            updated_at = now()
        WHERE id = p_signal_id;
        
        -- Deactivate all other alerts for this signal
        UPDATE public.alert_monitoring 
        SET is_active = false, updated_at = now()
        WHERE signal_id = p_signal_id AND is_active = true;
        
        result := jsonb_build_object(
            'action', 'signal_closed',
            'reason', 'stop_loss',
            'price', p_triggered_price
        );
        
    ELSIF p_alert_type LIKE 'take_profit_%' THEN
        -- Extract TP number
        tp_number := substring(p_alert_type from 'take_profit_(\d+)')::integer;
        
        -- Get current TP hits
        SELECT tp_hits INTO current_tp_hits 
        FROM public.trade_alerts 
        WHERE id = p_signal_id;
        
        -- Add this TP to hits if not already there
        IF NOT (tp_number = ANY(current_tp_hits)) THEN
            current_tp_hits := array_append(current_tp_hits, tp_number);
            
            UPDATE public.trade_alerts
            SET 
                tp_hits = current_tp_hits,
                updated_at = now()
            WHERE id = p_signal_id;
        END IF;
        
        result := jsonb_build_object(
            'action', 'tp_hit',
            'tp_level', tp_number,
            'price', p_triggered_price,
            'total_hits', array_length(current_tp_hits, 1)
        );
    END IF;
    
    -- Log the alert trigger
    INSERT INTO public.alert_notifications (
        alert_monitoring_id,
        signal_id,
        notification_type,
        target_price,
        triggered_price,
        delivery_status
    ) VALUES (
        p_alert_id,
        p_signal_id,
        p_alert_type,
        (SELECT target_price FROM public.alert_monitoring WHERE id = p_alert_id),
        p_triggered_price,
        '{"status": "triggered"}'::jsonb
    );
    
    RETURN result;
END;
$function$;