-- Create secure RPC function for trade_alerts updates to prevent boolean type errors
CREATE OR REPLACE FUNCTION update_trade_alert_safe(
  p_id UUID,
  p_status trade_alert_status DEFAULT NULL,
  p_tp_hits INTEGER[] DEFAULT NULL,
  p_close_reason close_reason DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
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

  -- Perform the update with ONLY the fields we explicitly pass
  -- is_xeon_stream is NEVER included, preventing empty string errors
  RETURN QUERY
  UPDATE trade_alerts
  SET 
    status = COALESCE(p_status, status),
    tp_hits = COALESCE(p_tp_hits, tp_hits),
    close_reason = COALESCE(p_close_reason, close_reason),
    notes = COALESCE(p_notes, notes),
    updated_at = NOW()
  WHERE id = p_id
  RETURNING *;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_trade_alert_safe TO authenticated;

COMMENT ON FUNCTION update_trade_alert_safe IS 
'Safely updates trade_alerts without is_xeon_stream field to prevent "invalid input syntax for type boolean" errors';