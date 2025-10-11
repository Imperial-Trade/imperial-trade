-- Drop existing function first (with exact signature)
DROP FUNCTION IF EXISTS update_trade_alert_safe(UUID, trade_alert_status, INTEGER[], close_reason, TEXT);

-- Recreate with is_xeon_stream parameter
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
BEGIN
  -- Security: Only allow updates by signal owner or admin
  IF NOT EXISTS (
    SELECT 1 FROM trade_alerts
    WHERE id = p_id 
    AND (user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND access_level = 'admin'
    ))
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You can only update your own signals';
  END IF;

  -- Perform the update with proper NULL handling
  RETURN QUERY
  UPDATE trade_alerts
  SET 
    status = CASE WHEN p_status IS NOT NULL THEN p_status ELSE status END,
    tp_hits = CASE WHEN p_tp_hits IS NOT NULL THEN p_tp_hits ELSE tp_hits END,
    close_reason = CASE WHEN p_close_reason IS NOT NULL THEN p_close_reason ELSE close_reason END,
    notes = CASE WHEN p_notes IS NOT NULL THEN p_notes ELSE notes END,
    is_xeon_stream = CASE WHEN p_is_xeon_stream IS NOT NULL THEN p_is_xeon_stream ELSE is_xeon_stream END,
    updated_at = NOW()
  WHERE id = p_id
  RETURNING *;
END;
$$;

COMMENT ON FUNCTION update_trade_alert_safe IS 
'Safely updates trade_alerts with proper NULL handling including is_xeon_stream boolean field.';