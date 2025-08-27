
-- Add partially_profited status to trade_alerts
ALTER TYPE trade_alert_status ADD VALUE 'partially_profited';

-- Add precision fields and priority handling to alert_monitoring
ALTER TABLE alert_monitoring 
ADD COLUMN IF NOT EXISTS priority_order INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS requires_bid_ask_precision BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS simultaneous_trigger_handled BOOLEAN DEFAULT false;

-- Update priority_order: SL = 1 (highest), TP = 2 (lower)
UPDATE alert_monitoring 
SET priority_order = 1 
WHERE alert_type = 'stop_loss';

UPDATE alert_monitoring 
SET priority_order = 2 
WHERE alert_type LIKE 'take_profit_%';

-- Create enhanced price alert processing function with SL priority logic
CREATE OR REPLACE FUNCTION public.process_price_alerts_enhanced(
    p_symbol text, 
    p_current_bid numeric, 
    p_current_ask numeric
)
RETURNS TABLE(
    alert_id uuid, 
    signal_id uuid, 
    alert_type text, 
    target_price numeric, 
    triggered boolean,
    priority_order integer,
    trade_direction text,
    trigger_price numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    sl_triggered BOOLEAN := false;
BEGIN
    -- Update current prices for all active alerts of this symbol
    UPDATE public.alert_monitoring 
    SET current_price = (p_current_bid + p_current_ask) / 2,
        last_checked_at = now()
    WHERE symbol = p_symbol AND is_active = true;
    
    -- First pass: Check if any Stop Loss is triggered
    SELECT EXISTS (
        SELECT 1
        FROM public.alert_monitoring am
        JOIN public.trade_alerts ta ON am.signal_id = ta.id
        WHERE am.symbol = p_symbol 
        AND am.is_active = true
        AND am.alert_type = 'stop_loss'
        AND ta.status = 'active'
        AND (
            (ta.trade_type IN ('buy', 'buy_limit') AND p_current_bid <= am.target_price) OR
            (ta.trade_type IN ('sell', 'sell_limit') AND p_current_ask >= am.target_price)
        )
    ) INTO sl_triggered;
    
    -- Return alerts that should trigger, prioritizing SL over TP
    RETURN QUERY
    SELECT 
        am.id as alert_id,
        am.signal_id,
        am.alert_type,
        am.target_price,
        CASE 
            -- Stop Loss Logic (Always check first)
            WHEN am.alert_type = 'stop_loss' THEN
                CASE 
                    WHEN ta.trade_type IN ('buy', 'buy_limit') THEN p_current_bid <= am.target_price
                    ELSE p_current_ask >= am.target_price
                END
            -- Take Profit Logic (Only if no SL triggered for this signal)
            WHEN am.alert_type LIKE 'take_profit_%' AND NOT sl_triggered THEN
                CASE 
                    WHEN ta.trade_type IN ('buy', 'buy_limit') THEN p_current_bid >= am.target_price
                    ELSE p_current_ask <= am.target_price
                END
            ELSE false
        END as triggered,
        am.priority_order,
        ta.trade_type as trade_direction,
        CASE 
            WHEN am.alert_type = 'stop_loss' THEN
                CASE WHEN ta.trade_type IN ('buy', 'buy_limit') THEN p_current_bid ELSE p_current_ask END
            ELSE
                CASE WHEN ta.trade_type IN ('buy', 'buy_limit') THEN p_current_bid ELSE p_current_ask END
        END as trigger_price
    FROM public.alert_monitoring am
    JOIN public.trade_alerts ta ON am.signal_id = ta.id
    WHERE am.symbol = p_symbol 
    AND am.is_active = true
    AND ta.status IN ('active', 'partially_profited')
    ORDER BY am.priority_order ASC, am.created_at ASC;
END;
$function$;

-- Enhanced alert handling with partial TP logic
CREATE OR REPLACE FUNCTION public.handle_triggered_alert_enhanced(
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
    result jsonb;
    tp_level integer;
    current_tp_hits integer[];
    total_tp_levels integer := 0;
    signal_record RECORD;
BEGIN
    -- Get current signal state
    SELECT * INTO signal_record 
    FROM trade_alerts 
    WHERE id = p_signal_id;
    
    -- Count total TP levels for this signal
    SELECT 
        CASE WHEN tp1 IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN tp2 IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN tp3 IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN tp4 IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN tp5 IS NOT NULL THEN 1 ELSE 0 END
    INTO total_tp_levels
    FROM trade_alerts 
    WHERE id = p_signal_id;
    
    -- Deactivate the triggered alert
    UPDATE alert_monitoring 
    SET is_active = false, 
        simultaneous_trigger_handled = true,
        updated_at = now()
    WHERE id = p_alert_id;
    
    -- Handle different alert types
    IF p_alert_type = 'stop_loss' THEN
        -- Close the signal immediately - SL has priority
        UPDATE trade_alerts 
        SET status = 'closed', 
            close_reason = 'stop_loss', 
            updated_at = now()
        WHERE id = p_signal_id;
        
        -- Deactivate ALL remaining alerts for this signal
        UPDATE alert_monitoring 
        SET is_active = false, updated_at = now()
        WHERE signal_id = p_signal_id AND is_active = true;
        
        result := jsonb_build_object(
            'action', 'signal_closed',
            'reason', 'stop_loss_hit',
            'triggered_price', p_triggered_price
        );
        
    ELSIF p_alert_type LIKE 'take_profit_%' THEN
        -- Extract TP level
        tp_level := CAST(substring(p_alert_type from 'take_profit_(\d+)') AS integer);
        current_tp_hits := COALESCE(signal_record.tp_hits, ARRAY[]::integer[]);
        
        -- Add to tp_hits array if not already present
        IF NOT (tp_level = ANY(current_tp_hits)) THEN
            current_tp_hits := array_append(current_tp_hits, tp_level);
        END IF;
        
        -- Check if this is the final TP or all TPs are now hit
        IF array_length(current_tp_hits, 1) >= total_tp_levels THEN
            -- All TPs hit - close the signal
            UPDATE trade_alerts 
            SET tp_hits = current_tp_hits,
                status = 'closed',
                close_reason = 'all_tps_hit',
                updated_at = now()
            WHERE id = p_signal_id;
            
            -- Deactivate remaining alerts
            UPDATE alert_monitoring 
            SET is_active = false, updated_at = now()
            WHERE signal_id = p_signal_id AND is_active = true;
            
            result := jsonb_build_object(
                'action', 'signal_closed',
                'reason', 'all_tps_hit',
                'tp_level', tp_level,
                'total_tps_hit', array_length(current_tp_hits, 1),
                'triggered_price', p_triggered_price
            );
        ELSE
            -- Partial TP hit - update status to partially_profited
            UPDATE trade_alerts 
            SET tp_hits = current_tp_hits,
                status = 'partially_profited',
                updated_at = now()
            WHERE id = p_signal_id;
            
            result := jsonb_build_object(
                'action', 'tp_partial_hit',
                'tp_level', tp_level,
                'total_tps_hit', array_length(current_tp_hits, 1),
                'remaining_tps', total_tp_levels - array_length(current_tp_hits, 1),
                'triggered_price', p_triggered_price
            );
        END IF;
        
    ELSE
        result := jsonb_build_object(
            'action', 'alert_processed',
            'alert_type', p_alert_type,
            'triggered_price', p_triggered_price
        );
    END IF;
    
    RETURN result;
END;
$function$;

-- Update market price upsert to handle bid/ask precision
CREATE OR REPLACE FUNCTION public.upsert_market_price_enhanced(
    p_symbol text, 
    p_bid numeric, 
    p_ask numeric, 
    p_mid numeric, 
    p_timestamp timestamp with time zone DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.market_prices (symbol, bid, ask, mid, timestamp)
    VALUES (p_symbol, p_bid, p_ask, p_mid, p_timestamp)
    ON CONFLICT (symbol) 
    DO UPDATE SET 
        bid = EXCLUDED.bid,
        ask = EXCLUDED.ask,
        mid = EXCLUDED.mid,
        timestamp = EXCLUDED.timestamp,
        updated_at = now();
        
    -- Trigger enhanced alert processing with precise bid/ask
    PERFORM process_price_alerts_enhanced(p_symbol, p_bid, p_ask);
END;
$function$;
