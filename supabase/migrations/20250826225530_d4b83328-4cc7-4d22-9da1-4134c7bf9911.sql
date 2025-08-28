
-- Create reconciliation function to fix signals with all TPs hit but not closed
CREATE OR REPLACE FUNCTION public.reconcile_signal_consistency()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  signals_to_close RECORD;
  closed_count INTEGER := 0;
  activated_count INTEGER := 0;
  result jsonb;
BEGIN
  -- Find and close signals where all TPs are hit but status is not closed
  FOR signals_to_close IN
    SELECT 
      ta.id,
      ta.status,
      ta.tp_hits,
      ta.tradermade_symbol,
      (CASE WHEN ta.tp1 IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN ta.tp2 IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN ta.tp3 IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN ta.tp4 IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN ta.tp5 IS NOT NULL THEN 1 ELSE 0 END) as total_tps
    FROM trade_alerts ta
    WHERE ta.status IN ('active', 'partially_profited')
    AND ta.tp_hits IS NOT NULL
    AND array_length(ta.tp_hits, 1) > 0
  LOOP
    -- Check if all TPs are hit
    IF array_length(signals_to_close.tp_hits, 1) >= signals_to_close.total_tps THEN
      -- Close the signal
      UPDATE trade_alerts 
      SET 
        status = 'closed',
        close_reason = 'all_tps_hit',
        updated_at = now()
      WHERE id = signals_to_close.id;
      
      -- Deactivate remaining alert monitoring for this signal
      UPDATE alert_monitoring 
      SET is_active = false, updated_at = now()
      WHERE signal_id = signals_to_close.id AND is_active = true;
      
      closed_count := closed_count + 1;
      
      INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
      VALUES (
        'reconcile_signal_consistency', 
        NOW(), 
        1, 
        'success',
        'Closed signal ' || signals_to_close.id || ' (' || signals_to_close.tradermade_symbol || ') - all TPs hit: ' || array_to_string(signals_to_close.tp_hits, ',')
      );
    END IF;
  END LOOP;

  -- Activate pending limit orders where price conditions are met
  -- This requires current market prices, so we'll check against market_prices table
  UPDATE trade_alerts ta
  SET 
    status = 'active',
    activated_at = now(),
    activation_price = ta.entry_price,
    updated_at = now()
  FROM market_prices mp
  WHERE ta.status = 'pending'
    AND ta.trade_type IN ('buy_limit', 'sell_limit')
    AND ta.tradermade_symbol = mp.symbol
    AND (
      (ta.trade_type = 'buy_limit' AND mp.bid <= ta.entry_price) OR
      (ta.trade_type = 'sell_limit' AND mp.ask >= ta.entry_price)
    );
    
  GET DIAGNOSTICS activated_count = ROW_COUNT;

  -- Log activation results
  IF activated_count > 0 THEN
    INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
    VALUES (
      'reconcile_signal_consistency', 
      NOW(), 
      activated_count, 
      'success',
      'Activated ' || activated_count || ' pending limit orders'
    );
  END IF;

  result := jsonb_build_object(
    'signals_closed', closed_count,
    'orders_activated', activated_count,
    'timestamp', now(),
    'status', 'completed'
  );
  
  -- Overall log entry
  INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES (
    'reconcile_signal_consistency', 
    NOW(), 
    closed_count + activated_count, 
    'success',
    'Reconciliation completed: ' || closed_count || ' signals closed, ' || activated_count || ' orders activated'
  );
  
  RETURN result;
END;
$function$;

-- Enhanced market price upsert function with bid/ask precision
CREATE OR REPLACE FUNCTION public.upsert_market_price_enhanced(
  p_symbol text, 
  p_bid numeric, 
  p_ask numeric, 
  p_mid numeric, 
  p_timestamp timestamp with time zone DEFAULT now()
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.market_prices (symbol, bid, ask, mid, timestamp, source)
    VALUES (p_symbol, p_bid, p_ask, p_mid, p_timestamp, 'tradermade')
    ON CONFLICT (symbol) 
    DO UPDATE SET 
        bid = EXCLUDED.bid,
        ask = EXCLUDED.ask,
        mid = EXCLUDED.mid,
        timestamp = EXCLUDED.timestamp,
        source = EXCLUDED.source,
        updated_at = now();
END;
$function$;

-- Run the reconciliation function once
SELECT reconcile_signal_consistency();
