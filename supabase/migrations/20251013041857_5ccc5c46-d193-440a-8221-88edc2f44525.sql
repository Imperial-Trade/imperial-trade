-- BUG #7 FIX: Correct SELL Stop Loss to use ASK price instead of BID
-- This fixes the critical bug where SELL signals were using the wrong price for stop loss validation

CREATE OR REPLACE FUNCTION public.process_price_alerts_enhanced_v2(p_symbol text, p_current_bid numeric, p_current_ask numeric)
 RETURNS TABLE(alert_id uuid, signal_id uuid, alert_type text, target_price numeric, triggered boolean, priority_level integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Update current prices for all active alerts of this symbol
    UPDATE public.alert_monitoring 
    SET current_price = (p_current_bid + p_current_ask) / 2, 
        last_checked_at = now()
    WHERE symbol = p_symbol AND is_active = true;
    
    -- Return alerts that should trigger, with STOP LOSS PRIORITY
    RETURN QUERY
    SELECT 
        am.id as alert_id,
        am.signal_id,
        am.alert_type,
        am.target_price,
        CASE 
            WHEN am.alert_type = 'stop_loss' THEN
                CASE 
                    -- BUY signals: SL triggers when BID price falls below stop loss
                    WHEN ta.trade_type IN ('buy', 'buy_limit') THEN p_current_bid <= am.target_price
                    -- BUG #7 FIX: SELL signals: SL triggers when ASK price rises above stop loss
                    -- CRITICAL: Changed from p_current_bid to p_current_ask for SELL signals
                    ELSE p_current_ask >= am.target_price
                END
            WHEN am.alert_type LIKE 'take_profit_%' THEN
                CASE 
                    WHEN ta.trade_type IN ('buy', 'buy_limit') THEN p_current_ask >= am.target_price
                    ELSE p_current_bid <= am.target_price
                END
            ELSE false
        END as triggered,
        -- CRITICAL: Stop Loss gets highest priority (3), Take Profits get priority 2
        CASE 
            WHEN am.alert_type = 'stop_loss' THEN 3
            WHEN am.alert_type LIKE 'take_profit_%' THEN 2
            ELSE 1
        END as priority_level
    FROM public.alert_monitoring am
    JOIN public.trade_alerts ta ON am.signal_id = ta.id
    WHERE am.symbol = p_symbol 
    AND am.is_active = true
    AND ta.status = 'active'
    ORDER BY 
        -- CRITICAL: Process Stop Loss alerts FIRST
        CASE WHEN am.alert_type = 'stop_loss' THEN 1 ELSE 2 END,
        am.priority_level DESC;
END;
$function$;