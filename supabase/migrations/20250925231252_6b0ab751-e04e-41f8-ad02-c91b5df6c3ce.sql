-- PHASE 2: CRITICAL FIX - Enforce Sequential Take Profit Processing
-- This function MUST enforce strict TP1 → TP2 → TP3 → TP4 → TP5 sequence to prevent simultaneous TP hits

CREATE OR REPLACE FUNCTION public.process_tp_hits_sequential(
    p_trade_id uuid, 
    p_current_price numeric, 
    p_is_buy boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    trade_record RECORD;
    tp_prices NUMERIC[];
    existing_tp_hits INTEGER[];
    new_tp_hits INTEGER[];
    total_tps INTEGER;
    hit_count INTEGER;
    next_tp_to_check INTEGER;
    result JSONB;
    precision_buffer NUMERIC := 0.00005; -- 0.005% buffer for precision
BEGIN
    -- Get trade record with row-level locking to prevent race conditions
    SELECT * INTO trade_record
    FROM public.trade_alerts
    WHERE id = p_trade_id AND status = 'active'
    FOR UPDATE; -- Critical: Lock row to prevent concurrent updates
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Trade not found or not active');
    END IF;
    
    -- Initialize variables
    existing_tp_hits := COALESCE(trade_record.tp_hits, ARRAY[]::INTEGER[]);
    new_tp_hits := existing_tp_hits; -- Start with existing hits
    
    -- Build TP array
    tp_prices := ARRAY[
        trade_record.tp1, trade_record.tp2, trade_record.tp3, 
        trade_record.tp4, trade_record.tp5
    ];
    
    total_tps := 0;
    hit_count := array_length(existing_tp_hits, 1);
    hit_count := COALESCE(hit_count, 0);
    
    -- Count total TPs defined
    FOR i IN 1..5 LOOP
        IF tp_prices[i] IS NOT NULL AND tp_prices[i] > 0 THEN
            total_tps := total_tps + 1;
        END IF;
    END LOOP;
    
    -- CRITICAL: Enforce sequential TP processing
    -- Find the next TP that should be checked (first one not hit yet)
    next_tp_to_check := 0;
    FOR i IN 1..5 LOOP
        IF tp_prices[i] IS NOT NULL AND tp_prices[i] > 0 THEN
            -- Check if this TP is already hit
            IF NOT (i = ANY(existing_tp_hits)) THEN
                next_tp_to_check := i;
                EXIT; -- Only check the NEXT sequential TP
            END IF;
        END IF;
    END LOOP;
    
    -- If we found a next TP to check, validate it
    if next_tp_to_check > 0 THEN
        DECLARE
            should_hit BOOLEAN := false;
            price_buffer NUMERIC := tp_prices[next_tp_to_check] * precision_buffer;
        BEGIN
            -- Check if the next TP should be hit
            IF p_is_buy THEN
                -- For BUY: TP hits when current price >= TP target
                should_hit := p_current_price >= (tp_prices[next_tp_to_check] - price_buffer);
            ELSE
                -- For SELL: TP hits when current price <= TP target
                should_hit := p_current_price <= (tp_prices[next_tp_to_check] + price_buffer);
            END IF;
            
            -- Additional validation: ensure we're moving in the right direction
            IF p_is_buy AND p_current_price < trade_record.entry_price THEN
                should_hit := false; -- BUY signal should not hit TP if price is below entry
            ELSIF NOT p_is_buy AND p_current_price > trade_record.entry_price THEN
                should_hit := false; -- SELL signal should not hit TP if price is above entry
            END IF;
            
            IF should_hit THEN
                -- Add the TP hit
                new_tp_hits := array_append(new_tp_hits, next_tp_to_check);
                hit_count := hit_count + 1;
                
                -- Log TP hit for audit trail
                INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
                VALUES (
                    'tp_hit_processor_sequential', 
                    NOW(), 
                    1, 
                    'success',
                    format('SEQUENTIAL TP%s hit for signal %s - Price: %s, Target: %s, Trade: %s %s', 
                        next_tp_to_check, p_trade_id, p_current_price, tp_prices[next_tp_to_check], 
                        CASE WHEN p_is_buy THEN 'BUY' ELSE 'SELL' END,
                        trade_record.asset_name)
                );
            END IF;
        END;
    END IF;
    
    -- Update database if TP hits changed
    IF array_length(new_tp_hits, 1) != array_length(existing_tp_hits, 1) THEN
        UPDATE public.trade_alerts 
        SET tp_hits = new_tp_hits,
            updated_at = now()
        WHERE id = p_trade_id;
        
        IF NOT FOUND THEN
            RETURN jsonb_build_object('error', 'Failed to update TP hits');
        END IF;
    END IF;
    
    result := jsonb_build_object(
        'tp_hit_this_cycle', CASE WHEN next_tp_to_check > 0 AND next_tp_to_check = ANY(new_tp_hits) AND NOT (next_tp_to_check = ANY(existing_tp_hits)) THEN ARRAY[next_tp_to_check] ELSE ARRAY[]::INTEGER[] END,
        'total_tps_hit', hit_count,
        'total_tps_defined', total_tps,
        'all_tps_hit', (total_tps > 0 AND hit_count = total_tps),
        'next_tp_to_check', next_tp_to_check,
        'tp_hits_array', new_tp_hits,
        'sequential_processing', true,
        'current_price', p_current_price,
        'entry_price', trade_record.entry_price,
        'trade_type', CASE WHEN p_is_buy THEN 'BUY' ELSE 'SELL' END
    );
    
    RETURN result;
EXCEPTION WHEN OTHERS THEN
    -- Log any errors
    INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
    VALUES (
        'tp_hit_processor_sequential', 
        NOW(), 
        0, 
        'error',
        format('Sequential TP processing error for signal %s: %s', p_trade_id, SQLERRM)
    );
    
    RETURN jsonb_build_object(
        'error', SQLERRM,
        'tp_hit_this_cycle', ARRAY[]::INTEGER[],
        'total_tps_hit', 0,
        'total_tps_defined', 0,
        'all_tps_hit', false,
        'sequential_processing', true
    );
END;
$function$;

-- PHASE 4: CRITICAL FIX - Enhanced price alert processing with Stop Loss priority
CREATE OR REPLACE FUNCTION public.process_price_alerts_enhanced_v2(
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
    priority_level integer
) 
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
                    WHEN ta.trade_type IN ('buy', 'buy_limit') THEN p_current_bid <= am.target_price
                    ELSE p_current_bid >= am.target_price
                END
            WHEN am.alert_type LIKE 'take_profit_%' THEN
                CASE 
                    WHEN ta.trade_type IN ('buy', 'buy_limit') THEN p_current_ask >= am.target_price
                    ELSE p_current_ask <= am.target_price
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