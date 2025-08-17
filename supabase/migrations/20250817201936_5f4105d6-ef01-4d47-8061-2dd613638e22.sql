-- Fix the process_tp_hits RPC function to properly sync tp_hits array and add safeguards
CREATE OR REPLACE FUNCTION public.process_tp_hits(p_trade_id uuid, p_current_price numeric, p_is_buy boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    trade_record RECORD;
    current_mask INTEGER;
    new_mask INTEGER;
    tp_prices NUMERIC[];
    tp_hit_this_cycle INTEGER[];
    existing_tp_hits INTEGER[];
    new_tp_hits INTEGER[];
    total_tps INTEGER;
    hit_count INTEGER;
    result JSONB;
    price_movement_threshold NUMERIC := 0.0001; -- 0.01% minimum movement
BEGIN
    -- Get trade record
    SELECT * INTO trade_record
    FROM public.trade_alerts
    WHERE id = p_trade_id AND status = 'active';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Trade not found or not active');
    END IF;
    
    -- Safeguard: Don't process TPs for signals created in the last 30 seconds unless significant price movement
    IF trade_record.created_at > now() - interval '30 seconds' THEN
        -- Calculate minimum required price movement (0.01% of entry price)
        DECLARE
            min_movement NUMERIC := trade_record.entry_price * price_movement_threshold;
            actual_movement NUMERIC := ABS(p_current_price - trade_record.entry_price);
        BEGIN
            IF actual_movement < min_movement THEN
                RETURN jsonb_build_object(
                    'tp_hits_this_cycle', ARRAY[]::INTEGER[],
                    'total_tps_hit', 0,
                    'total_tps_defined', 0,
                    'all_tps_hit', false,
                    'mask_updated', false,
                    'skipped_reason', 'Signal too new without significant price movement'
                );
            END IF;
        END;
    END IF;
    
    current_mask := COALESCE(trade_record.tp_hit_mask, 0);
    new_mask := current_mask;
    tp_hit_this_cycle := ARRAY[]::INTEGER[];
    existing_tp_hits := COALESCE(trade_record.tp_hits, ARRAY[]::INTEGER[]);
    
    -- Build TP array and check hits
    tp_prices := ARRAY[
        trade_record.tp1, trade_record.tp2, trade_record.tp3, 
        trade_record.tp4, trade_record.tp5
    ];
    
    total_tps := 0;
    hit_count := 0;
    new_tp_hits := existing_tp_hits; -- Start with existing hits
    
    FOR i IN 1..5 LOOP
        IF tp_prices[i] IS NOT NULL AND tp_prices[i] > 0 THEN
            total_tps := total_tps + 1;
            
            -- Check if already hit (either in mask or array)
            IF (current_mask & (1 << (i-1))) > 0 OR i = ANY(existing_tp_hits) THEN
                hit_count := hit_count + 1;
                -- Ensure it's in the tp_hits array
                IF NOT (i = ANY(new_tp_hits)) THEN
                    new_tp_hits := array_append(new_tp_hits, i);
                END IF;
                CONTINUE;
            END IF;
            
            -- Check if should hit now
            IF (p_is_buy AND p_current_price >= tp_prices[i]) OR 
               (NOT p_is_buy AND p_current_price <= tp_prices[i]) THEN
                new_mask := new_mask | (1 << (i-1));
                tp_hit_this_cycle := array_append(tp_hit_this_cycle, i);
                new_tp_hits := array_append(new_tp_hits, i);
                hit_count := hit_count + 1;
            END IF;
        END IF;
    END LOOP;
    
    -- Update database if anything changed
    IF new_mask != current_mask OR array_length(new_tp_hits, 1) != array_length(existing_tp_hits, 1) THEN
        UPDATE public.trade_alerts 
        SET tp_hit_mask = new_mask,
            tp_hits = new_tp_hits,
            updated_at = now()
        WHERE id = p_trade_id;
    END IF;
    
    result := jsonb_build_object(
        'tp_hits_this_cycle', tp_hit_this_cycle,
        'total_tps_hit', hit_count,
        'total_tps_defined', total_tps,
        'all_tps_hit', (total_tps > 0 AND hit_count = total_tps),
        'mask_updated', (new_mask != current_mask),
        'old_mask', current_mask,
        'new_mask', new_mask,
        'current_price', p_current_price,
        'entry_price', trade_record.entry_price
    );
    
    RETURN result;
END;
$function$;