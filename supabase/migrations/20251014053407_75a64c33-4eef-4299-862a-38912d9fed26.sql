-- ============================================
-- PART 1: INSTANT ALERT DETECTION - DATABASE TRIGGER
-- Detects SL/TP hits instantly when prices update (< 1 second vs 10 second cron)
-- ============================================

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_instant_alert_check ON market_prices;
DROP FUNCTION IF EXISTS check_alerts_on_price_update() CASCADE;

-- Create trigger function for instant alert detection
CREATE OR REPLACE FUNCTION check_alerts_on_price_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_alert RECORD;
    v_current_price DECIMAL(20, 8);
    v_should_trigger BOOLEAN;
    v_affected_count INTEGER := 0;
BEGIN
    -- Skip if no price change (performance optimization)
    IF (NEW.bid IS NOT DISTINCT FROM OLD.bid) AND 
       (NEW.ask IS NOT DISTINCT FROM OLD.ask) AND
       (NEW.mid IS NOT DISTINCT FROM OLD.mid) THEN
        RETURN NEW;
    END IF;
    
    -- Process all active alerts for this symbol (STOP LOSS FIRST - highest priority)
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
          AND ta.status IN ('active', 'pending')
        ORDER BY 
            -- CRITICAL: Process Stop Loss FIRST (priority 0)
            CASE WHEN am.alert_type = 'stop_loss' THEN 0 ELSE 1 END,
            am.created_at ASC
    LOOP
        -- Select correct price based on trade type
        v_current_price := CASE 
            WHEN v_alert.trade_type IN ('buy', 'buy_limit') THEN NEW.bid  -- BUY uses BID for SL
            WHEN v_alert.trade_type IN ('sell', 'sell_limit') THEN NEW.ask  -- SELL uses ASK for SL
            ELSE NEW.mid
        END;
        
        v_should_trigger := FALSE;
        
        -- ============================================
        -- STOP LOSS DETECTION
        -- ============================================
        IF v_alert.alert_type = 'stop_loss' THEN
            IF v_alert.trade_type IN ('buy', 'buy_limit') THEN
                -- BUY: SL triggers when BID price falls below stop loss
                v_should_trigger := (v_current_price <= v_alert.target_price);
            ELSIF v_alert.trade_type IN ('sell', 'sell_limit') THEN
                -- SELL: SL triggers when ASK price rises above stop loss
                v_should_trigger := (v_current_price >= v_alert.target_price);
            END IF;
            
            IF v_should_trigger THEN
                -- Log detection
                INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
                VALUES ('trigger_stop_loss_detected', NOW(), 1, 'info',
                    format('🎯 SL HIT: %s (%s) - Entry: %s, SL: %s, Current: %s, Type: %s',
                        v_alert.signal_id, v_alert.asset_name, v_alert.entry_price,
                        v_alert.target_price, v_current_price, v_alert.trade_type));
                
                -- Close signal via RPC (proper security + audit trail)
                PERFORM close_trade_alert(
                    p_alert_id := v_alert.signal_id,
                    p_user_id := v_alert.user_id,
                    p_close_reason := 'stop_loss'
                );
                
                -- Deactivate alert
                UPDATE alert_monitoring
                SET is_active = false, updated_at = NOW()
                WHERE id = v_alert.alert_id;
                
                -- Log success
                INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
                VALUES ('trigger_stop_loss_closed', NOW(), 1, 'success',
                    format('✅ Signal %s (%s) closed at price %s - Realtime will notify UI',
                        v_alert.signal_id, v_alert.asset_name, v_current_price));
                
                v_affected_count := v_affected_count + 1;
            END IF;
        END IF;
        
        -- ============================================
        -- TAKE PROFIT DETECTION
        -- ============================================
        IF v_alert.alert_type LIKE 'take_profit%' THEN
            IF v_alert.trade_type IN ('buy', 'buy_limit') THEN
                -- BUY: TP triggers when ASK price reaches target
                v_should_trigger := (NEW.ask >= v_alert.target_price);
            ELSIF v_alert.trade_type IN ('sell', 'sell_limit') THEN
                -- SELL: TP triggers when BID price reaches target
                v_should_trigger := (NEW.bid <= v_alert.target_price);
            END IF;
            
            IF v_should_trigger THEN
                DECLARE 
                    v_tp_level INTEGER;
                    v_existing_hits INTEGER[];
                BEGIN
                    -- Extract TP level (1-5)
                    v_tp_level := CASE v_alert.alert_type
                        WHEN 'take_profit_1' THEN 1
                        WHEN 'take_profit_2' THEN 2
                        WHEN 'take_profit_3' THEN 3
                        WHEN 'take_profit_4' THEN 4
                        WHEN 'take_profit_5' THEN 5
                        ELSE 1
                    END;
                    
                    -- Get existing TP hits
                    SELECT tp_hits INTO v_existing_hits
                    FROM trade_alerts
                    WHERE id = v_alert.signal_id;
                    
                    -- Only add if not already hit (prevent duplicates)
                    IF NOT (v_tp_level = ANY(COALESCE(v_existing_hits, ARRAY[]::INTEGER[]))) THEN
                        -- Update TP hits array
                        UPDATE trade_alerts
                        SET tp_hits = COALESCE(tp_hits, ARRAY[]::INTEGER[]) || v_tp_level,
                            updated_at = NOW()
                        WHERE id = v_alert.signal_id;
                        
                        -- Deactivate this TP alert
                        UPDATE alert_monitoring
                        SET is_active = false, updated_at = NOW()
                        WHERE id = v_alert.alert_id;
                        
                        -- Log TP hit
                        INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
                        VALUES ('trigger_tp_hit', NOW(), 1, 'success',
                            format('🎯 TP%s HIT: %s at price %s', v_tp_level, v_alert.asset_name, v_current_price));
                        
                        v_affected_count := v_affected_count + 1;
                    END IF;
                END;
            END IF;
        END IF;
        
    END LOOP;
    
    -- Log completion if any alerts triggered
    IF v_affected_count > 0 THEN
        INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
        VALUES ('trigger_alert_check_complete', NOW(), v_affected_count, 'success',
            format('✅ Processed %s alerts for %s', v_affected_count, NEW.symbol));
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger on market_prices table
CREATE TRIGGER trigger_instant_alert_check
    AFTER UPDATE OF bid, ask, mid
    ON market_prices
    FOR EACH ROW
    EXECUTE FUNCTION check_alerts_on_price_update();

-- ============================================
-- PART 2: REDUCE CRON TO 60-SECOND BACKUP
-- Cron becomes backup only (trigger handles primary detection)
-- ============================================

-- Unschedule existing 10-second cron
SELECT cron.unschedule('automated-price-monitoring');

-- Reschedule as 60-second backup (runs at top of each minute)
SELECT cron.schedule(
    'automated-price-monitoring',
    '0 * * * *',  -- Every minute at :00 seconds
    $$
    SELECT net.http_post(
        url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/price-monitoring',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU',
            'x-supabase-cron-secret', '7f8e9a2b-4c5d-4e6f-8a9b-1c2d3e4f5a6b'
        ),
        body := '{}'::jsonb
    ) AS request_id;
    $$
);