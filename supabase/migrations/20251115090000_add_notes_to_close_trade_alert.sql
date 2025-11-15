-- Migration to add notes parameter to close_trade_alert RPC
-- This allows users to provide a closing reason when manually closing signals

CREATE OR REPLACE FUNCTION public.close_trade_alert(
  p_alert_id uuid,
  p_user_id uuid,
  p_close_reason text DEFAULT 'manual',
  p_notes text DEFAULT NULL  -- ✅ NEW: Accept closing reason as notes
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  -- ✅ Handle pending limit orders
  -- If it's a pending limit order, set activated_at to satisfy constraint
  IF alert_record.status = 'pending' 
     AND alert_record.trade_type IN ('buy_limit', 'sell_limit') 
     AND alert_record.activated_at IS NULL 
  THEN
    UPDATE public.trade_alerts 
    SET 
      status = 'closed',
      close_reason = p_close_reason::close_reason,
      notes = COALESCE(p_notes, notes),  -- ✅ Update notes if provided, otherwise keep existing
      activated_at = NOW(),
      updated_at = NOW()
    WHERE id = p_alert_id;
  ELSE
    -- Regular close for non-pending or already activated orders
    UPDATE public.trade_alerts 
    SET 
      status = 'closed',
      close_reason = p_close_reason::close_reason,
      notes = COALESCE(p_notes, notes),  -- ✅ Update notes if provided, otherwise keep existing
      updated_at = NOW()
    WHERE id = p_alert_id;
  END IF;
  
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
    format('Signal %s closed by user %s - Reason: %s (Was Pending: %s) - Notes: %s', 
           p_alert_id, p_user_id, p_close_reason, 
           alert_record.status = 'pending',
           COALESCE(p_notes, 'none'))
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'alert_id', p_alert_id,
    'new_status', 'closed',
    'close_reason', p_close_reason,
    'was_pending', alert_record.status = 'pending',
    'notes_updated', p_notes IS NOT NULL
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Enhanced error logging
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES (
    'close_trade_alert_rpc', 
    NOW(), 
    0, 
    'error',
    format('Error closing signal %s by user %s: %s (SQLSTATE: %s)', 
           p_alert_id, p_user_id, SQLERRM, SQLSTATE)
  );
  
  RETURN jsonb_build_object(
    'success', false,
    'error', format('Internal error: %s', SQLERRM),
    'sqlstate', SQLSTATE
  );
END;
$function$;

COMMENT ON FUNCTION public.close_trade_alert IS 'Closes a trade alert/signal with optional closing reason notes. For pending limit orders, sets activated_at to satisfy constraint.';

