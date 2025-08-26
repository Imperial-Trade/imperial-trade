
-- Add the missing 'all_tps_hit' value to the close_reason enum
ALTER TYPE close_reason ADD VALUE IF NOT EXISTS 'all_tps_hit';

-- Create the reconcile_signal_consistency function
CREATE OR REPLACE FUNCTION public.reconcile_signal_consistency()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  signals_fixed_count INTEGER := 0;
  orders_activated_count INTEGER := 0;
  signal_record RECORD;
  total_tps INTEGER;
  current_tp_hits INTEGER[];
BEGIN
  -- Fix signals where all TPs are hit but status is not closed
  FOR signal_record IN 
    SELECT id, tp1, tp2, tp3, tp4, tp5, tp_hits, status
    FROM public.trade_alerts 
    WHERE status IN ('active', 'partially_profited')
  LOOP
    -- Count total TP levels for this signal
    total_tps := 0;
    IF signal_record.tp1 IS NOT NULL THEN total_tps := total_tps + 1; END IF;
    IF signal_record.tp2 IS NOT NULL THEN total_tps := total_tps + 1; END IF;
    IF signal_record.tp3 IS NOT NULL THEN total_tps := total_tps + 1; END IF;
    IF signal_record.tp4 IS NOT NULL THEN total_tps := total_tps + 1; END IF;
    IF signal_record.tp5 IS NOT NULL THEN total_tps := total_tps + 1; END IF;
    
    current_tp_hits := COALESCE(signal_record.tp_hits, ARRAY[]::INTEGER[]);
    
    -- Check if all TPs are hit
    IF array_length(current_tp_hits, 1) >= total_tps AND total_tps > 0 THEN
      UPDATE public.trade_alerts 
      SET status = 'closed', 
          close_reason = 'all_tps_hit',
          updated_at = now()
      WHERE id = signal_record.id;
      
      signals_fixed_count := signals_fixed_count + 1;
      
      -- Deactivate all monitoring for this signal
      UPDATE public.alert_monitoring 
      SET is_active = false, updated_at = now()
      WHERE signal_id = signal_record.id;
    END IF;
  END LOOP;
  
  -- Activate pending limit orders that should be active
  FOR signal_record IN
    SELECT ta.id, ta.tradermade_symbol, ta.entry_price, ta.trade_type
    FROM public.trade_alerts ta
    JOIN public.market_prices mp ON ta.tradermade_symbol = mp.symbol
    WHERE ta.status = 'pending' 
    AND ta.trade_type IN ('buy_limit', 'sell_limit')
    AND (
      (ta.trade_type = 'buy_limit' AND mp.bid <= ta.entry_price) OR
      (ta.trade_type = 'sell_limit' AND mp.ask >= ta.entry_price)
    )
  LOOP
    UPDATE public.trade_alerts 
    SET status = 'active',
        activated_at = now(),
        activation_price = signal_record.entry_price,
        updated_at = now()
    WHERE id = signal_record.id;
    
    orders_activated_count := orders_activated_count + 1;
  END LOOP;
  
  -- Log the reconciliation activity
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status)
  VALUES ('reconcile_signal_consistency', NOW(), signals_fixed_count + orders_activated_count, 'success');
  
  RETURN jsonb_build_object(
    'signals_fixed', signals_fixed_count,
    'orders_activated', orders_activated_count,
    'timestamp', now(),
    'status', 'success'
  );
  
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES ('reconcile_signal_consistency', NOW(), 0, 'error', SQLERRM);
  
  RETURN jsonb_build_object(
    'signals_fixed', 0,
    'orders_activated', 0,
    'timestamp', now(),
    'status', 'error',
    'error', SQLERRM
  );
END;
$function$;
