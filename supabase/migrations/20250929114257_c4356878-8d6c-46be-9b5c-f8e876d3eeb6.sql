-- Create RPC function to close trade alerts with proper ownership validation
CREATE OR REPLACE FUNCTION public.close_trade_alert(p_alert_id uuid, p_user_id uuid, p_close_reason text DEFAULT 'manual')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alert_record RECORD;
  is_admin boolean := false;
  affected_rows integer;
BEGIN
  -- Get the alert and check if it exists
  SELECT * INTO alert_record
  FROM public.trade_alerts
  WHERE id = p_alert_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Signal not found'
    );
  END IF;
  
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = p_user_id 
    AND (access_level = 'admin' OR role = 'admin')
  ) INTO is_admin;
  
  -- Check ownership: user must be the creator or an admin
  IF alert_record.user_id != p_user_id AND NOT is_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You can only close your own signals'
    );
  END IF;
  
  -- Check if alert is already closed
  IF alert_record.status = 'closed' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Signal is already closed'
    );
  END IF;
  
  -- Update the alert to closed status
  UPDATE public.trade_alerts 
  SET 
    status = 'closed',
    close_reason = p_close_reason,
    updated_at = now()
  WHERE id = p_alert_id;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  IF affected_rows = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to close signal'
    );
  END IF;
  
  -- Log the closure for audit trail
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES (
    'close_trade_alert_rpc', 
    NOW(), 
    1, 
    'success',
    format('Signal %s closed by user %s - Reason: %s', p_alert_id, p_user_id, p_close_reason)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'alert_id', p_alert_id,
    'new_status', 'closed',
    'close_reason', p_close_reason
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Log any errors
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES (
    'close_trade_alert_rpc', 
    NOW(), 
    0, 
    'error',
    format('Error closing signal %s by user %s: %s', p_alert_id, p_user_id, SQLERRM)
  );
  
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Internal error occurred while closing signal'
  );
END;
$$;