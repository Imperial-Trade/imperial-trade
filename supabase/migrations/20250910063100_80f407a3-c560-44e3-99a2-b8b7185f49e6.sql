-- Update the observation function name to match the corrected plan
DROP FUNCTION IF EXISTS public.observe_deprecated_notifier_usage();

CREATE OR REPLACE FUNCTION public.observe_deprecated_function_usage()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deprecated_triggers_count INTEGER := 0;
  deprecated_functions_count INTEGER := 0;
BEGIN
  -- Check for deprecated trigger references
  SELECT COUNT(*) INTO deprecated_triggers_count
  FROM information_schema.triggers 
  WHERE trigger_name LIKE '%notify_trade_alert_changes%' 
     OR trigger_name LIKE '%process_price_alerts%';
  
  -- Check for deprecated function references in pg_proc
  SELECT COUNT(*) INTO deprecated_functions_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' 
    AND p.proname IN ('notify_trade_alert_changes', 'process_price_alerts');
  
  -- Log the observation
  INSERT INTO public.cron_job_logs (
    job_name, 
    execution_time, 
    records_affected, 
    status, 
    error_message
  ) VALUES (
    'observe_deprecated_function_usage', 
    NOW(), 
    deprecated_triggers_count + deprecated_functions_count, 
    'success',
    format('Daily observation: %s deprecated triggers, %s deprecated functions still present', 
           deprecated_triggers_count, deprecated_functions_count)
  );
  
  -- Log details if any deprecated items found
  IF deprecated_triggers_count > 0 OR deprecated_functions_count > 0 THEN
    INSERT INTO public.cron_job_logs (
      job_name, 
      execution_time, 
      records_affected, 
      status, 
      error_message
    ) VALUES (
      'observe_deprecated_function_usage', 
      NOW(), 
      0, 
      'warning',
      'DEPRECATED ITEMS DETECTED - Manual cleanup may be required'
    );
  END IF;
END;
$function$;