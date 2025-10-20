-- ============================================
-- FIX: Eliminate Race Condition in Alert Processing
-- ============================================
-- Problem: Trigger processes 'pending' signals during activation window
-- Solution: Only process 'active' signals (3 surgical changes)
-- ============================================

CREATE OR REPLACE FUNCTION public.check_alerts_on_price_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_alert RECORD;
    v_current_price DECIMAL(20, 8);
    v_should_trigger BOOLEAN;
    v_affected_count INTEGER := 0;
BEGIN
    -- ============================================
    -- EARLY EXIT 1: Skip if no price change
    -- ============================================
    IF (NEW.bid IS NOT DISTINCT FROM OLD.bid) AND 
       (NEW.ask IS NOT DISTINCT FROM OLD.ask) AND
       (NEW.mid IS NOT DISTINCT FROM OLD.mid) THEN
        RETURN NEW;
    END IF;
    
    -- ============================================
    -- EARLY EXIT 2: Skip if no ACTIVE alerts exist
    -- ✅ FIX #1: Changed from status IN ('active', 'pending') to status = 'active'
    -- ============================================
    IF NOT EXISTS (
        SELECT 1 
        FROM alert_monitoring am
        JOIN trade_alerts ta ON ta.id = am.signal_id
        WHERE am.is_active = true
          AND am.symbol = NEW.symbol
          AND ta.status = 'active'
        LIMIT 1
    ) THEN
        RETURN NEW;
    END IF;
    
    -- ============================================
    -- OPTIMIZED ALERT PROCESSING
    -- ✅ FIX #2: Changed from status IN ('active', 'pending') to status = 'active'
    -- ============================================
    FOR v_alert IN
        SELECT 
            am.id AS alert_id,
            am.signal_id,
            am.alert_type,
            am.target_price,
            ta.user_id,
            ta.trade_type,
            ta.asset_name,
            ta.entry_price
        FROM alert_monitoring am
        JOIN trade_alerts ta ON ta.id = am.signal_id
        WHERE am.is_active = true
          AND am.symbol = NEW.symbol
          AND ta.status = 'active'
        ORDER BY 
            CASE WHEN am.alert_type = 'stop_loss' THEN 0 ELSE 1 END,
            am.created_at ASC
    LOOP
        v_current_price := CASE 
            WHEN v_alert.trade_type IN ('buy', 'buy_limit') THEN NEW.bid
            WHEN v_alert.trade_type IN ('sell', 'sell_limit') THEN NEW.ask
            ELSE NEW.mid
        END;
        
        v_should_trigger := FALSE;
        
        IF v_alert.alert_type = 'stop_loss' THEN
            IF v_alert.trade_type IN ('buy', 'buy_limit') THEN
                v_should_trigger := (v_current_price <= v_alert.target_price);
            ELSIF v_alert.trade_type IN ('sell', 'sell_limit') THEN
                v_should_trigger := (v_current_price >= v_alert.target_price);
            END IF;
            
            IF v_should_trigger THEN
                INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
                VALUES ('trigger_stop_loss_detected', NOW(), 1, 'info',
                    format('🎯 SL HIT: %s (%s) - Entry: %s, SL: %s, Current: %s, Type: %s',
                        v_alert.signal_id, v_alert.asset_name, v_alert.entry_price,
                        v_alert.target_price, v_current_price, v_alert.trade_type));
                
                PERFORM close_trade_alert(
                    p_alert_id := v_alert.signal_id,
                    p_user_id := v_alert.user_id,
                    p_close_reason := 'stop_loss'
                );
                
                UPDATE alert_monitoring
                SET is_active = false, updated_at = NOW()
                WHERE id = v_alert.alert_id;
                
                v_affected_count := v_affected_count + 1;
            END IF;
        END IF;
        
        IF v_alert.alert_type LIKE 'take_profit%' THEN
            IF v_alert.trade_type IN ('buy', 'buy_limit') THEN
                v_should_trigger := (NEW.ask >= v_alert.target_price);
            ELSIF v_alert.trade_type IN ('sell', 'sell_limit') THEN
                v_should_trigger := (NEW.bid <= v_alert.target_price);
            END IF;
            
            IF v_should_trigger THEN
                DECLARE 
                    v_tp_level INTEGER;
                    v_existing_hits INTEGER[];
                BEGIN
                    v_tp_level := CASE v_alert.alert_type
                        WHEN 'take_profit_1' THEN 1
                        WHEN 'take_profit_2' THEN 2
                        WHEN 'take_profit_3' THEN 3
                        WHEN 'take_profit_4' THEN 4
                        WHEN 'take_profit_5' THEN 5
                        ELSE 1
                    END;
                    
                    SELECT tp_hits INTO v_existing_hits
                    FROM trade_alerts
                    WHERE id = v_alert.signal_id;
                    
                    IF NOT (v_tp_level = ANY(COALESCE(v_existing_hits, ARRAY[]::INTEGER[]))) THEN
                        UPDATE trade_alerts
                        SET tp_hits = COALESCE(tp_hits, ARRAY[]::INTEGER[]) || v_tp_level,
                            updated_at = NOW()
                        WHERE id = v_alert.signal_id
                          AND status = 'active';
                        
                        UPDATE alert_monitoring
                        SET is_active = false, updated_at = NOW()
                        WHERE id = v_alert.alert_id;
                        
                        v_affected_count := v_affected_count + 1;
                    END IF;
                END;
            END IF;
        END IF;
        
    END LOOP;
    
    IF v_affected_count > 0 THEN
        INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
        VALUES ('trigger_alert_check_complete', NOW(), v_affected_count, 'success',
            format('✅ Processed %s alerts for %s', v_affected_count, NEW.symbol));
    END IF;
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE VIEW v_pending_signals_with_tp_hits AS
SELECT 
    id,
    asset_name,
    tradermade_symbol,
    trade_type,
    status,
    tp_hits,
    array_length(tp_hits, 1) as tp_hit_count,
    created_at,
    updated_at,
    NOW() - updated_at as age,
    '⚠️ CONSTRAINT VIOLATION DETECTED' as alert_message
FROM trade_alerts
WHERE status = 'pending'
  AND (tp_hits IS NOT NULL AND tp_hits != '{}');

COMMENT ON VIEW v_pending_signals_with_tp_hits IS 
'Monitoring view: Should ALWAYS return 0 rows. Detects if pending signals incorrectly have tp_hits.';

INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
    'fix_alert_race_condition_deployed',
    NOW(),
    3,
    'success',
    '✅ Race condition fix deployed: Trigger now only processes active signals + monitoring view created'
);