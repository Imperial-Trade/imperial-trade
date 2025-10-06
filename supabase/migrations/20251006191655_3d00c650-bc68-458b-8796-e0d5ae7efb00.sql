-- ============================================
-- BUG #24 FIX - PHASE 1: Auto-close signals when all TPs are hit
-- ============================================
-- This migration enhances process_tp_hits_sequential() to automatically
-- close signals and set close_reason when all take profits are hit

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
  precision_buffer NUMERIC := 0.00005;
  tp_hits_changed BOOLEAN := false;
  all_targets_hit BOOLEAN := false;
BEGIN
  -- Get trade record with row-level locking
  SELECT * INTO trade_record
  FROM public.trade_alerts
  WHERE id = p_trade_id AND status = 'active'
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Trade not found or not active');
  END IF;
  
  -- Initialize variables
  existing_tp_hits := COALESCE(trade_record.tp_hits, ARRAY[]::INTEGER[]);
  new_tp_hits := existing_tp_hits;
  
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
  
  -- Find the next TP that should be checked (sequential processing)
  next_tp_to_check := 0;
  FOR i IN 1..5 LOOP
    IF tp_prices[i] IS NOT NULL AND tp_prices[i] > 0 THEN
      IF NOT (i = ANY(existing_tp_hits)) THEN
        next_tp_to_check := i;
        EXIT;
      END IF;
    END IF;
  END LOOP;
  
  -- Validate next TP
  IF next_tp_to_check > 0 THEN
    DECLARE
      should_hit BOOLEAN := false;
      price_buffer NUMERIC := tp_prices[next_tp_to_check] * precision_buffer;
    BEGIN
      IF p_is_buy THEN
        should_hit := p_current_price >= (tp_prices[next_tp_to_check] - price_buffer);
      ELSE
        should_hit := p_current_price <= (tp_prices[next_tp_to_check] + price_buffer);
      END IF;
      
      -- Validate direction
      IF p_is_buy AND p_current_price < trade_record.entry_price THEN
        should_hit := false;
      ELSIF NOT p_is_buy AND p_current_price > trade_record.entry_price THEN
        should_hit := false;
      END IF;
      
      IF should_hit THEN
        new_tp_hits := array_append(new_tp_hits, next_tp_to_check);
        hit_count := hit_count + 1;
        tp_hits_changed := true;
        
        -- Log TP hit
        INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
        VALUES (
          'tp_hit_processor_sequential', 
          NOW(), 
          1, 
          'success',
          format('TP%s hit for signal %s - Price: %s, Target: %s, Trade: %s %s', 
            next_tp_to_check, p_trade_id, p_current_price, tp_prices[next_tp_to_check], 
            CASE WHEN p_is_buy THEN 'BUY' ELSE 'SELL' END,
            trade_record.asset_name)
        );
      END IF;
    END;
  END IF;
  
  -- ============================================
  -- BUG #24 FIX: Check if all TPs are hit and auto-close
  -- ============================================
  all_targets_hit := (total_tps > 0 AND hit_count = total_tps);
  
  IF tp_hits_changed THEN
    PERFORM set_config('app.is_system_operation', 'true', true);
    
    -- Update TP hits array
    UPDATE public.trade_alerts 
    SET tp_hits = new_tp_hits,
        updated_at = now()
    WHERE id = p_trade_id;
    
    PERFORM set_config('app.is_system_operation', 'false', true);
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'Failed to update TP hits');
    END IF;
  END IF;
  
  -- ============================================
  -- BUG #24 FIX: Auto-close signal when all TPs are hit
  -- ============================================
  IF all_targets_hit AND trade_record.status = 'active' THEN
    PERFORM set_config('app.is_system_operation', 'true', true);
    
    UPDATE public.trade_alerts
    SET status = 'closed',
        close_reason = 'all_targets_hit',
        updated_at = now()
    WHERE id = p_trade_id;
    
    PERFORM set_config('app.is_system_operation', 'false', true);
    
    -- Log auto-close
    INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
    VALUES (
      'auto_close_all_tps_hit', 
      NOW(), 
      1, 
      'success',
      format('✅ AUTO-CLOSED signal %s - All %s TPs hit - Asset: %s', 
        p_trade_id, total_tps, trade_record.asset_name)
    );
  END IF;
  
  result := jsonb_build_object(
    'tp_hit_this_cycle', CASE WHEN next_tp_to_check > 0 AND tp_hits_changed THEN ARRAY[next_tp_to_check] ELSE ARRAY[]::INTEGER[] END,
    'total_tps_hit', hit_count,
    'total_tps_defined', total_tps,
    'all_tps_hit', all_targets_hit,
    'signal_auto_closed', all_targets_hit,
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
  PERFORM set_config('app.is_system_operation', 'false', true);
  
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
    'signal_auto_closed', false,
    'sequential_processing', true
  );
END;
$function$;