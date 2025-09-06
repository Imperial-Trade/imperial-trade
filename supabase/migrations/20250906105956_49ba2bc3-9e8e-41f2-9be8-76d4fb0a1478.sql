-- CRITICAL: Clean up stale market data immediately (XAUUSD 8+ days old, EURUSD 19+ days old)
DELETE FROM public.market_prices 
WHERE updated_at < NOW() - INTERVAL '1 hour';

-- Continue fixing critical function search_path security issues for core business logic
CREATE OR REPLACE FUNCTION public.system_update_trade_alert(
  p_signal_id uuid, 
  p_status text DEFAULT NULL::text, 
  p_tp_hits integer[] DEFAULT NULL::integer[], 
  p_close_reason text DEFAULT NULL::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Set system operation flag
  PERFORM set_config('app.system_operation', 'true', true);
  
  -- Update the trade alert
  UPDATE public.trade_alerts 
  SET 
    status = COALESCE(p_status, status),
    tp_hits = COALESCE(p_tp_hits, tp_hits),
    close_reason = COALESCE(p_close_reason, close_reason),
    updated_at = now()
  WHERE id = p_signal_id;
  
  -- Reset system operation flag
  PERFORM set_config('app.system_operation', 'false', true);
  
  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_triggered_alert_enhanced(
  p_alert_id uuid, 
  p_signal_id uuid, 
  p_alert_type text, 
  p_triggered_price numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
    FROM public.trade_alerts 
    WHERE id = p_signal_id;
    
    -- Count total TP levels for this signal
    SELECT 
        CASE WHEN tp1 IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN tp2 IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN tp3 IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN tp4 IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN tp5 IS NOT NULL THEN 1 ELSE 0 END
    INTO total_tp_levels
    FROM public.trade_alerts 
    WHERE id = p_signal_id;
    
    -- Deactivate the triggered alert
    UPDATE public.alert_monitoring 
    SET is_active = false, 
        simultaneous_trigger_handled = true,
        updated_at = now()
    WHERE id = p_alert_id;
    
    -- Handle different alert types
    IF p_alert_type = 'stop_loss' THEN
        -- Close the signal immediately - SL has priority
        UPDATE public.trade_alerts 
        SET status = 'closed', 
            close_reason = 'stop_loss', 
            updated_at = now()
        WHERE id = p_signal_id;
        
        -- Deactivate ALL remaining alerts for this signal
        UPDATE public.alert_monitoring 
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
            UPDATE public.trade_alerts 
            SET tp_hits = current_tp_hits,
                status = 'closed',
                close_reason = 'all_tps_hit',
                updated_at = now()
            WHERE id = p_signal_id;
            
            -- Deactivate remaining alerts
            UPDATE public.alert_monitoring 
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
            UPDATE public.trade_alerts 
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