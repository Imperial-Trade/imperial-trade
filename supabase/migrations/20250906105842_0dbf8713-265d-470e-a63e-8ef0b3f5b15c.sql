-- Continue fixing critical function search_path security issues
CREATE OR REPLACE FUNCTION public.expire_limit_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  expired_count INTEGER := 0;
BEGIN
  -- Update expired day orders to closed status
  UPDATE public.trade_alerts 
  SET 
    status = 'closed',
    close_reason = 'expired',
    updated_at = now()
  WHERE 
    status = 'pending' 
    AND expiry_type = 'DAY' 
    AND expires_at < now()
    AND trade_type IN ('buy_limit', 'sell_limit');
    
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  -- Log the expiration activity
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status)
  VALUES ('expire_limit_orders', NOW(), expired_count, 'success');
  
  RETURN expired_count;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES ('expire_limit_orders', NOW(), 0, 'error', SQLERRM);
  
  RAISE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_expired_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  updated_count INTEGER := 0;
  error_msg TEXT;
BEGIN
  -- Update sessions where the session date has passed and status is not completed
  UPDATE public.live_sessions 
  SET 
    status = 'completed'::session_status,
    updated_at = NOW()
  WHERE 
    session_date::date < CURRENT_DATE 
    AND status IN ('scheduled'::session_status, 'live'::session_status);
    
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Log successful execution
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status)
  VALUES ('update_expired_sessions', NOW(), updated_count, 'success');
  
  RETURN updated_count;
  
EXCEPTION WHEN OTHERS THEN
  -- Log any errors that occur
  GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
  
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES ('update_expired_sessions', NOW(), 0, 'error', error_msg);
  
  -- Re-raise the exception
  RAISE;
END;
$function$;

-- Phase 2: Market Data Freshness - Create function to cleanup stale market prices
CREATE OR REPLACE FUNCTION public.cleanup_stale_market_prices()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete market prices older than 1 hour (extremely stale data)
  DELETE FROM public.market_prices 
  WHERE updated_at < NOW() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log cleanup activity if significant
  IF deleted_count > 0 THEN
    INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status)
    VALUES ('cleanup_stale_market_prices', NOW(), deleted_count, 'success');
  END IF;
  
  RETURN deleted_count;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES ('cleanup_stale_market_prices', NOW(), 0, 'error', SQLERRM);
  
  RAISE;
END;
$function$;

-- Add data freshness monitoring function
CREATE OR REPLACE FUNCTION public.get_market_data_freshness()
RETURNS TABLE(
  symbol text,
  hours_old numeric,
  is_stale boolean,
  last_update timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    mp.symbol,
    EXTRACT(EPOCH FROM (NOW() - mp.updated_at)) / 3600 as hours_old,
    (mp.updated_at < NOW() - INTERVAL '1 hour') as is_stale,
    mp.updated_at as last_update
  FROM public.market_prices mp
  ORDER BY mp.updated_at DESC;
END;
$function$;