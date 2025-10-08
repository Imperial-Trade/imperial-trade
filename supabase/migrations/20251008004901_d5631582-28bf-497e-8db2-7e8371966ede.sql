-- ============================================
-- FIX: Atomic Authorization in RPC
-- Prevents race conditions by including authorization check in UPDATE WHERE clause
-- ============================================
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
  v_is_admin BOOLEAN;
  v_updated_count INTEGER;
BEGIN
  -- Get current user ID and validate it's not NULL
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated - auth.uid() is NULL';
  END IF;
  
  -- Check if user is admin using has_role function
  v_is_admin := public.has_role(v_current_user_id, 'admin'::app_role);
  
  -- ============================================
  -- ATOMIC UPDATE: Authorization check is in WHERE clause
  -- This prevents race conditions where authorization passes
  -- but the UPDATE fails due to record changes between checks
  -- ============================================
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
    AND (user_id = v_current_user_id OR v_is_admin = true)  -- ATOMIC AUTHORIZATION
  RETURNING *;
  
  -- Validate that the update actually happened
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  IF v_updated_count = 0 THEN
    -- Distinguish between "not found" and "unauthorized"
    IF NOT EXISTS (SELECT 1 FROM trade_alerts WHERE id = p_id) THEN
      RAISE EXCEPTION 'Signal not found: %', p_id;
    ELSE
      RAISE EXCEPTION 'Unauthorized: You can only update your own signals. User: %, Signal: %, Admin: %', 
        v_current_user_id, p_id, v_is_admin;
    END IF;
  END IF;
END;
$$;

COMMENT ON FUNCTION update_trade_alert_safe IS 
'Safely updates trade_alerts with ATOMIC authorization check in WHERE clause to prevent race conditions.';