-- Create optimized cleanup function for cron job logs with 7-day retention
CREATE OR REPLACE FUNCTION public.cleanup_old_cron_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete logs older than 7 days instead of 30 days
  DELETE FROM cron_job_logs 
  WHERE execution_time < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup operation
  INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status)
  VALUES ('cleanup_old_cron_logs', NOW(), deleted_count, 'success');
  
  RETURN deleted_count;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES ('cleanup_old_cron_logs', NOW(), 0, 'error', SQLERRM);
  
  RAISE;
END;
$$;

-- Create optimized rate limits cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits_optimized()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remove records older than 12 hours for email limits (reduced from 24 hours)
  DELETE FROM public.rate_limits 
  WHERE limit_type = 'email' 
    AND window_start < now() - interval '12 hours';
  
  -- Remove records older than 30 minutes for IP limits (reduced from 1 hour)
  DELETE FROM public.rate_limits 
  WHERE limit_type = 'ip' 
    AND window_start < now() - interval '30 minutes';
END;
$$;

-- Create function to disable economic events processing
CREATE OR REPLACE FUNCTION public.disable_economic_events_processing()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark all existing economic events as disabled
  UPDATE economic_events 
  SET description = COALESCE(description, '') || ' [DISABLED TO REDUCE COSTS]'
  WHERE description NOT LIKE '%DISABLED TO REDUCE COSTS%';
  
  -- Log the action
  INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES ('disable_economic_events', NOW(), 0, 'success', 'Economic events disabled for cost optimization');
END;
$$;

-- Execute the economic events disabling
SELECT disable_economic_events_processing();