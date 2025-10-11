-- Fix RPC authorization to use has_role() instead of profiles.access_level
CREATE OR REPLACE FUNCTION update_trade_alert_safe(
  p_id UUID,
  p_status trade_alert_status DEFAULT NULL,
  p_tp_hits INTEGER[] DEFAULT NULL,
  p_close_reason close_reason DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_is_xeon_stream BOOLEAN DEFAULT NULL
)
RETURNS SETOF trade_alerts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_id UUID;
  v_is_owner BOOLEAN;
  v_is_admin BOOLEAN;
BEGIN
  -- Get current user ID
  v_current_user_id := auth.uid();
  
  -- Check if user owns this signal
  SELECT EXISTS (
    SELECT 1 FROM trade_alerts
    WHERE id = p_id AND user_id = v_current_user_id
  ) INTO v_is_owner;
  
  -- Check if user is admin using has_role function (correct approach)
  v_is_admin := public.has_role(v_current_user_id, 'admin'::app_role);
  
  -- Raise informative error if unauthorized
  IF NOT (v_is_owner OR v_is_admin) THEN
    RAISE EXCEPTION 'Unauthorized: You can only update your own signals. User: %, Signal: %, Owner: %, Admin: %', 
      v_current_user_id, p_id, v_is_owner, v_is_admin;
  END IF;

  -- Perform the update with proper NULL handling
  RETURN QUERY
  UPDATE trade_alerts
  SET 
    status = COALESCE(p_status, status),
    tp_hits = COALESCE(p_tp_hits, tp_hits),
    close_reason = COALESCE(p_close_reason, close_reason),
    notes = COALESCE(p_notes, notes),
    is_xeon_stream = COALESCE(p_is_xeon_stream, is_xeon_stream),
    updated_at = NOW()
  WHERE id = p_id
  RETURNING *;
  
  -- Ensure we actually updated something
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Signal not found: %', p_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION update_trade_alert_safe IS 
'Safely updates trade_alerts using has_role() for admin checks and proper error messages.';