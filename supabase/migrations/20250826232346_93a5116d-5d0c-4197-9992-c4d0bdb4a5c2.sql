
-- Step 1: Add 'all_tps_hit' to the close_reason enum
-- This handles the case where it might already exist or needs to be added
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'close_reason_enum' AND e.enumlabel = 'all_tps_hit') THEN
        ALTER TYPE close_reason_enum ADD VALUE 'all_tps_hit';
    END IF;
END
$$;

-- Step 2: Create or replace the enhanced function to handle triggered alerts with corrected TP logic
-- This function now correctly works with individual tp1-tp5 columns and the tp_hits integer array
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
    is_final_tp boolean := false;
BEGIN
    -- Get current signal state and lock the row to prevent race conditions during updates
    SELECT
        ta.id, ta.status, ta.tp1, ta.tp2, ta.tp3, ta.tp4, ta.tp5, ta.tp_hits, ta.close_reason
    INTO signal_record
    FROM trade_alerts ta
    WHERE ta.id = p_signal_id
    FOR UPDATE;

    -- If signal_record is null, the signal might have been deleted or doesn't exist
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'signal_not_found', 'signal_id', p_signal_id);
    END IF;

    -- Count total TP levels for this signal based on existing tp1-tp5 columns
    IF signal_record.tp1 IS NOT NULL THEN total_tp_levels := total_tp_levels + 1; END IF;
    IF signal_record.tp2 IS NOT NULL THEN total_tp_levels := total_tp_levels + 1; END IF;
    IF signal_record.tp3 IS NOT NULL THEN total_tp_levels := total_tp_levels + 1; END IF;
    IF signal_record.tp4 IS NOT NULL THEN total_tp_levels := total_tp_levels + 1; END IF;
    IF signal_record.tp5 IS NOT NULL THEN total_tp_levels := total_tp_levels + 1; END IF;
    
    -- Deactivate the specific alert that triggered this function
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

        -- Deactivate ALL remaining active alerts for this signal
        UPDATE alert_monitoring
        SET is_active = false, updated_at = now()
        WHERE signal_id = p_signal_id AND is_active = true;

        result := jsonb_build_object(
            'action', 'signal_closed',
            'reason', 'stop_loss_hit',
            'triggered_price', p_triggered_price
        );

    ELSIF p_alert_type LIKE 'take_profit_%' THEN
        -- Extract TP level number (1-5)
        tp_level := CAST(substring(p_alert_type from 'take_profit_(\d+)') AS integer);
        current_tp_hits := COALESCE(signal_record.tp_hits, ARRAY[]::integer[]);

        -- Only add to tp_hits array if this TP level is valid and not already present
        IF tp_level BETWEEN 1 AND 5 AND NOT (tp_level = ANY(current_tp_hits)) THEN
            -- Check if this TP level actually exists for the signal before marking it hit
            IF (tp_level = 1 AND signal_record.tp1 IS NOT NULL) OR
               (tp_level = 2 AND signal_record.tp2 IS NOT NULL) OR
               (tp_level = 3 AND signal_record.tp3 IS NOT NULL) OR
               (tp_level = 4 AND signal_record.tp4 IS NOT NULL) OR
               (tp_level = 5 AND signal_record.tp5 IS NOT NULL)
            THEN
                current_tp_hits := array_append(current_tp_hits, tp_level);
                -- Ensure the array is unique and sorted for consistency
                SELECT ARRAY(SELECT DISTINCT unnest(current_tp_hits) ORDER BY 1) INTO current_tp_hits;
            ELSE
                -- This TP level was triggered but not defined in the signal
                result := jsonb_build_object(
                    'action', 'tp_alert_ignored',
                    'reason', 'tp_not_defined',
                    'tp_level', tp_level
                );
                RETURN result;
            END IF;
        END IF;

        -- Check if all defined TPs are now hit
        is_final_tp := (COALESCE(array_length(current_tp_hits, 1), 0) >= total_tp_levels) AND (total_tp_levels > 0);

        IF is_final_tp THEN
            -- All TPs hit - close the signal with 'all_tps_hit' reason
            UPDATE trade_alerts
            SET tp_hits = current_tp_hits,
                status = 'closed',
                close_reason = 'all_tps_hit',
                updated_at = now()
            WHERE id = p_signal_id;

            -- Deactivate all remaining active alerts for this signal
            UPDATE alert_monitoring
            SET is_active = false, updated_at = now()
            WHERE signal_id = p_signal_id AND is_active = true;

            result := jsonb_build_object(
                'action', 'signal_closed',
                'reason', 'all_tps_hit',
                'tp_level', tp_level,
                'total_tps_hit', COALESCE(array_length(current_tp_hits, 1), 0),
                'triggered_price', p_triggered_price
            );
        ELSE
            -- Partial TP hit - update status to 'partially_profited'
            UPDATE trade_alerts
            SET tp_hits = current_tp_hits,
                status = CASE
                            WHEN signal_record.status IN ('active', 'partially_profited') THEN 'partially_profited'
                            ELSE signal_record.status
                         END,
                updated_at = now()
            WHERE id = p_signal_id;

            result := jsonb_build_object(
                'action', 'tp_partial_hit',
                'tp_level', tp_level,
                'total_tps_hit', COALESCE(array_length(current_tp_hits, 1), 0),
                'remaining_tps', total_tp_levels - COALESCE(array_length(current_tp_hits, 1), 0),
                'triggered_price', p_triggered_price
            );
        END IF;

    ELSE
        -- For other alert types
        result := jsonb_build_object(
            'action', 'alert_processed',
            'alert_type', p_alert_type,
            'triggered_price', p_triggered_price
        );
    END IF;

    RETURN result;
