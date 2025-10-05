-- ============================================
-- PHASE 4 COMPLETION: FIX BUGS #13, #14, #15
-- ============================================

-- ============================================
-- FIX #13: Attach smart_updated_at() trigger
-- ============================================
-- Problem: smart_updated_at() function exists but old set_updated_at() trigger is still attached
-- Solution: Replace trigger to use smart function for phantom prevention

DROP TRIGGER IF EXISTS update_trade_alerts_updated_at ON public.trade_alerts;

CREATE TRIGGER update_trade_alerts_updated_at
  BEFORE UPDATE ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.smart_updated_at();

-- ============================================
-- FIX #14: Prevent TP Processor Unnecessary Updates
-- ============================================
-- Problem: process_tp_hits_sequential() always updates tp_hits even when unchanged
-- Solution: Add change detection before UPDATE to prevent cascading storms

CREATE OR REPLACE FUNCTION public.process_tp_hits_sequential(p_trade_id uuid, p_current_price numeric, p_is_buy boolean)
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
    tp_hits_changed BOOLEAN := false;
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
    IF next_tp_to_check > 0 THEN
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
                tp_hits_changed := true;
                
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
    
    -- ============================================
    -- FIX #14 IMPLEMENTATION: Only update if TP hits actually changed
    -- ============================================
    IF tp_hits_changed THEN
        -- Set system operation flag to prevent phantom triggers
        PERFORM set_config('app.is_system_operation', 'true', true);
        
        UPDATE public.trade_alerts 
        SET tp_hits = new_tp_hits,
            updated_at = now()
        WHERE id = p_trade_id;
        
        -- Reset flag
        PERFORM set_config('app.is_system_operation', 'false', true);
        
        IF NOT FOUND THEN
            RETURN jsonb_build_object('error', 'Failed to update TP hits');
        END IF;
        
        -- Log the actual change
        INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
        VALUES (
            'tp_hit_processor_update', 
            NOW(), 
            1, 
            'success',
            format('TP array updated - Signal: %s - Old: %s, New: %s', 
                p_trade_id, existing_tp_hits, new_tp_hits)
        );
    END IF;
    
    result := jsonb_build_object(
        'tp_hit_this_cycle', CASE WHEN next_tp_to_check > 0 AND tp_hits_changed THEN ARRAY[next_tp_to_check] ELSE ARRAY[]::INTEGER[] END,
        'total_tps_hit', hit_count,
        'total_tps_defined', total_tps,
        'all_tps_hit', (total_tps > 0 AND hit_count = total_tps),
        'next_tp_to_check', next_tp_to_check,
        'tp_hits_array', new_tp_hits,
        'tp_hits_changed', tp_hits_changed,
        'sequential_processing', true,
        'current_price', p_current_price,
        'entry_price', trade_record.entry_price,
        'trade_type', CASE WHEN p_is_buy THEN 'BUY' ELSE 'SELL' END
    );
    
    RETURN result;
EXCEPTION WHEN OTHERS THEN
    -- Reset flag on error
    PERFORM set_config('app.is_system_operation', 'false', true);
    
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

-- ============================================
-- FIX #15: Optimize TP Processor Performance
-- ============================================
-- Problem: Trigger fires on EVERY price update regardless of active signals
-- Solution: Add early exit if no active signals for symbol

CREATE OR REPLACE FUNCTION public.process_tp_hits_on_price_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  active_signal RECORD;
  tp_result JSONB;
BEGIN
  -- ============================================
  -- FIX #15 IMPLEMENTATION: Early exit for performance
  -- ============================================
  -- Exit immediately if no active signals exist for this symbol
  IF NOT EXISTS (
    SELECT 1 
    FROM public.trade_alerts 
    WHERE tradermade_symbol = NEW.symbol 
    AND status = 'active'
    AND (tp1 IS NOT NULL OR tp2 IS NOT NULL OR tp3 IS NOT NULL OR tp4 IS NOT NULL OR tp5 IS NOT NULL)
  ) THEN
    RETURN NEW; -- No active signals, skip processing
  END IF;
  
  -- Set system operation flag to prevent notification triggers
  PERFORM set_config('app.is_system_operation', 'true', true);
  
  -- Process all active signals for this symbol
  FOR active_signal IN 
    SELECT id, trade_type, entry_price
    FROM public.trade_alerts
    WHERE tradermade_symbol = NEW.symbol 
    AND status = 'active'
    AND (tp1 IS NOT NULL OR tp2 IS NOT NULL OR tp3 IS NOT NULL OR tp4 IS NOT NULL OR tp5 IS NOT NULL)
  LOOP
    -- Determine if this is a buy or sell
    DECLARE
      is_buy BOOLEAN := active_signal.trade_type IN ('buy', 'buy_limit');
    BEGIN
      -- Call sequential TP processor
      tp_result := process_tp_hits_sequential(
        active_signal.id,
        NEW.mid,
        is_buy
      );
      
      -- Check for errors
      IF tp_result ? 'error' THEN
        INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
        VALUES (
          'process_tp_hits_on_price_update', 
          NOW(), 
          0, 
          'error',
          format('TP processing error for signal %s: %s', active_signal.id, tp_result->>'error')
        );
      END IF;
    END;
  END LOOP;
  
  -- Reset system operation flag
  PERFORM set_config('app.is_system_operation', 'false', true);
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Reset flag on error
  PERFORM set_config('app.is_system_operation', 'false', true);
  
  -- Log error
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES (
    'process_tp_hits_on_price_update', 
    NOW(), 
    0, 
    'error',
    format('TP trigger error for symbol %s: %s', NEW.symbol, SQLERRM)
  );
  
  RETURN NEW;
END;
$function$;