END;
$function$;

-- Step 3: Create or replace reconciliation function with corrected logic
-- This function now correctly works with individual tp1-tp5 columns and the tp_hits integer array
CREATE OR REPLACE FUNCTION public.reconcile_signal_consistency()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    signals_fixed integer := 0;
    orders_activated integer := 0;
    signal_record RECORD;
    total_tps_defined integer;
    hit_tps_count integer;
BEGIN
    -- Fix signals where all TPs are hit but the signal is not closed
    FOR signal_record IN
        SELECT id, tp1, tp2, tp3, tp4, tp5, tp_hits, status, tradermade_symbol, asset_name
        FROM trade_alerts
        WHERE status IN ('active', 'partially_profited')
    LOOP
        total_tps_defined := 0;
        IF signal_record.tp1 IS NOT NULL THEN total_tps_defined := total_tps_defined + 1; END IF;
        IF signal_record.tp2 IS NOT NULL THEN total_tps_defined := total_tps_defined + 1; END IF;
        IF signal_record.tp3 IS NOT NULL THEN total_tps_defined := total_tps_defined + 1; END IF;
        IF signal_record.tp4 IS NOT NULL THEN total_tps_defined := total_tps_defined + 1; END IF;
        IF signal_record.tp5 IS NOT NULL THEN total_tps_defined := total_tps_defined + 1; END IF;

        hit_tps_count := COALESCE(array_length(signal_record.tp_hits, 1), 0);

        -- If all defined TPs are hit, but the signal is not yet closed, then close it
        IF total_tps_defined > 0 AND hit_tps_count >= total_tps_defined THEN
            UPDATE trade_alerts
            SET status = 'closed',
                close_reason = 'all_tps_hit',
                updated_at = now()
            WHERE id = signal_record.id;

            -- Deactivate all monitoring for this signal as it's now closed
            UPDATE alert_monitoring
            SET is_active = false, updated_at = now()
            WHERE signal_id = signal_record.id;

            signals_fixed := signals_fixed + 1;
        END IF;
    END LOOP;

    -- Activate pending orders that are ready (based on current market prices)
    UPDATE trade_alerts
    SET status = 'active',
        activated_at = now(),
        updated_at = now()
    WHERE status = 'pending'
    AND trade_type IN ('buy_limit', 'sell_limit')
    AND (
        (trade_type = 'buy_limit' AND EXISTS (
            SELECT 1 FROM market_prices mp
            WHERE mp.symbol = trade_alerts.tradermade_symbol
            AND mp.bid <= trade_alerts.entry_price
        )) OR
        (trade_type = 'sell_limit' AND EXISTS (
            SELECT 1 FROM market_prices mp
            WHERE mp.symbol = trade_alerts.tradermade_symbol
            AND mp.ask >= trade_alerts.entry_price
        ))
    );

    GET DIAGNOSTICS orders_activated = ROW_COUNT;

    RETURN jsonb_build_object(
        'signals_fixed', signals_fixed,
        'orders_activated', orders_activated,
        'timestamp', now()
    );
END;
$function$;
